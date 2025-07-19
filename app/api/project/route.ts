import { NextRequest, NextResponse } from 'next/server';
import { getProjectsCollection, NovelProject, getPromptConfigCollection } from '@/lib/database';
import { createProjectLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// POST - Create new project
export async function POST(request: NextRequest) {
  const logger = createProjectLogger('new-project');
  
  try {
    logger.info('Creating new project');
    
    const body = await request.json();
    const { genre, subgenre, totalWordCount, numberOfChapters, chapterLength, premise } = body;

    // Validation
    if (!genre || !subgenre || !premise.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: genre, subgenre, premise' },
        { status: 400 }
      );
    }

    if (totalWordCount < 20000 || totalWordCount > 200000) {
      return NextResponse.json(
        { error: 'Total word count must be between 20,000 and 200,000' },
        { status: 400 }
      );
    }

    if (numberOfChapters < 1 || numberOfChapters > 100) {
      return NextResponse.json(
        { error: 'Number of chapters must be between 1 and 100' },
        { status: 400 }
      );
    }

    const projectId = uuidv4();
    logger.info('Generated project ID', { projectId });

    const project: NovelProject = {
      _id: projectId,
      genre,
      subgenre,
      totalWordCount,
      numberOfChapters,
      chapterLength,
      premise: premise.trim(),
      outline: [],
      chapters: [],
      status: 'setup',
      currentChapter: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      debugLogs: []
    };

    // Save to database
    const collection = await getProjectsCollection();
    await collection.insertOne(project);

    logger.info('Project created successfully', { projectId, genre, subgenre, numberOfChapters });

    return NextResponse.json(project);
  } catch (error) {
    logger.error('Failed to create project', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Retrieve project
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID required' },
        { status: 400 }
      );
    }

    const collection = await getProjectsCollection();
    const project = await collection.findOne({ _id: projectId });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to retrieve project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update AI prompt configuration
export async function PUT(request: NextRequest) {
  const logger = createProjectLogger('prompt-update');
  
  try {
    logger.info('Updating AI prompt configuration');
    
    const body = await request.json();
    const { basePrompt, vibePrompt, styleInstructions, notes } = body;

    if (!basePrompt && !vibePrompt && !styleInstructions) {
      return NextResponse.json(
        { error: 'At least one prompt field must be provided' },
        { status: 400 }
      );
    }

    const collection = await getPromptConfigCollection();
    const currentConfig = await collection.findOne({ isActive: true });

    if (!currentConfig) {
      return NextResponse.json(
        { error: 'No active prompt configuration found' },
        { status: 404 }
      );
    }

    // Deactivate current config
    await collection.updateOne(
      { _id: currentConfig._id },
      { $set: { isActive: false } }
    );

    // Create new version with updates
    const updates: Partial<typeof currentConfig> = {};
    if (basePrompt) updates.basePrompt = basePrompt;
    if (vibePrompt) updates.vibePrompt = vibePrompt;
    if (styleInstructions) updates.styleInstructions = styleInstructions;

    const newConfig = {
      ...currentConfig,
      ...updates,
      version: currentConfig.version + 1,
      isActive: true,
      createdAt: new Date(),
      notes: notes || `Updated from version ${currentConfig.version}`,
    };
    
    // Remove _id from the object to create a new document
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...configWithoutId } = newConfig;

    await collection.insertOne(configWithoutId);

    logger.info(`AI prompt configuration updated to version ${newConfig.version}`, { 
      updates: Object.keys(updates),
      notes 
    });

    return NextResponse.json({
      success: true,
      version: newConfig.version,
      message: 'AI prompt configuration updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update AI prompt configuration', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
