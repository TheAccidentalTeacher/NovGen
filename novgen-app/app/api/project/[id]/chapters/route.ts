import { NextRequest, NextResponse } from 'next/server';
import { getProjectsCollection, Chapter } from '@/lib/database';
import { createOpenAIService } from '@/lib/openai-service';
import { createProjectLogger, Logger } from '@/lib/logger';

// Interface for project data from database
interface ProjectData {
  _id: string;
  premise: string;
  outline: string[];
  numberOfChapters: number;
  chapterLength: number;
  genre: string;
  subgenre: string;
}

// Global progress tracking for active generations
const generationProgress = new Map<string, {
  isGenerating: boolean;
  stage: 'chapters' | 'complete';
  currentChapter: number;
  totalChapters: number;
  message: string;
  debugLogs: string[];
}>();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const logger = createProjectLogger(id);
  
  try {
    logger.info('Starting chapter generation', { projectId: id });

    // Get project
    const collection = await getProjectsCollection();
    const project = await collection.findOne({ _id: id });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.status !== 'outline') {
      return NextResponse.json(
        { error: 'Project must have an outline before generating chapters' },
        { status: 400 }
      );
    }

    if (project.outline.length === 0) {
      return NextResponse.json(
        { error: 'Project outline is empty' },
        { status: 400 }
      );
    }

    // Check if already generating
    if (generationProgress.has(id)) {
      return NextResponse.json(
        { error: 'Chapter generation already in progress for this project' },
        { status: 409 }
      );
    }

    // Initialize progress tracking
    generationProgress.set(id, {
      isGenerating: true,
      stage: 'chapters',
      currentChapter: 0,
      totalChapters: project.numberOfChapters,
      message: 'Initializing chapter generation...',
      debugLogs: []
    });

    // Update project status
    await collection.updateOne(
      { _id: id },
      { 
        $set: { 
          status: 'drafting',
          currentChapter: 0,
          updatedAt: new Date(),
        }
      }
    );

    // Start background chapter generation
    generateChaptersInBackground(id, project as ProjectData, logger);

    return NextResponse.json({
      message: 'Chapter generation started',
      status: 'drafting'
    });
  } catch (error) {
    logger.error('Failed to start chapter generation', error as Error);
    generationProgress.delete(id);
    
    return NextResponse.json(
      { error: 'Failed to start chapter generation' },
      { status: 500 }
    );
  }
}

