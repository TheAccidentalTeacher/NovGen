import { NextRequest, NextResponse } from 'next/server';
import { getProjectsCollection } from '@/lib/database';
import { createOpenAIService } from '@/lib/openai-service';
import { createProjectLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const logger = createProjectLogger(id);
  
  try {
    logger.info('Starting outline generation', { projectId: id });

    // Get project
    const collection = await getProjectsCollection();
    const project = await collection.findOne({ _id: id });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.status !== 'setup') {
      return NextResponse.json(
        { error: 'Project must be in setup status to generate outline' },
        { status: 400 }
      );
    }

    // For large novels (25+ chapters), we need to process in chunks but still synchronously
    if (project.numberOfChapters >= 25) {
      // Update status to show we're processing
      await collection.updateOne(
        { _id: id },
        { 
          $set: { 
            status: 'drafting',
            generationProgress: {
              progress: 10,
              message: `Starting generation of ${project.numberOfChapters} chapters...`,
              updatedAt: new Date()
            },
            updatedAt: new Date()
          }
        }
      );

      // Process synchronously with progress updates
      const openaiService = createOpenAIService(logger);
      
      const progressCallback = async (progress: number, message: string, partialOutline?: string[]) => {
        logger.info('Progress update', { progress, message, chapterCount: partialOutline?.length });
        
        // Update project with progress info and partial outline
        const updateData: Record<string, unknown> = {
          generationProgress: {
            progress,
            message,
            updatedAt: new Date()
          },
          updatedAt: new Date()
        };
        
        // If we have partial outline, save it
        if (partialOutline && partialOutline.length > 0) {
          updateData.partialOutline = partialOutline;
        }
        
        await collection.updateOne(
          { _id: id },
          { $set: updateData }
        );
      };

      try {
        // Set a timeout for the entire operation (4.5 minutes)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Generation timeout after 4.5 minutes')), 270000);
        });

        const generationPromise = openaiService.generateOutline(
          project.premise,
          project.genre,
          project.subgenre,
          project.numberOfChapters,
          progressCallback
        );

        // Race between generation and timeout
        const outline = await Promise.race([generationPromise, timeoutPromise]);

        // Update project with completed outline
        await collection.updateOne(
          { _id: id },
          { 
            $set: { 
              outline,
              status: 'outline',
              updatedAt: new Date()
            },
            $unset: {
              generationProgress: "",
              partialOutline: ""
            }
          }
        );

        logger.info('Large outline generation completed', { 
          projectId: id,
          chapterCount: outline.length
        });

        return NextResponse.json({
          message: `Generated ${outline.length} chapter outline`,
          outline,
          status: 'outline'
        });

      } catch (error) {
        logger.error('Outline generation failed', error as Error);
        
        // Reset status on failure
        await collection.updateOne(
          { _id: id },
          { 
            $set: { 
              status: 'setup',
              updatedAt: new Date()
            },
            $unset: {
              generationProgress: "",
              partialOutline: ""
            }
          }
        );
        
        return NextResponse.json(
          { error: 'Failed to generate outline. Please try again.' },
          { status: 500 }
        );
      }
    }

    // For smaller novels, generate directly
    const openaiService = createOpenAIService(logger);
    
    logger.info('Starting outline generation with OpenAI', {
      premise: project.premise.substring(0, 100) + '...',
      genre: project.genre,
      subgenre: project.subgenre,
      numberOfChapters: project.numberOfChapters
    });

    const outline = await openaiService.generateOutline(
      project.premise,
      project.genre,
      project.subgenre,
      project.numberOfChapters
    );

    // Update project with generated outline
    await collection.updateOne(
      { _id: id },
      { 
        $set: { 
          outline,
          status: 'outline',
          updatedAt: new Date()
        }
      }
    );

    logger.info('Outline generation completed successfully', { 
      projectId: id,
      chapterCount: outline.length
    });

    return NextResponse.json({
      message: 'Outline generated successfully',
      outline,
      status: 'outline'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Failed to generate outline', error as Error, { 
      projectId: id,
      errorMessage,
      errorStack: errorStack?.substring(0, 500) // Truncate stack trace
    });
    
    // Reset project status on failure
    try {
      const collection = await getProjectsCollection();
      await collection.updateOne(
        { _id: id },
        { 
          $set: { 
            status: 'setup',
            updatedAt: new Date()
          }
        }
      );
    } catch (resetError) {
      logger.error('Failed to reset project status after outline failure', resetError as Error);
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate outline',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const logger = createProjectLogger(id);
  
  try {
    // Get project
    const collection = await getProjectsCollection();
    const project = await collection.findOne({ _id: id });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      outline: project.outline || null,
      status: project.status
    });

  } catch (error) {
    logger.error('Failed to get project outline', error as Error);
    return NextResponse.json(
      { error: 'Failed to get outline' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const logger = createProjectLogger(id);
  
  try {
    logger.info('Resetting stuck outline generation', { projectId: id });

    // Reset project status and clear progress
    const collection = await getProjectsCollection();
    await collection.updateOne(
      { _id: id },
      { 
        $set: { 
          status: 'setup',
          updatedAt: new Date()
        },
        $unset: {
          generationProgress: "",
          partialOutline: "",
          outline: ""
        }
      }
    );

    return NextResponse.json({
      message: 'Project reset successfully. You can now generate a new outline.',
      status: 'setup'
    });

  } catch (error) {
    logger.error('Failed to reset project', error as Error);
    return NextResponse.json(
      { error: 'Failed to reset project' },
      { status: 500 }
    );
  }
}
