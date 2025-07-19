import { NextRequest, NextResponse } from 'next/server';
import { getProjectsCollection } from '@/lib/database';
import { createOpenAIService } from '@/lib/openai-service';
import { createProjectLogger } from '@/lib/logger';

// Background outline generation for large novels
async function generateOutlineInBackground(projectId: string, project: { premise: string; genre: string; subgenre: string; numberOfChapters: number }, logger: ReturnType<typeof createProjectLogger>) {
  try {
    const openaiService = createOpenAIService(logger);
    
    // Progress callback to save partial results
    const progressCallback = async (progress: number, message: string, partialOutline?: string[]) => {
      logger.info('Progress update', { progress, message, chapterCount: partialOutline?.length });
      
      // Update project with progress info and partial outline
      const collection = await getProjectsCollection();
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
        { _id: projectId },
        { $set: updateData }
      );
    };
    
    const outline = await openaiService.generateOutline(
      project.premise,
      project.genre,
      project.subgenre,
      project.numberOfChapters,
      progressCallback
    );

    // Update project with generated outline
    const collection = await getProjectsCollection();
    await collection.updateOne(
      { _id: projectId },
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

    logger.info('Background outline generation completed', { 
      projectId,
      chapterCount: outline.length
    });

  } catch (error) {
    logger.error('Background outline generation failed', error as Error);
    
    // Reset status on failure
    const collection = await getProjectsCollection();
    await collection.updateOne(
      { _id: projectId },
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
  }
}

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

    // For large novels (25+ chapters), use background processing to avoid timeouts
    if (project.numberOfChapters >= 25) {
      // Update status to show we're processing (use 'drafting' as intermediate status)
      await collection.updateOne(
        { _id: id },
        { 
          $set: { 
            status: 'drafting',
            updatedAt: new Date()
          }
        }
      );

      // Start background outline generation (fire and forget)
      generateOutlineInBackground(id, project, logger);

      return NextResponse.json({
        message: 'Large outline generation started in background',
        status: 'drafting',
        note: 'Refresh page in 60-90 seconds to see results'
      });
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
    logger.error('Failed to generate outline', error as Error);
    
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
      { error: 'Failed to generate outline' },
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
