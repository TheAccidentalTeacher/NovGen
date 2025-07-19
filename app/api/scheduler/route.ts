import { NextResponse } from 'next/server';

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

    if (result.processed) {
      // If a job was processed, call the scheduler again after a short delay
      // to process any remaining jobs
      setTimeout(async () => {
        await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/scheduler`, {
          method: 'GET'
        });
      }, 1000);
    }

    return NextResponse.json({
      message: 'Scheduler executed',
      result
    });

  } catch (error) {
    console.error('Scheduler error:', error);
    return NextResponse.json(
      { error: 'Scheduler failed' },
      { status: 500 }
    );
  }
}
