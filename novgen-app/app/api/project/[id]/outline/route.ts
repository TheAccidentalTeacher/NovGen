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

    // Generate outline using OpenAI
    const openaiService = createOpenAIService(logger);
    const outline = await openaiService.generateOutline(
      project.premise,
      project.genre,
      project.subgenre,
      project.numberOfChapters
    );

    // Update project with outline
    await collection.updateOne(
      { _id: id },
      { 
        $set: { 
          outline,
          status: 'outline',
          updatedAt: new Date(),
        },
        $push: {
          debugLogs: {
            $each: logger.getLogs()
          }
        }
      }
    );

    logger.info('Outline generation completed', { chapterCount: outline.length });

    return NextResponse.json({
      outline,
      debugLogs: logger.getLogs().map(log => `${log.timestamp.toISOString()} [${log.level.toUpperCase()}] ${log.message}`)
    });
  } catch (error) {
    logger.error('Outline generation failed', error as Error);
    
    // Update project with error logs
    try {
      const collection = await getProjectsCollection();
      await collection.updateOne(
        { _id: id },
        { 
          $push: {
            debugLogs: {
              $each: logger.getLogs()
            }
          }
        }
      );
    } catch (dbError) {
      console.error('Failed to save error logs to database:', dbError);
    }

    return NextResponse.json(
      { 
        error: 'Outline generation failed',
        debugLogs: logger.getLogs().map(log => `${log.timestamp.toISOString()} [${log.level.toUpperCase()}] ${log.message}`)
      },
      { status: 500 }
    );
  }
}
