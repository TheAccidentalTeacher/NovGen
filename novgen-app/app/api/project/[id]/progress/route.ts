import { NextRequest, NextResponse } from 'next/server';

// Import the same progress tracking map from chapters route
// Note: In a production app, this would be better stored in Redis or similar
const generationProgress = new Map<string, {
  isGenerating: boolean;
  stage: 'chapters' | 'complete';
  currentChapter: number;
  totalChapters: number;
  message: string;
  debugLogs: string[];
}>();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const progress = generationProgress.get(id);

    if (!progress) {
      return NextResponse.json({
        isGenerating: false,
        stage: null,
        currentChapter: 0,
        totalChapters: 0,
        message: 'No active generation',
        debugLogs: []
      });
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Failed to get generation progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
