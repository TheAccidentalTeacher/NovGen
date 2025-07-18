import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { Novel, Chapter, Job } from '../models/index';
import { genreInstructions } from '../../shared/genreInstructions';

// Railway-compatible logger (console only)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()]
});

interface GenerationParams {
  title: string;
  genre: string;
  subgenre: string;
  synopsis: string;
  wordCount: number;
  chapters: number;
  targetChapterLength: number;
  wordCountVariance: number;
  fictionLength: string;
}

interface ChapterOutline {
  title: string;
  summary: string;
}

class NovelGenerationService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 120000,
      maxRetries: 3
    });

    logger.info('NovelGenerationService initialized');
  }

  /**
   * Start a new novel generation job
   * Returns job ID for tracking progress
   */
  async startGeneration(params: GenerationParams): Promise<string> {
    const jobId = uuidv4();
    const novelId = uuidv4();

    try {
      // Validate parameters
      this.validateParams(params);

      // Create novel record
      const novel = await Novel.create({
        _id: novelId,
        title: params.title,
        genre: params.genre,
        subgenre: params.subgenre,
        synopsis: params.synopsis,
        wordCount: params.wordCount,
        chapters: params.chapters,
        targetChapterLength: params.targetChapterLength,
        wordCountVariance: params.wordCountVariance,
        fictionLength: params.fictionLength,
        status: 'generating',
        createdAt: new Date()
      });

      // Create job record with initial status
      const job = await Job.create({
        _id: jobId,
        novelId,
        status: 'pending',
        parameters: params,
        currentChapter: 0,
        totalChapters: params.chapters,
        progress: 0,
        startTime: new Date(),
        lastActivity: new Date()
      });

      logger.info(`Started generation job ${jobId} for novel ${novelId}`);

      // Process first step immediately (don't wait)
      setImmediate(() => this.processNextStep(jobId));

      return jobId;

    } catch (error) {
      logger.error('Failed to start generation:', error);
      throw new Error('Failed to start novel generation');
    }
  }

  /**
   * Process the next step for a job
   * This is called repeatedly until job is complete
   */
  async processNextStep(jobId: string): Promise<void> {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        logger.error(`Job ${jobId} not found`);
        return;
      }

      // Update last activity
      job.lastActivity = new Date();
      await job.save();

      switch (job.status) {
        case 'pending':
          await this.generateOutline(jobId);
          break;
        case 'outline':
          await this.generateNextChapter(jobId);
          break;
        case 'generating':
          await this.generateNextChapter(jobId);
          break;
        default:
          logger.info(`Job ${jobId} is in terminal state: ${job.status}`);
          return;
      }

    } catch (error) {
      logger.error(`Error processing job ${jobId}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.markJobFailed(jobId, errorMessage);
    }
  }

  /**
   * Generate outline for the novel
   */
  private async generateOutline(jobId: string): Promise<void> {
    const job = await Job.findById(jobId);
    if (!job) throw new Error('Job not found');

    const novel = await Novel.findById(job.novelId);
    if (!novel) throw new Error('Novel not found');

    logger.info(`Generating outline for job ${jobId}`);

    // Update job status
    job.status = 'outline';
    job.progress = 5;
    await job.save();

    // Generate outline using OpenAI
    const genreInfo = genreInstructions[job.parameters.genre]?.[job.parameters.subgenre] || '';
    
    const prompt = `Create a detailed chapter outline for a ${job.parameters.fictionLength} ${job.parameters.genre} novel.

Title: ${job.parameters.title}
Genre: ${job.parameters.genre} - ${job.parameters.subgenre}
Synopsis: ${job.parameters.synopsis}
Target Length: ${job.parameters.wordCount} words
Number of Chapters: ${job.parameters.chapters}

Genre Guidelines:
${genreInfo}

Create exactly ${job.parameters.chapters} chapter outlines. Each should have:
- A compelling chapter title
- A 2-3 sentence summary of what happens

Format as JSON array:
[{"title": "Chapter Title", "summary": "What happens in this chapter..."}]`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 4000
    });

    const outlineText = response.choices[0]?.message?.content;
    if (!outlineText) throw new Error('Failed to generate outline');

    let outline: ChapterOutline[];
    try {
      outline = JSON.parse(outlineText);
    } catch {
      throw new Error('Invalid outline format received');
    }

    // Save outline to novel
    novel.outline = outline;
    await novel.save();

    // Update job to start generating chapters
    job.status = 'generating';
    job.progress = 10;
    job.currentChapter = 0;
    await job.save();

    logger.info(`Generated outline with ${outline.length} chapters for job ${jobId}`);

    // Schedule next step
    setImmediate(() => this.processNextStep(jobId));
  }

  /**
   * Generate the next chapter
   */
  private async generateNextChapter(jobId: string): Promise<void> {
    const job = await Job.findById(jobId);
    if (!job) throw new Error('Job not found');

    const novel = await Novel.findById(job.novelId);
    if (!novel) throw new Error('Novel not found');

    const nextChapterNum = job.currentChapter + 1;
    
    if (nextChapterNum > job.totalChapters) {
      // All chapters complete
      await this.completeGeneration(jobId);
      return;
    }

    logger.info(`Generating chapter ${nextChapterNum} for job ${jobId}`);

    // Get chapter outline
    const chapterOutline = novel.outline?.[nextChapterNum - 1];
    if (!chapterOutline) throw new Error('Chapter outline not found');

    // Get previous chapters for context
    const previousChapters = await Chapter.find({ 
      novelId: job.novelId 
    }).sort({ chapterNumber: 1 }).limit(3);

    // Build context from previous chapters
    const context = previousChapters.length > 0 
      ? `Previous chapters context:\n${previousChapters.map(ch => 
          `Chapter ${ch.chapterNumber}: ${ch.summary || ch.content.substring(0, 200)}...`
        ).join('\n')}`
      : '';

    // Calculate target word count for this chapter
    const baseLength = Math.floor(job.parameters.targetChapterLength);
    const variance = job.parameters.wordCountVariance / 100;
    const minLength = Math.floor(baseLength * (1 - variance));
    const maxLength = Math.floor(baseLength * (1 + variance));

    // Generate chapter content
    const genreInfo = genreInstructions[job.parameters.genre]?.[job.parameters.subgenre] || '';
    
    const prompt = `Write Chapter ${nextChapterNum} of "${job.parameters.title}".

${context}

Chapter Outline:
Title: ${chapterOutline.title}
Summary: ${chapterOutline.summary}

Requirements:
- Length: ${minLength}-${maxLength} words
- Genre: ${job.parameters.genre} - ${job.parameters.subgenre}
- Follow the chapter outline but expand with rich detail, dialogue, and scene development
- Maintain consistency with previous chapters
- Use engaging, immersive prose appropriate for the genre

Genre Guidelines:
${genreInfo}

Write the complete chapter content:`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 4000
    });

    const chapterContent = response.choices[0]?.message?.content;
    if (!chapterContent) throw new Error('Failed to generate chapter content');

    const wordCount = chapterContent.split(/\s+/).length;

    // Save chapter
    await Chapter.create({
      novelId: job.novelId,
      chapterNumber: nextChapterNum,
      title: chapterOutline.title,
      content: chapterContent,
      wordCount,
      summary: chapterOutline.summary,
      createdAt: new Date()
    });

    // Update job progress
    const progress = 10 + ((nextChapterNum / job.totalChapters) * 85);
    job.currentChapter = nextChapterNum;
    job.progress = Math.round(progress);
    await job.save();

    logger.info(`Completed chapter ${nextChapterNum} (${wordCount} words) for job ${jobId}`);

    // Schedule next chapter generation
    setImmediate(() => this.processNextStep(jobId));
  }

  /**
   * Complete the generation process
   */
  private async completeGeneration(jobId: string): Promise<void> {
    const job = await Job.findById(jobId);
    if (!job) throw new Error('Job not found');

    const novel = await Novel.findById(job.novelId);
    if (!novel) throw new Error('Novel not found');

    // Update records
    job.status = 'completed';
    job.progress = 100;
    await job.save();

    novel.status = 'completed';
    novel.completedAt = new Date();
    await novel.save();

    logger.info(`Completed generation for job ${jobId}`);
  }

  /**
   * Mark job as failed
   */
  private async markJobFailed(jobId: string, error: string): Promise<void> {
    try {
      const job = await Job.findById(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error;
        await job.save();
      }

      const novel = await Novel.findById(job?.novelId);
      if (novel) {
        novel.status = 'failed';
        await novel.save();
      }

      logger.error(`Job ${jobId} failed: ${error}`);
    } catch (err) {
      logger.error(`Failed to mark job ${jobId} as failed:`, err);
    }
  }

  /**
   * Get job status and progress
   */
  async getJobStatus(jobId: string) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error('Job not found');

    const novel = await Novel.findById(job.novelId);
    
    return {
      jobId,
      novelId: job.novelId,
      status: job.status,
      progress: job.progress,
      currentChapter: job.currentChapter,
      totalChapters: job.totalChapters,
      startTime: job.startTime,
      lastActivity: job.lastActivity,
      error: job.error,
      novel: novel ? {
        title: novel.title,
        genre: novel.genre,
        subgenre: novel.subgenre,
        status: novel.status
      } : null
    };
  }

  /**
   * Resume incomplete jobs (called on server startup)
   */
  async resumeIncompleteJobs(): Promise<void> {
    try {
      const incompleteJobs = await Job.find({
        status: { $in: ['pending', 'outline', 'generating'] },
        lastActivity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });

      logger.info(`Found ${incompleteJobs.length} incomplete jobs to resume`);

      for (const job of incompleteJobs) {
        logger.info(`Resuming job ${job._id}`);
        setImmediate(() => this.processNextStep(job._id));
      }
    } catch (error) {
      logger.error('Failed to resume incomplete jobs:', error);
    }
  }

  /**
   * Create a progress stream for real-time updates
   */
  createProgressStream(jobId: string) {
    // For now, return a simple implementation that polls the database
    // In a production environment, you might want to use Redis streams or WebSockets
    const EventEmitter = require('events');
    const emitter = new EventEmitter();
    
    // Poll for updates every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const status = await this.getJobStatus(jobId);
        emitter.emit('data', {
          type: 'progress',
          data: status,
          timestamp: new Date()
        });
        
        // Stop polling if job is complete or failed
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval);
          emitter.emit('end');
        }
      } catch (error) {
        logger.error(`Error polling job ${jobId}:`, error);
        clearInterval(pollInterval);
        emitter.emit('error', error);
      }
    }, 2000);
    
    // Clean up after 30 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      emitter.emit('end');
    }, 30 * 60 * 1000);
    
    return emitter;
  }

  /**
   * Validate generation parameters
   */
  private validateParams(params: GenerationParams): void {
    if (!params.title?.trim()) throw new Error('Title is required');
    if (!params.synopsis?.trim()) throw new Error('Synopsis is required');
    if (params.chapters < 1 || params.chapters > 100) throw new Error('Chapters must be between 1 and 100');
    if (params.wordCount < 1000 || params.wordCount > 200000) throw new Error('Word count must be between 1,000 and 200,000');
  }
}

export default NovelGenerationService;
