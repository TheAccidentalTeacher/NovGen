import { NextResponse } from 'next/server';
import { createJobQueue, Job } from '@/lib/job-queue';
import { createOpenAIService, OpenAIService } from '@/lib/openai-service';
import { Logger } from '@/lib/logger';
import { getProjectsCollection } from '@/lib/database';

const logger = new Logger();

export async function POST() {
  try {
    logger.info('Processing background jobs');

    const jobQueue = createJobQueue(logger);
    const openaiService = createOpenAIService(logger);
    
    // Process a single job (serverless-friendly approach)
    const job = await jobQueue.getNextJob();
    
    if (!job) {
      return NextResponse.json({
        message: 'No jobs to process',
        processed: false
      });
    }

    try {
      switch (job.type) {
        case 'outline_generation':
          await processOutlineGeneration(job, openaiService, jobQueue);
          break;
        case 'chapter_generation':
          await processChapterGeneration(job, openaiService, jobQueue);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      return NextResponse.json({
        message: 'Job processed successfully',
        jobId: job.id,
        processed: true
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Job processing failed: ${job.id}`, error as Error);
      await jobQueue.failJob(job.id, errorMessage);
      
      return NextResponse.json({
        message: 'Job processing failed',
        jobId: job.id,
        error: errorMessage,
        processed: true
      }, { status: 500 });
    }

  } catch (error) {
    logger.error('Background job processing error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Process outline generation job
async function processOutlineGeneration(
  job: Job,
  openaiService: OpenAIService,
  jobQueue: ReturnType<typeof createJobQueue>
): Promise<void> {
  const { premise, genre, subgenre, numberOfChapters } = job.data;

  if (!premise || !genre || !subgenre || !numberOfChapters) {
    throw new Error('Missing required data for outline generation');
  }

  // Update progress
  await jobQueue.updateJobProgress(job.id, 10);

  // Generate the outline
  const outline = await openaiService.generateOutline(
    premise,
    genre,
    subgenre,
    numberOfChapters
  );

  // Update the project with the generated outline
  const collection = await getProjectsCollection();
  await collection.updateOne(
    { _id: job.projectId },
    { 
      $set: { 
        outline,
        status: 'outline',
        updatedAt: new Date()
      }
    }
  );

  // Complete the job
  await jobQueue.completeJob(job.id, { outline });
  
  logger.info(`Outline generation completed: ${job.id}`, {
    chapterCount: outline.length,
    projectId: job.projectId
  });
}

// Process chapter generation job
async function processChapterGeneration(
  job: Job,
  openaiService: OpenAIService,
  jobQueue: ReturnType<typeof createJobQueue>
): Promise<void> {
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

  // Update progress
  await jobQueue.updateJobProgress(job.id, 10);

  // Generate the chapter
  const result = await openaiService.generateChapter(
    chapterNumber,
    premise,
    outline,
    previousChapters,
    targetWordCount,
    genre,
    subgenre
  );

  // Complete the job
  await jobQueue.completeJob(job.id, { chapter: result });
  
  logger.info(`Chapter generation completed: ${job.id}`, {
    chapterNumber,
    wordCount: result.wordCount,
    projectId: job.projectId
  });
}
