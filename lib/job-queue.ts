import { ObjectId } from 'mongodb';
import { connectToDatabase } from './database';
import { Logger } from './logger';

export interface Job {
  _id?: ObjectId | string;
  id: string;
  type: 'outline_generation' | 'chapter_generation';
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  projectId: string;
  data: {
    premise?: string;
    genre?: string;
    subgenre?: string;
    numberOfChapters?: number;
    chapterNumber?: number;
    outline?: string[];
    previousChapters?: string[];
    targetWordCount?: number;
  };
  result?: {
    outline?: string[];
    chapter?: {
      content: string;
      wordCount: number;
    };
  };
  error?: string;
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export class JobQueue {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  private async getCollection() {
    const db = await connectToDatabase();
    return db.collection<Job>('jobs');
  }

  // Create a new job
  async createJob(
    type: Job['type'],
    projectId: string,
    data: Job['data'],
    maxRetries = 3
  ): Promise<Job> {
    try {
      const job: Job = {
        id: this.generateJobId(),
        type,
        status: 'queued',
        projectId,
        data,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries,
      };

      const collection = await this.getCollection();
      const result = await collection.insertOne(job);
      
      const createdJob = { ...job, _id: result.insertedId.toString() };
      
      this.logger.info(`Job created: ${job.id}`, { type, projectId });
      return createdJob;
    } catch (error) {
      this.logger.error('Failed to create job', error as Error);
      throw error;
    }
  }

  // Get job by ID
  async getJob(jobId: string): Promise<Job | null> {
    try {
      const collection = await this.getCollection();
      const job = await collection.findOne({ id: jobId });
      
      if (job) {
        return { ...job, _id: job._id?.toString() };
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to get job: ${jobId}`, error as Error);
      throw error;
    }
  }

  // Get next queued job for processing
  async getNextJob(): Promise<Job | null> {
    try {
      const collection = await this.getCollection();
      const job = await collection.findOneAndUpdate(
        { 
          status: 'queued',
          $expr: { $lt: ['$retryCount', '$maxRetries'] }
        },
        { 
          $set: { 
            status: 'in_progress',
            startedAt: new Date(),
            updatedAt: new Date()
          }
        },
        { 
          sort: { createdAt: 1 }, // FIFO processing
          returnDocument: 'after'
        }
      );

      if (job) {
        this.logger.info(`Job started: ${job.id}`);
        return { ...job, _id: job._id?.toString() };
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get next job', error as Error);
      throw error;
    }
  }

  // Update job progress
  async updateJobProgress(jobId: string, progress: number, data?: Partial<Job['data']>): Promise<void> {
    try {
      const collection = await this.getCollection();
      const updateData: Partial<Job> = {
        progress,
        updatedAt: new Date()
      };

      if (data) {
        updateData.data = data;
      }

      await collection.updateOne(
        { id: jobId },
        { $set: updateData }
      );

      this.logger.debug(`Job progress updated: ${jobId}`, { progress });
    } catch (error) {
      this.logger.error(`Failed to update job progress: ${jobId}`, error as Error);
      throw error;
    }
  }

  // Complete job with result
  async completeJob(jobId: string, result: Job['result']): Promise<void> {
    try {
      const collection = await this.getCollection();
      await collection.updateOne(
        { id: jobId },
        {
          $set: {
            status: 'completed',
            result,
            progress: 100,
            completedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      this.logger.info(`Job completed: ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to complete job: ${jobId}`, error as Error);
      throw error;
    }
  }

  // Fail job with error
  async failJob(jobId: string, error: string, shouldRetry = true): Promise<void> {
    try {
      const collection = await this.getCollection();
      const job = await this.getJob(jobId);
      
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      const canRetry = shouldRetry && job.retryCount < job.maxRetries;
      
      await collection.updateOne(
        { id: jobId },
        {
          $set: {
            status: canRetry ? 'queued' : 'failed',
            error,
            updatedAt: new Date(),
            retryCount: job.retryCount + 1
          }
        }
      );

      const action = canRetry ? 'queued for retry' : 'failed permanently';
      this.logger.info(`Job ${action}: ${jobId}`, { error, retryCount: job.retryCount + 1 });
    } catch (error) {
      this.logger.error(`Failed to fail job: ${jobId}`, error as Error);
      throw error;
    }
  }

  // Get jobs for a project
  async getProjectJobs(projectId: string, limit = 10): Promise<Job[]> {
    try {
      const collection = await this.getCollection();
      const jobs = await collection
        .find({ projectId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return jobs.map(job => ({ ...job, _id: job._id?.toString() }));
    } catch (error) {
      this.logger.error(`Failed to get project jobs: ${projectId}`, error as Error);
      throw error;
    }
  }

  // Clean up old completed jobs (housekeeping)
  async cleanupOldJobs(olderThanDays = 7): Promise<number> {
    try {
      const collection = await this.getCollection();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await collection.deleteMany({
        status: { $in: ['completed', 'failed'] },
        updatedAt: { $lt: cutoffDate }
      });

      this.logger.info(`Cleaned up ${result.deletedCount} old jobs`);
      return result.deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup old jobs', error as Error);
      throw error;
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createJobQueue(logger: Logger): JobQueue {
  return new JobQueue(logger);
}
