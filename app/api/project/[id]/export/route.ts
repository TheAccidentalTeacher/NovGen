import { NextRequest, NextResponse } from 'next/server';
import { getProjectsCollection } from '@/lib/database';
import { DocumentExporter } from '@/lib/document-exporter';
import { createProjectLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const logger = createProjectLogger(id);
  
  try {
    logger.info('Starting novel export', { projectId: id });

    // Get project
    const collection = await getProjectsCollection();
    const project = await collection.findOne({ _id: id });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.status !== 'completed' || project.chapters.length === 0) {
      return NextResponse.json(
        { error: 'Project must be completed with chapters to export' },
        { status: 400 }
      );
    }

    // Generate document
    const docBuffer = await DocumentExporter.exportToDocx(
      project.chapters,
      {
        title: `${project.genre} Novel`,
        genre: project.genre,
        subgenre: project.subgenre,
        premise: project.premise,
        author: 'AI Generated'
      }
    );

    const filename = DocumentExporter.generateFilename(`${project.genre}_Novel`);
    
    logger.info('Novel exported successfully', { 
      filename,
      chapters: project.chapters.length,
      totalWords: project.chapters.reduce((sum, ch) => sum + ch.wordCount, 0)
    });

    // Return the document as a download
    return new NextResponse(new Uint8Array(docBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': docBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error('Novel export failed', error as Error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}
