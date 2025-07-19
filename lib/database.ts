import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

// Global logger for database operations
class DatabaseLogger {
  info(message: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Database] ${message}`, data ? JSON.stringify(data) : '');
    }
  }
  
  error(message: string, error?: Error | unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Database] ${message}:`, errorMsg);
    }
    // In production, we might want to send to external logging service
  }
}

const dbLogger = new DatabaseLogger();

let client: MongoClient;
let db: Db;

export interface NovelProject {
  _id?: ObjectId | string;
  genre: string;
  subgenre: string;
  totalWordCount: number;
  numberOfChapters: number;
  chapterLength: number;
  premise: string;
  outline: string[];
  chapters: Chapter[];
  status: 'setup' | 'outline' | 'drafting' | 'completed';
  currentChapter: number;
  createdAt: Date;
  updatedAt: Date;
  debugLogs: DebugLog[];
}

export interface Chapter {
  chapterNumber: number;
  title?: string;
  content: string;
  wordCount: number;
  generatedAt: Date;
  regenerated: boolean;
  regenerationCount: number;
}

export interface DebugLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  data?: Record<string, unknown>;
}

export interface AIPromptConfig {
  _id?: ObjectId | string;
  version: number;
  basePrompt: string;
  vibePrompt: string;
  styleInstructions: string;
  isActive: boolean;
  createdAt: Date;
  notes?: string;
}

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    client = new MongoClient(uri);
    await client.connect();
    db = client.db('novgen');
    
    dbLogger.info('Connected to MongoDB');
    return db;
  } catch (error) {
    dbLogger.error('MongoDB connection failed', error);
    throw error;
  }
}

export async function getProjectsCollection(): Promise<Collection<NovelProject>> {
  const database = await connectToDatabase();
  return database.collection<NovelProject>('projects');
}

export async function getPromptConfigCollection(): Promise<Collection<AIPromptConfig>> {
  const database = await connectToDatabase();
  return database.collection<AIPromptConfig>('promptConfigs');
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
  }
}
