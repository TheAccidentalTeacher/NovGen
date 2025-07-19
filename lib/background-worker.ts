import { JobQueue, Job } from './job-queue';
import { OpenAIService } from './openai-service';
import { Logger } from './logger';

export class BackgroundWorker {
  private jobQueue: JobQueue;
  private openaiService: OpenAIService;
  private logger: Logger;
  private isRunning = false;
  private processingInterval?: NodeJS.Timeout;
  private readonly POLL_INTERVAL = 5000; // 5 seconds

  constructor(jobQueue: JobQueue, openaiService: OpenAIService, logger: Logger) {
    this.jobQueue = jobQueue;
    this.openaiService = openaiService;
    this.logger = logger;
  }

  // Start the background worker
  start(): void {
    if (this.isRunning) {
      this.logger.info('Background worker is already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting background worker');
    
    this.processingInterval = setInterval(async () => {
      try {
        await this.processNextJob();
      } catch (error) {
        this.logger.error('Error in background worker processing cycle', error as Error);
      }
    }, this.POLL_INTERVAL);
  }

  // Stop the background worker
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.logger.info('Stopping background worker');
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }

  // Process a single job from the queue
  private async processNextJob(): Promise<void> {
    const job = await this.jobQueue.getNextJob();
    
    if (!job) {
      return; // No jobs to process
    }

    this.logger.info(`Processing job: ${job.id}`, { type: job.type, projectId: job.projectId });

    try {
      switch (job.type) {
        case 'outline_generation':
          await this.processOutlineGeneration(job);
          break;
        case 'chapter_generation':
          await this.processChapterGeneration(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Job processing failed: ${job.id}`, error as Error);
      await this.jobQueue.failJob(job.id, errorMessage);
    }
  }

  // Process outline generation job
  private async processOutlineGeneration(job: Job): Promise<void> {
    const { premise, genre, subgenre, numberOfChapters } = job.data;

    if (!premise || !genre || !subgenre || !numberOfChapters) {
      throw new Error('Missing required data for outline generation');
    }

    // Update progress to indicate we're starting
    await this.jobQueue.updateJobProgress(job.id, 10);

    try {
      // Generate the outline (simplified single call)
      const outline = await this.openaiService.generateOutline(
        premise,
        genre,
        subgenre,
        numberOfChapters
      );

      // Complete the job with the result
      await this.jobQueue.completeJob(job.id, { outline });
      
      this.logger.info(`Outline generation completed: ${job.id}`, {
        chapterCount: outline.length,
        projectId: job.projectId
      });
    } catch (error) {
      throw new Error(`Outline generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Process chapter generation job
  private async processChapterGeneration(job: Job): Promise<void> {
    const {
      chapterNumber,
      premise,
      outline,
      previousChapters,
      targetWordCount,
      genre,
      subgenre
    } = job.data;

    if (
      !chapterNumber ||
      !premise ||
      !outline ||
      !targetWordCount ||
      !genre ||
      !subgenre ||
      previousChapters === undefined
    ) {
      throw new Error('Missing required data for chapter generation');
    }

    // Update progress to indicate we're starting
    await this.jobQueue.updateJobProgress(job.id, 10);

    try {
      // Generate the chapter
      const result = await this.openaiService.generateChapter(
        chapterNumber,
        premise,
        outline,
        previousChapters,
        targetWordCount,
        genre,
        subgenre
      );

      // Complete the job with the result
      await this.jobQueue.completeJob(job.id, { chapter: result });
      
      this.logger.info(`Chapter generation completed: ${job.id}`, {
        chapterNumber,
        wordCount: result.wordCount,
        projectId: job.projectId
      });
    } catch (error) {
      throw new Error(`Chapter generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Get worker status
  getStatus(): { isRunning: boolean; pollInterval: number } {
    return {
      isRunning: this.isRunning,
      pollInterval: this.POLL_INTERVAL
    };
  }
}

export function createBackgroundWorker(
  jobQueue: JobQueue,
  openaiService: OpenAIService,
  logger: Logger
): BackgroundWorker {
  return new BackgroundWorker(jobQueue, openaiService, logger);
}
