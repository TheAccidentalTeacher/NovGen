import mongoose, { Schema, Document } from 'mongoose';

// Novel Schema
export interface INovel extends Document {
  userId: string;
  title: string;
  genre: string;
  subgenre: string;
  targetWordCount: number;
  totalWordCount?: number;
  summary: string;
  description?: string;
  characterDescriptions: string;
  plotOutline: string;
  tone: string;
  style: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  progress: number;
  characters?: Array<{
    name: string;
    description: string;
    role: string;
    arc: string;
    relationships: string[];
  }>;
  themes?: string[];
  plotPoints?: string[];
  chapterOutlines?: Array<{
    chapterNumber: number;
    title: string;
    summary: string;
    keyEvents: string[];
    characterDevelopment: string[];
    wordCount: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const NovelSchema = new Schema<INovel>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  genre: { type: String, required: true },
  subgenre: { type: String, required: true },
  targetWordCount: { type: Number, required: true },
  totalWordCount: { type: Number, default: 0 },
  summary: { type: String, required: true },
  description: { type: String },
  characterDescriptions: { type: String },
  plotOutline: { type: String },
  tone: { type: String },
  style: { type: String },
  status: { 
    type: String, 
    enum: ['draft', 'generating', 'completed', 'failed'],
    default: 'draft'
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  characters: [{
    name: String,
    description: String,
    role: String,
    arc: String,
    relationships: [String]
  }],
  themes: [String],
  plotPoints: [String],
  chapterOutlines: [{
    chapterNumber: Number,
    title: String,
    summary: String,
    keyEvents: [String],
    characterDevelopment: [String],
    wordCount: Number
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

// Chapter Schema
export interface IChapter extends Document {
  novelId: string;
  chapterNumber: number;
  title: string;
  content: string;
  originalContent?: string;
  wordCount: number;
  enhancementType?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChapterSchema = new Schema<IChapter>({
  novelId: { type: String, required: true, index: true },
  chapterNumber: { type: Number, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  originalContent: { type: String },
  wordCount: { type: Number, default: 0 },
  enhancementType: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Generation Job Schema
export interface IGenerationJob extends Document {
  novelId: string;
  userId: string;
  status: 'pending' | 'generating_outline' | 'generating_chapters' | 'completed' | 'failed';
  currentStep: string;
  totalChapters: number;
  completedChapters: number;
  percentComplete: number;
  estimatedTimeRemaining?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GenerationJobSchema = new Schema<IGenerationJob>({
  novelId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: ['pending', 'generating_outline', 'generating_chapters', 'completed', 'failed'],
    default: 'pending'
  },
  currentStep: { type: String, required: true },
  totalChapters: { type: Number, required: true },
  completedChapters: { type: Number, default: 0 },
  percentComplete: { type: Number, default: 0, min: 0, max: 100 },
  estimatedTimeRemaining: { type: String },
  error: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// User Schema (simplified for novel generation)
export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  generationsUsed: number;
  generationsLimit: number;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date },
  subscriptionTier: { 
    type: String, 
    enum: ['free', 'premium', 'enterprise'],
    default: 'free'
  },
  generationsUsed: { type: Number, default: 0 },
  generationsLimit: { type: Number, default: 3 } // Free tier limit
});

// Add indexes for better performance
NovelSchema.index({ userId: 1, createdAt: -1 });
NovelSchema.index({ status: 1 });
ChapterSchema.index({ novelId: 1, chapterNumber: 1 });
GenerationJobSchema.index({ userId: 1, createdAt: -1 });
GenerationJobSchema.index({ status: 1 });

// Export models
export const Novel = mongoose.model<INovel>('Novel', NovelSchema);
export const Chapter = mongoose.model<IChapter>('Chapter', ChapterSchema);
export const GenerationJob = mongoose.model<IGenerationJob>('GenerationJob', GenerationJobSchema);
export const User = mongoose.model<IUser>('User', UserSchema);
