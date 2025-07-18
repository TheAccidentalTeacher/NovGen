import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { EventEmitter } from 'events';
import { Novel, Chapter, Job } from '../models/index';
import { genreInstructions } from '../../shared/genreInstructions';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

interface GenerationJob {
  id: string;
  novelId: string;
  status: 'pending' | 'outline' | 'generating' | 'completed' | 'failed';
  currentChapter: number;
  totalChapters: number;
  progress: number;
  startTime: Date;
  lastActivity: Date;
  error?: string;
  stream?: NodeJS.EventEmitter;
}

interface GenerationParams {
  novelId: string;
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

class AdvancedAIService {
  private openai: OpenAI;
  private jobs: Map<string, GenerationJob>;
  private streams: Map<string, NodeJS.EventEmitter>;
  private cleanupInterval: NodeJS.Timeout;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_BASE = 1000;
  private readonly MAX_RETRY_DELAY = 30000;
  private readonly JOB_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 120000, // 2 minutes
      maxRetries: 3
    });

    this.jobs = new Map();
    this.streams = new Map();
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldJobs();
    }, this.CLEANUP_INTERVAL);

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());

    logger.info('AdvancedAIService initialized');
  }

  /**
   * Start novel generation process
   */
  async startGeneration(params: GenerationParams): Promise<string> {
    const jobId = uuidv4();
    const novelId = uuidv4();

    try {
      // Validate input parameters
      this.validateGenerationParams(params);

      // Create job record
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

      // Create in-memory job tracking
      const generationJob: GenerationJob = {
        id: jobId,
        novelId,
        status: 'pending',
        currentChapter: 0,
        totalChapters: params.chapters,
        progress: 0,
        startTime: new Date(),
        lastActivity: new Date()
      };

      this.jobs.set(jobId, generationJob);

      // Start generation process asynchronously
      this.processGeneration(jobId, params).catch(error => {
        logger.error(`Generation failed for job ${jobId}:`, error);
        this.handleJobError(jobId, error);
      });

      logger.info(`Started generation job ${jobId} for novel ${novelId}`);
      return jobId;

    } catch (error) {
      logger.error(`Failed to start generation:`, error);
      throw error;
    }
  }

  /**
   * Get job status and progress
   */
  async getJobStatus(jobId: string): Promise<any> {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const memoryJob = this.jobs.get(jobId);
    
    return {
      id: jobId,
      novelId: job.novelId,
      status: job.status,
      currentChapter: job.currentChapter,
      totalChapters: job.totalChapters,
      progress: job.progress,
      startTime: job.startTime,
      lastActivity: job.lastActivity,
      error: job.error,
      isActive: !!memoryJob
    };
  }

  /**
   * Create or get event stream for job progress
   */
  createProgressStream(jobId: string): NodeJS.EventEmitter {
    let stream = this.streams.get(jobId);
    
    if (!stream) {
      stream = new EventEmitter();
      this.streams.set(jobId, stream);

      // Auto-cleanup stream after 1 hour
      setTimeout(() => {
        this.streams.delete(jobId);
      }, 60 * 60 * 1000);
    }

    return stream!;
  }

  /**
   * Resume incomplete jobs on startup
   */
  async resumeIncompleteJobs(): Promise<void> {
    try {
      const incompleteJobs = await Job.find({
        status: { $in: ['pending', 'outline', 'generating'] }
      });

      for (const job of incompleteJobs) {
        const timeSinceStart = Date.now() - job.startTime.getTime();
        
        if (timeSinceStart > this.JOB_TIMEOUT) {
          // Mark as failed if too old
          await Job.findByIdAndUpdate(job._id, {
            status: 'failed',
            error: 'Job timeout - exceeded maximum duration'
          });
          logger.warn(`Marked job ${job._id} as failed due to timeout`);
        } else {
          // Resume generation
          logger.info(`Resuming job ${job._id}`);
          this.resumeJob(job);
        }
      }

    } catch (error) {
      logger.error('Failed to resume incomplete jobs:', error);
    }
  }

  /**
   * Main generation process
   */
  private async processGeneration(jobId: string, params: GenerationParams): Promise<void> {
    try {
      this.updateJobStatus(jobId, 'outline', 0);
      this.emitProgress(jobId, 'Starting outline generation...');

      // Generate outline
      const outline = await this.generateOutline(params);
      this.emitProgress(jobId, `Generated outline with ${outline.length} chapters`);

      this.updateJobStatus(jobId, 'generating', 5);

      // Generate chapters
      for (let i = 0; i < outline.length; i++) {
        const chapterNum = i + 1;
        this.emitProgress(jobId, `Starting chapter ${chapterNum} of ${outline.length}...`);

        // Get context from previous chapters
        const context = await this.buildChapterContext(params.novelId, i);
        
        // Generate chapter
        const chapter = await this.generateChapter(
          params,
          outline,
          i,
          context
        );

        // Validate and potentially retry
        await this.validateAndSaveChapter(params.novelId, chapterNum, chapter, params);

        // Update progress
        const progress = 5 + ((chapterNum / outline.length) * 90);
        this.updateJobStatus(jobId, 'generating', progress, chapterNum);
        this.emitProgress(jobId, `Completed chapter ${chapterNum} (${chapter.content.split(' ').length} words)`);

        // Optional garbage collection
        if (global.gc && chapterNum % 5 === 0) {
          global.gc();
        }
      }

      // Mark as completed
      await this.completeJob(jobId);
      this.emitProgress(jobId, 'Novel generation completed successfully!');

    } catch (error) {
      logger.error(`Generation process failed for job ${jobId}:`, error);
      await this.handleJobError(jobId, error as Error);
    }
  }

  /**
   * Generate chapter outline using AI
   */
  private async generateOutline(params: GenerationParams): Promise<ChapterOutline[]> {
    const genreGuide = genreInstructions[params.genre]?.[params.subgenre];
    if (!genreGuide) {
      throw new Error(`No genre instructions found for ${params.genre}/${params.subgenre}`);
    }

    const prompt = this.buildOutlinePrompt(params, genreGuide);
    
    const response = await this.callOpenAIWithRetry(async () => {
      return await this.openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a master storyteller and novel architect. You create detailed, compelling chapter outlines that serve as blueprints for full-length novels. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 4000
      });
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No outline content received from OpenAI');
    }

    try {
      const outline = JSON.parse(content);
      if (!Array.isArray(outline) || outline.length !== params.chapters) {
        throw new Error(`Expected ${params.chapters} chapters, got ${outline.length}`);
      }

      // Validate outline structure
      for (const [index, chapter] of outline.entries()) {
        if (!chapter.title || !chapter.summary) {
          throw new Error(`Chapter ${index + 1} missing title or summary`);
        }
      }

      return outline;

    } catch (parseError) {
      logger.error('Failed to parse outline JSON:', parseError);
      throw new Error('Invalid outline format received from AI');
    }
  }

  /**
   * Generate individual chapter
   */
  private async generateChapter(
    params: GenerationParams,
    outline: ChapterOutline[],
    chapterIndex: number,
    context: string
  ): Promise<{ content: string; wordCount: number }> {
    const chapterOutline = outline[chapterIndex];
    const genreGuide = genreInstructions[params.genre][params.subgenre];
    
    const prompt = this.buildChapterPrompt(
      params,
      outline,
      chapterIndex,
      chapterOutline,
      context,
      genreGuide
    );

    const response = await this.callOpenAIWithRetry(async () => {
      return await this.openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: [
          {
            role: 'system',
            content: `You are a master novelist writing in the ${params.genre} genre. Create compelling, well-paced prose that brings the story to life. Focus on character development, dialogue, and vivid descriptions.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9,
        max_tokens: 4000
      });
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No chapter content received from OpenAI');
    }

    const wordCount = content.split(/\s+/).length;
    
    return {
      content: content.trim(),
      wordCount
    };
  }

  /**
   * Build context from previous chapters
   */
  private async buildChapterContext(novelId: string, chapterIndex: number): Promise<string> {
    if (chapterIndex === 0) {
      return '';
    }

    const previousChapters = await Chapter.find({
      novelId,
      chapterNumber: { $lte: chapterIndex }
    }).sort({ chapterNumber: 1 });

    if (previousChapters.length === 0) {
      return '';
    }

    // For context management, summarize if too many chapters
    if (previousChapters.length > 3) {
      // Create summary of earlier chapters, full text of last 2-3
      const earlierChapters = previousChapters.slice(0, -2);
      const recentChapters = previousChapters.slice(-2);

      let context = '';
      
      if (earlierChapters.length > 0) {
        context += 'PREVIOUS CHAPTERS SUMMARY:\n';
        for (const chapter of earlierChapters) {
          context += `Chapter ${chapter.chapterNumber}: ${chapter.summary || 'No summary available'}\n`;
        }
        context += '\n';
      }

      context += 'RECENT CHAPTERS (FULL TEXT):\n';
      for (const chapter of recentChapters) {
        context += `Chapter ${chapter.chapterNumber}: ${chapter.title}\n`;
        context += chapter.content + '\n\n';
      }

      return context;
    } else {
      // Include full text of all chapters
      let context = 'PREVIOUS CHAPTERS:\n';
      for (const chapter of previousChapters) {
        context += `Chapter ${chapter.chapterNumber}: ${chapter.title}\n`;
        context += chapter.content + '\n\n';
      }
      return context;
    }
  }

  /**
   * Validate chapter and save to database
   */
  private async validateAndSaveChapter(
    novelId: string,
    chapterNumber: number,
    chapter: { content: string; wordCount: number },
    params: GenerationParams
  ): Promise<void> {
    const minWordCount = params.targetChapterLength * 0.75; // 75% minimum
    let finalChapter = chapter;

    // Retry if word count is too low
    if (chapter.wordCount < minWordCount) {
      logger.warn(`Chapter ${chapterNumber} too short (${chapter.wordCount} words), retrying...`);
      
      for (let retry = 0; retry < 2; retry++) {
        try {
          const expandPrompt = `The following chapter is too short at ${chapter.wordCount} words. Please expand it to approximately ${params.targetChapterLength} words while maintaining story quality and pacing. Add more dialogue, descriptions, character development, and scene details.

CURRENT CHAPTER:
${chapter.content}

Please rewrite this chapter to be approximately ${params.targetChapterLength} words:`;

          const response = await this.callOpenAIWithRetry(async () => {
            return await this.openai.chat.completions.create({
              model: 'gpt-4-1106-preview',
              messages: [
                {
                  role: 'system',
                  content: 'You are a master novelist. Expand the given chapter while maintaining quality and story flow.'
                },
                {
                  role: 'user',
                  content: expandPrompt
                }
              ],
              temperature: 0.8,
              max_tokens: 4000
            });
          });

          const expandedContent = response.choices[0]?.message?.content;
          if (expandedContent) {
            const expandedWordCount = expandedContent.split(/\s+/).length;
            if (expandedWordCount >= minWordCount) {
              finalChapter = {
                content: expandedContent.trim(),
                wordCount: expandedWordCount
              };
              logger.info(`Chapter ${chapterNumber} expanded to ${expandedWordCount} words`);
              break;
            }
          }
        } catch (retryError) {
          logger.error(`Retry ${retry + 1} failed for chapter ${chapterNumber}:`, retryError);
        }
      }
    }

    // Save chapter to database
    await Chapter.create({
      novelId,
      chapterNumber,
      title: `Chapter ${chapterNumber}`,
      content: finalChapter.content,
      wordCount: finalChapter.wordCount,
      createdAt: new Date()
    });

    logger.info(`Saved chapter ${chapterNumber} with ${finalChapter.wordCount} words`);
  }

  /**
   * Build outline generation prompt
   */
  private buildOutlinePrompt(params: GenerationParams, genreGuide: string): string {
    return `You are a master storyteller and novel architect. Create a detailed chapter-by-chapter outline for a ${params.fictionLength} length ${params.genre} novel.

STORY DETAILS:
- Title: ${params.title}
- Genre: ${params.genre} (${params.subgenre})
- Total Word Count: ${params.wordCount.toLocaleString()}
- Number of Chapters: ${params.chapters}
- Target Chapter Length: ${params.targetChapterLength} words each
- Synopsis: ${params.synopsis}

GENRE GUIDELINES:
${genreGuide}

REQUIREMENTS:
1. Create exactly ${params.chapters} chapter outlines
2. Each chapter outline should describe events and scenes substantial enough to fill ${params.targetChapterLength} words when written as full prose
3. Ensure proper story pacing and structure for ${params.fictionLength}
4. Include character development arcs
5. Build tension and conflicts appropriately
6. Follow genre conventions for ${params.genre}
7. Each chapter should have clear objectives and emotional beats

OUTPUT FORMAT:
Return a JSON array with this exact structure:
[
  {
    "title": "Chapter Title",
    "summary": "Brief but detailed chapter summary (2-3 sentences)..."
  }
]

Make sure the JSON is valid and contains exactly ${params.chapters} chapter entries.`;
  }

  /**
   * Build chapter generation prompt
   */
  private buildChapterPrompt(
    params: GenerationParams,
    outline: ChapterOutline[],
    chapterIndex: number,
    chapterOutline: ChapterOutline,
    context: string,
    genreGuide: string
  ): string {
    const chapterNumber = chapterIndex + 1;
    const isFirstChapter = chapterIndex === 0;
    const isLastChapter = chapterIndex === outline.length - 1;

    return `You are writing Chapter ${chapterNumber} of "${params.title}", a ${params.genre} novel in the ${params.subgenre} subgenre.

NOVEL OVERVIEW:
- Genre: ${params.genre} (${params.subgenre})
- Total Chapters: ${params.chapters}
- Target Chapter Length: ${params.targetChapterLength} words (±${params.wordCountVariance})
- Synopsis: ${params.synopsis}

GENRE GUIDELINES:
${genreGuide}

${context ? `STORY CONTEXT:\n${context}\n` : ''}

CHAPTER ${chapterNumber} OUTLINE:
Title: ${chapterOutline.title}
Summary: ${chapterOutline.summary}

CHAPTER REQUIREMENTS:
1. Write approximately ${params.targetChapterLength} words
2. ${isFirstChapter ? 'Establish the story world, introduce key characters, and hook the reader' : 'Continue the story naturally from previous chapters'}
3. ${isLastChapter ? 'Provide a satisfying conclusion that resolves the main story conflicts' : 'End with appropriate transition or hook for the next chapter'}
4. Include compelling dialogue and character development
5. Create vivid scenes and descriptions
6. Maintain genre conventions and tone
7. Ensure proper pacing for this point in the story

Write the complete chapter now:`;
  }

  /**
   * Call OpenAI with retry logic
   */
  private async callOpenAIWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error = new Error('No attempts made');

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (this.isRetryableError(error)) {
          const delay = Math.min(
            this.RETRY_DELAY_BASE * Math.pow(2, attempt),
            this.MAX_RETRY_DELAY
          );
          
          logger.warn(`OpenAI call failed (attempt ${attempt + 1}), retrying in ${delay}ms:`, error);
          await this.sleep(delay);
        } else {
          // Non-retryable error, throw immediately
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error?.status) {
      // Rate limit - retry with exponential backoff
      if (error.status === 429) return true;
      
      // Server errors - retry
      if (error.status >= 500) return true;
      
      // Client errors - don't retry
      if (error.status >= 400 && error.status < 500) return false;
    }

    // Network errors - retry
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') {
      return true;
    }

    // Default to not retrying
    return false;
  }

  /**
   * Update job status and progress
   */
  private async updateJobStatus(
    jobId: string,
    status: GenerationJob['status'],
    progress: number,
    currentChapter?: number
  ): Promise<void> {
    try {
      // Update database
      const updateData: any = {
        status,
        progress,
        lastActivity: new Date()
      };

      if (currentChapter !== undefined) {
        updateData.currentChapter = currentChapter;
      }

      await Job.findByIdAndUpdate(jobId, updateData);

      // Update memory
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = status;
        job.progress = progress;
        job.lastActivity = new Date();
        if (currentChapter !== undefined) {
          job.currentChapter = currentChapter;
        }
      }

    } catch (error) {
      logger.error(`Failed to update job status for ${jobId}:`, error);
    }
  }

  /**
   * Emit progress event to stream
   */
  private emitProgress(jobId: string, message: string): void {
    const stream = this.streams.get(jobId);
    if (stream) {
      stream.emit('progress', {
        jobId,
        message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle job error
   */
  private async handleJobError(jobId: string, error: Error): Promise<void> {
    try {
      const errorMessage = error.message || 'Unknown error occurred';
      
      await Job.findByIdAndUpdate(jobId, {
        status: 'failed',
        error: errorMessage,
        lastActivity: new Date()
      });

      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = errorMessage;
        job.lastActivity = new Date();
      }

      this.emitProgress(jobId, `Generation failed: ${errorMessage}`);
      
    } catch (updateError) {
      logger.error(`Failed to update job error for ${jobId}:`, updateError);
    }
  }

  /**
   * Complete job successfully
   */
  private async completeJob(jobId: string): Promise<void> {
    try {
      await Job.findByIdAndUpdate(jobId, {
        status: 'completed',
        progress: 100,
        lastActivity: new Date(),
        completedAt: new Date()
      });

      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'completed';
        job.progress = 100;
        job.lastActivity = new Date();
      }

      // Update novel status
      const jobRecord = await Job.findById(jobId);
      if (jobRecord) {
        await Novel.findByIdAndUpdate(jobRecord.novelId, {
          status: 'completed',
          completedAt: new Date()
        });
      }

    } catch (error) {
      logger.error(`Failed to complete job ${jobId}:`, error);
    }
  }

  /**
   * Resume job from database state
   */
  private async resumeJob(job: any): Promise<void> {
    try {
      const params = job.parameters;
      
      // Recreate in-memory job
      const generationJob: GenerationJob = {
        id: job._id,
        novelId: job.novelId,
        status: job.status,
        currentChapter: job.currentChapter,
        totalChapters: job.totalChapters,
        progress: job.progress,
        startTime: job.startTime,
        lastActivity: new Date()
      };

      this.jobs.set(job._id, generationJob);

      // Continue generation from where it left off
      if (job.status === 'outline') {
        // Resume from chapter generation
        await this.continueChapterGeneration(job._id, params, job.currentChapter);
      } else if (job.status === 'generating') {
        // Resume from current chapter
        await this.continueChapterGeneration(job._id, params, job.currentChapter);
      }

    } catch (error) {
      logger.error(`Failed to resume job ${job._id}:`, error);
      await this.handleJobError(job._id, error as Error);
    }
  }

  /**
   * Continue chapter generation from specific point
   */
  private async continueChapterGeneration(jobId: string, params: any, startChapter: number): Promise<void> {
    // Implementation would continue generation from the specified chapter
    // This is a simplified version - full implementation would be more complex
    logger.info(`Continuing generation for job ${jobId} from chapter ${startChapter}`);
    // Call processGeneration with modified parameters to start from specific chapter
  }

  /**
   * Validate generation parameters
   */
  private validateGenerationParams(params: GenerationParams): void {
    if (!params.title || params.title.length > 200) {
      throw new Error('Title is required and must be less than 200 characters');
    }

    if (!params.genre || !genreInstructions[params.genre]) {
      throw new Error('Valid genre is required');
    }

    if (!params.subgenre || !genreInstructions[params.genre][params.subgenre]) {
      throw new Error('Valid subgenre is required');
    }

    if (!params.synopsis || params.synopsis.length > 10000) {
      throw new Error('Synopsis is required and must be less than 10,000 characters');
    }

    if (params.wordCount < 10000 || params.wordCount > 500000) {
      throw new Error('Word count must be between 10,000 and 500,000');
    }

    if (params.chapters < 1 || params.chapters > 100) {
      throw new Error('Chapter count must be between 1 and 100');
    }

    if (params.targetChapterLength < 500 || params.targetChapterLength > 10000) {
      throw new Error('Target chapter length must be between 500 and 10,000 words');
    }

    if (params.wordCountVariance < 0 || params.wordCountVariance > params.targetChapterLength * 0.5) {
      throw new Error('Word count variance must be reasonable');
    }
  }

  /**
   * Clean up old jobs and streams
   */
  private cleanupOldJobs(): void {
    const now = Date.now();
    
    // Clean up old in-memory jobs
    for (const [jobId, job] of this.jobs.entries()) {
      const timeSinceActivity = now - job.lastActivity.getTime();
      
      if (timeSinceActivity > this.JOB_TIMEOUT) {
        logger.info(`Cleaning up old job ${jobId}`);
        this.jobs.delete(jobId);
        this.streams.delete(jobId);
      }
    }

    // Clean up orphaned streams
    for (const [streamId, stream] of this.streams.entries()) {
      if (!this.jobs.has(streamId)) {
        logger.info(`Cleaning up orphaned stream ${streamId}`);
        this.streams.delete(streamId);
      }
    }
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful shutdown
   */
  private shutdown(): void {
    logger.info('Shutting down AdvancedAIService...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Mark all running jobs as failed
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'generating' || job.status === 'outline') {
        this.handleJobError(jobId, new Error('Server shutdown'));
      }
    }

    logger.info('AdvancedAIService shutdown complete');
  }
}

export default AdvancedAIService;
