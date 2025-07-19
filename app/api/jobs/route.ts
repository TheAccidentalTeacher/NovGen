import { NextRequest, NextResponse } from 'next/server';
import { createJobQueue } from '@/lib/job-queue';
import { Logger } from '@/lib/logger';

const logger = new Logger();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const jobQueue = createJobQueue(logger);
    const job = await jobQueue.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Return job status without sensitive internal data
    const response = {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      result: job.result
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to get job status', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const olderThanDays = parseInt(searchParams.get('olderThanDays') || '7');

    const jobQueue = createJobQueue(logger);
    const deletedCount = await jobQueue.cleanupOldJobs(olderThanDays);

    return NextResponse.json({
      message: `Cleaned up ${deletedCount} old jobs`,
      deletedCount
    });
  } catch (error) {
    logger.error('Failed to cleanup jobs', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