async function generateChaptersInBackground(projectId: string, project: ProjectData, logger: Logger) {
  const collection = await getProjectsCollection();
  const openaiService = createOpenAIService(logger);
  
  try {
    const chapters: Chapter[] = [];
    
    for (let chapterNumber = 1; chapterNumber <= project.numberOfChapters; chapterNumber++) {
      // Update progress
      const chapterProgress = generationProgress.get(projectId);
      if (chapterProgress) {
        chapterProgress.currentChapter = chapterNumber;
        chapterProgress.message = `Generating Chapter ${chapterNumber} of ${project.numberOfChapters}...`;
        chapterProgress.debugLogs.push(`🔄 Starting Chapter ${chapterNumber} generation`);
      }

      logger.info(`Generating chapter ${chapterNumber}`, { chapterNumber, totalChapters: project.numberOfChapters });

      let attempts = 0;
      let chapter: { content: string; wordCount: number } | null = null;
      const maxAttempts = 3;

      // Generate chapter with retry logic for word count validation
      while (attempts < maxAttempts) {
        attempts++;
        
        try {
          // Get previous chapters content for context
          const previousChapters = chapters.map(ch => ch.content);
          
          chapter = await openaiService.generateChapter(
            chapterNumber,
            project.premise,
            project.outline,
            previousChapters,
            project.chapterLength,
            project.genre,
            project.subgenre
          );

          // Validate chapter length
          if (openaiService.isChapterLengthValid(chapter.wordCount, project.chapterLength)) {
            logger.info(`Chapter ${chapterNumber} generated successfully`, {
              wordCount: chapter.wordCount,
              targetWordCount: project.chapterLength,
              attempts
            });
            break;
          } else {
            logger.warning(`Chapter ${chapterNumber} word count out of range`, {
              wordCount: chapter.wordCount,
              targetWordCount: project.chapterLength,
              variance: Math.abs(chapter.wordCount - project.chapterLength),
              attempt: attempts
            });

            if (attempts < maxAttempts) {
              const retryProgress = generationProgress.get(projectId);
              if (retryProgress) {
                retryProgress.message = `Regenerating Chapter ${chapterNumber} (attempt ${attempts + 1}) - word count variance too high`;
                retryProgress.debugLogs.push(`⚠️ Chapter ${chapterNumber} word count: ${chapter.wordCount}, target: ${project.chapterLength}, regenerating...`);
              }
            }
          }
        } catch (genError) {
          logger.error(`Chapter ${chapterNumber} generation attempt ${attempts} failed`, genError as Error);
          
          if (attempts >= maxAttempts) {
            throw genError;
          }
          
          const errorProgress = generationProgress.get(projectId);
          if (errorProgress) {
            errorProgress.message = `Retrying Chapter ${chapterNumber} generation (attempt ${attempts + 1})...`;
            errorProgress.debugLogs.push(`❌ Chapter ${chapterNumber} generation failed, retrying...`);
          }
        }
      }

      if (!chapter) {
        throw new Error(`Failed to generate valid chapter ${chapterNumber} after ${maxAttempts} attempts`);
      }

      // Create chapter object
      const chapterData: Chapter = {
        chapterNumber,
        content: chapter.content,
        wordCount: chapter.wordCount,
        generatedAt: new Date(),
        regenerated: attempts > 1,
        regenerationCount: attempts - 1
      };

      chapters.push(chapterData);

      // Save progress to database
      await collection.updateOne(
        { _id: projectId },
        { 
          $push: { chapters: chapterData },
          $set: { 
            currentChapter: chapterNumber,
            updatedAt: new Date(),
          }
        }
      );

      logger.info(`Chapter ${chapterNumber} saved to database`, { 
        wordCount: chapter.wordCount,
        regenerated: chapterData.regenerated
      });

      // Update progress
      const saveProgress = generationProgress.get(projectId);
      if (saveProgress) {
        saveProgress.debugLogs.push(`✅ Chapter ${chapterNumber} completed (${chapter.wordCount} words)`);
      }

      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mark project as completed
    await collection.updateOne(
      { _id: projectId },
      { 
        $set: { 
          status: 'completed',
          updatedAt: new Date(),
        },
        $push: {
          debugLogs: {
            $each: logger.getLogs()
          }
        }
      }
    );

    // Update final progress
    const finalProgress = generationProgress.get(projectId);
    if (finalProgress) {
      finalProgress.isGenerating = false;
      finalProgress.stage = 'complete';
      finalProgress.message = 'All chapters generated successfully!';
      finalProgress.debugLogs.push('🎉 Novel generation completed successfully!');
    }

    logger.info('All chapters generated successfully', { 
      totalChapters: chapters.length,
      totalWords: chapters.reduce((sum, ch) => sum + ch.wordCount, 0)
    });

  } catch (error) {
    logger.error('Chapter generation failed', error as Error);

    // Update project with error
    await collection.updateOne(
      { _id: projectId },
      { 
        $set: { 
          status: 'outline', // Reset to outline status for retry
          updatedAt: new Date(),
        },
        $push: {
          debugLogs: {
            $each: logger.getLogs()
          }
        }
      }
    );

    // Update progress with error
    const errorFinalProgress = generationProgress.get(projectId);
    if (errorFinalProgress) {
      errorFinalProgress.isGenerating = false;
      errorFinalProgress.message = 'Chapter generation failed';
      errorFinalProgress.debugLogs.push(`❌ Generation failed: ${error}`);
    }
  }
}
