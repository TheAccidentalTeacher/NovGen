import { AdvancedAIService, NovelGenerationRequest, ChapterGenerationRequest } from './AdvancedAIService';
import { Novel, Chapter, GenerationJob, IGenerationJob } from '../models/index';
import { EventEmitter } from 'events';

export interface GenerationProgress {
  jobId: string;
  status: 'pending' | 'generating_outline' | 'generating_chapters' | 'completed' | 'failed';
  currentStep: string;
  completedChapters: number;
  totalChapters: number;
  percentComplete: number;
  estimatedTimeRemaining?: string;
  error?: string;
}

export class NovelGenerationService extends EventEmitter {
  private aiService: AdvancedAIService;
  private activeJobs: Map<string, IGenerationJob> = new Map();

  constructor() {
    super();
    this.aiService = new AdvancedAIService();
  }

  /**
   * Start a complete novel generation job
   */
  async startNovelGeneration(userId: string, request: NovelGenerationRequest): Promise<string> {
    // Validate the request
    const validation = this.aiService.validateNovelRequest(request);
    if (!validation.valid) {
      throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
    }

    // Create the novel record
    const novel = new Novel({
      userId,
      title: request.title,
      genre: request.genre,
      subgenre: request.theme || 'general',
      targetWordCount: request.chapterCount * 3000,
      summary: request.description,
      characterDescriptions: `${request.characterCount} main characters in ${request.setting}`,
      plotOutline: `${request.genre} novel with ${request.tone} tone`,
      tone: request.tone || '',
      style: request.genre || '',
      status: 'generating',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await novel.save();

    // Create the generation job
    const job = new GenerationJob({
      novelId: novel._id,
      userId,
      status: 'pending',
      currentStep: 'initializing',
      totalChapters: request.chapterCount,
      completedChapters: 0,
      percentComplete: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await job.save();

    // Start the generation process asynchronously
    this.processNovelGeneration((job as any)._id.toString(), (novel as any)._id.toString(), request);

    return (job as any)._id.toString();
  }

  /**
   * Get the status of a generation job
   */
  async getGenerationProgress(jobId: string): Promise<GenerationProgress> {
    const job = await GenerationJob.findById(jobId);
    if (!job) {
      throw new Error('Generation job not found');
    }

    return {
      jobId,
      status: job.status,
      currentStep: job.currentStep,
      completedChapters: job.completedChapters,
      totalChapters: job.totalChapters,
      percentComplete: job.percentComplete,
      estimatedTimeRemaining: job.estimatedTimeRemaining,
      error: job.error
    };
  }

  /**
   * Cancel a generation job
   */
  async cancelGeneration(jobId: string): Promise<void> {
    const job = await GenerationJob.findById(jobId);
    if (!job) {
      throw new Error('Generation job not found');
    }

    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error('Cannot cancel completed or failed job');
    }

    job.status = 'failed';
    job.error = 'Cancelled by user';
    job.updatedAt = new Date();
    await job.save();

    // Remove from active jobs
    this.activeJobs.delete(jobId);

    this.emit('jobCancelled', jobId);
  }

  /**
   * Process the novel generation (runs asynchronously)
   */
  private async processNovelGeneration(
    jobId: string, 
    novelId: string, 
    request: NovelGenerationRequest
  ): Promise<void> {
    const job = await GenerationJob.findById(jobId);
    const novel = await Novel.findById(novelId);
    
    if (!job || !novel) {
      throw new Error('Job or novel not found');
    }

    try {
      // Step 1: Generate novel outline
      await this.updateJobProgress(job, 'generating_outline', 'Creating novel outline...', 5);
      
      const outline = await this.aiService.generateNovelOutline(request);
      
      // Update novel with outline data
      novel.title = outline.title;
      novel.summary = outline.summary;
      novel.characters = outline.characters;
      novel.themes = outline.themes;
      novel.plotPoints = outline.plotPoints;
      novel.chapterOutlines = outline.chapters;
      await novel.save();

      // Step 2: Generate chapters
      await this.updateJobProgress(job, 'generating_chapters', 'Generating chapters...', 10);

      const chapters: string[] = [];
      const chapterWordCount = 3000; // Fixed word count per chapter

      for (let i = 0; i < outline.chapters.length; i++) {
        const chapterOutline = outline.chapters[i];
        
        await this.updateJobProgress(
          job, 
          'generating_chapters', 
          `Writing Chapter ${i + 1}: ${chapterOutline.title}`,
          10 + (80 * (i / outline.chapters.length))
        );

        const chapterContent = await this.aiService.generateChapter({
          novelId: novelId,
          chapterNumber: i + 1,
          previousChapters: chapters.slice(-2), // Last 2 chapters for context
          plotOutline: `${outline.summary}\n\nChapter ${i + 1}: ${chapterOutline.summary}\nKey Events: ${chapterOutline.keyEvents.join(', ')}`,
          characterDescriptions: outline.characters.map(c => `${c.name}: ${c.description}`).join('\n'),
          wordCount: chapterWordCount,
          genre: request.genre,
          subgenre: request.theme || 'general'
        });

        // Save the chapter
        const chapter = new Chapter({
          novelId: novelId,
          chapterNumber: i + 1,
          title: chapterOutline.title,
          content: chapterContent,
          wordCount: this.countWords(chapterContent),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await chapter.save();
        chapters.push(chapterContent);

        // Update job progress
        job.completedChapters = i + 1;
        job.percentComplete = 10 + (80 * ((i + 1) / outline.chapters.length));
        await job.save();

        // Emit progress event
        this.emit('chapterCompleted', {
          jobId,
          novelId,
          chapterNumber: i + 1,
          chapterTitle: chapterOutline.title,
          completedChapters: i + 1,
          totalChapters: outline.chapters.length
        });

        // Small delay to prevent rate limiting
        await this.delay(1000);
      }

      // Step 3: Generate book blurb
      await this.updateJobProgress(job, 'generating_chapters', 'Creating book description...', 95);
      
      const blurb = await this.aiService.generateBookBlurb(
        outline.title,
        outline.summary,
        outline.characters,
        outline.themes,
        request.genre,
        request.theme || 'general'
      );

      // Final updates
      novel.description = blurb;
      novel.status = 'completed';
      novel.progress = 100;
      novel.completedAt = new Date();
      novel.totalWordCount = chapters.reduce((total, chapter) => total + this.countWords(chapter), 0);
      await novel.save();

      await this.updateJobProgress(job, 'completed', 'Novel generation completed!', 100);

      this.emit('novelCompleted', {
        jobId,
        novelId,
        title: outline.title,
        totalChapters: outline.chapters.length,
        totalWordCount: novel.totalWordCount
      });

    } catch (error) {
      console.error('Error during novel generation:', error);
      
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error occurred';
      job.updatedAt = new Date();
      await job.save();

      novel.status = 'failed';
      await novel.save();

      this.emit('jobFailed', {
        jobId,
        novelId,
        error: job.error
      });
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Generate additional chapters for an existing novel
   */
  async generateAdditionalChapters(
    novelId: string,
    startChapter: number,
    endChapter: number
  ): Promise<string> {
    const novel = await Novel.findById(novelId);
    if (!novel) {
      throw new Error('Novel not found');
    }

    // Get existing chapters for context
    const existingChapters = await Chapter.find({ novelId })
      .sort({ chapterNumber: 1 });

    const job = new GenerationJob({
      novelId,
      userId: novel.userId,
      status: 'pending',
      currentStep: 'generating_additional_chapters',
      totalChapters: endChapter - startChapter + 1,
      completedChapters: 0,
      percentComplete: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await job.save();

    // Start generation process
    this.processAdditionalChapters((job as any)._id.toString(), novel, startChapter, endChapter, existingChapters);

    return (job as any)._id.toString();
  }

  /**
   * Enhance an existing chapter
   */
  async enhanceChapter(
    chapterId: string,
    enhancementType: 'dialogue' | 'description' | 'pacing' | 'character_development' | 'overall'
  ): Promise<string> {
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      throw new Error('Chapter not found');
    }

    const novel = await Novel.findById(chapter.novelId);
    if (!novel) {
      throw new Error('Novel not found');
    }

    const enhancedContent = await this.aiService.enhanceChapter(
      chapter.content,
      novel.genre,
      novel.subgenre,
      enhancementType
    );

    // Save the enhanced version (keep original as backup)
    chapter.originalContent = chapter.content;
    chapter.content = enhancedContent;
    chapter.wordCount = this.countWords(enhancedContent);
    chapter.enhancementType = enhancementType;
    chapter.updatedAt = new Date();
    await chapter.save();

    return enhancedContent;
  }

  /**
   * Get available genres and subgenres
   */
  getAvailableGenres(): Record<string, string[]> {
    return this.aiService.getAvailableGenres();
  }

  /**
   * Estimate generation time and cost
   */
  estimateGeneration(wordCount: number) {
    return this.aiService.estimateGenerationMetrics(wordCount);
  }

  /**
   * Process additional chapters generation
   */
  private async processAdditionalChapters(
    jobId: string,
    novel: any,
    startChapter: number,
    endChapter: number,
    existingChapters: any[]
  ): Promise<void> {
    const job = await GenerationJob.findById(jobId);
    if (!job) return;

    try {
      const chapterWordCount = Math.floor(novel.targetWordCount / (novel.chapterOutlines?.length || 20));
      const contextChapters = existingChapters
        .slice(-3)
        .map(c => c.content);

      for (let chapterNum = startChapter; chapterNum <= endChapter; chapterNum++) {
        await this.updateJobProgress(
          job,
          'generating_chapters',
          `Writing Chapter ${chapterNum}`,
          (chapterNum - startChapter) / (endChapter - startChapter + 1) * 100
        );

        const chapterContent = await this.aiService.generateChapter({
          novelId: novel._id.toString(),
          chapterNumber: chapterNum,
          previousChapters: contextChapters,
          plotOutline: novel.plotOutline || novel.summary,
          characterDescriptions: novel.characterDescriptions || 
            (novel.characters?.map((c: any) => `${c.name}: ${c.description}`).join('\n') || ''),
          wordCount: chapterWordCount,
          genre: novel.genre,
          subgenre: novel.subgenre
        });

        const chapter = new Chapter({
          novelId: novel._id,
          chapterNumber: chapterNum,
          title: `Chapter ${chapterNum}`,
          content: chapterContent,
          wordCount: this.countWords(chapterContent),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await chapter.save();
        contextChapters.push(chapterContent);

        job.completedChapters++;
        job.percentComplete = (job.completedChapters / job.totalChapters) * 100;
        await job.save();

        this.emit('chapterCompleted', {
          jobId,
          novelId: novel._id.toString(),
          chapterNumber: chapterNum,
          completedChapters: job.completedChapters,
          totalChapters: job.totalChapters
        });

        await this.delay(1000);
      }

      await this.updateJobProgress(job, 'completed', 'Additional chapters completed!', 100);

      this.emit('additionalChaptersCompleted', {
        jobId,
        novelId: novel._id.toString(),
        startChapter,
        endChapter
      });

    } catch (error) {
      console.error('Error generating additional chapters:', error);
      
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error occurred';
      await job.save();

      this.emit('jobFailed', {
        jobId,
        novelId: novel._id.toString(),
        error: job.error
      });
    }
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(
    job: any,
    status: string,
    currentStep: string,
    percentComplete: number
  ): Promise<void> {
    job.status = status;
    job.currentStep = currentStep;
    job.percentComplete = Math.round(percentComplete);
    job.updatedAt = new Date();
    
    if (percentComplete > 0 && percentComplete < 100) {
      const remainingPercent = 100 - percentComplete;
      const elapsedTime = Date.now() - job.createdAt.getTime();
      const estimatedTotal = (elapsedTime / percentComplete) * 100;
      const estimatedRemaining = estimatedTotal - elapsedTime;
      job.estimatedTimeRemaining = this.formatDuration(estimatedRemaining);
    }
    
    await job.save();

    this.emit('progressUpdate', {
      jobId: job._id.toString(),
      status,
      currentStep,
      percentComplete,
      estimatedTimeRemaining: job.estimatedTimeRemaining
    });
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Format duration in milliseconds to readable string
   */
  private formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
