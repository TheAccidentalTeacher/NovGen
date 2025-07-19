import { NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';

const logger = new Logger();

export async function GET() {
  try {
    // This endpoint can be called by external services like cron-job.org
    // or GitHub Actions to trigger background job processing
    
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/background-worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    return NextResponse.json({
      message: 'Scheduler executed',
      result
    });

  } catch (error) {
    logger.error('Scheduler execution failed', error as Error);
    return NextResponse.json(
      { error: 'Scheduler failed' },
      { status: 500 }
    );
  }
}
