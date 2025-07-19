import { NextRequest, NextResponse } from 'next/server';
import { getProjectsCollection } from '@/lib/database';
import { createProjectLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const collection = await getProjectsCollection();
    const project = await collection.findOne({ _id: id });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    const logger = createProjectLogger('unknown');
    logger.error('Failed to retrieve project', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
