import { MongoClient, Db, Collection } from 'mongodb';

let client: MongoClient;
let db: Db;

export interface NovelProject {
  _id?: string;
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
  _id?: string;
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
    
    console.log('✅ Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
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
