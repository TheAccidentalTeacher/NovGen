import { NextRequest, NextResponse } from 'next/server';
import { getProjectsCollection } from '@/lib/database';
import { createJobQueue } from '@/lib/job-queue';
import { createProjectLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const logger = createProjectLogger(id);
  
  try {
    logger.info('Starting outline generation job', { projectId: id });

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

    // Create background job for outline generation
    const jobQueue = createJobQueue(logger);
    const job = await jobQueue.createJob(
      'outline_generation',
      id,
      {
        premise: project.premise,
        genre: project.genre,
        subgenre: project.subgenre,
        numberOfChapters: project.numberOfChapters
      }
    );

    logger.info('Outline generation job created', { 
      jobId: job.id,
      projectId: id 
    });

    // Immediately trigger background worker to process the job
    try {
      const workerResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/background-worker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (workerResponse.ok) {
        logger.info('Background worker triggered successfully', { jobId: job.id });
      } else {
        logger.warning('Failed to trigger background worker, job will be processed later', { 
          jobId: job.id, 
          status: workerResponse.status 
        });
      }
    } catch (triggerError) {
      logger.warning('Could not trigger background worker immediately', { jobId: job.id, error: triggerError });
    }

    return NextResponse.json({
      message: 'Outline generation started',
      jobId: job.id,
      status: 'in_progress'
    });

  } catch (error) {
    logger.error('Failed to start outline generation', error as Error);
    return NextResponse.json(
      { error: 'Failed to start outline generation' },
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
