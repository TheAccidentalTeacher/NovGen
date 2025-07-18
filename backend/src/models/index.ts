import mongoose, { Schema, Document } from 'mongoose';

// Novel document interface
export interface INovel extends Document {
  _id: string;
  title: string;
  genre: string;
  subgenre: string;
  synopsis: string;
  wordCount: number;
  chapters: number;
  targetChapterLength: number;
  wordCountVariance: number;
  fictionLength: string;
  status: 'generating' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  outline?: Array<{
    title: string;
    summary: string;
  }>;
}

// Chapter document interface
export interface IChapter extends Document {
  novelId: string;
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  summary?: string;
  createdAt: Date;
}

// Job document interface
export interface IJob extends Document {
  _id: string;
  novelId: string;
  status: 'pending' | 'outline' | 'generating' | 'completed' | 'failed';
  parameters: {
    title: string;
    genre: string;
    subgenre: string;
    synopsis: string;
    wordCount: number;
    chapters: number;
    targetChapterLength: number;
    wordCountVariance: number;
    fictionLength: string;
  };
  currentChapter: number;
  totalChapters: number;
  progress: number;
  startTime: Date;
  lastActivity: Date;
  completedAt?: Date;
  error?: string;
}

// Novel Schema
const NovelSchema = new Schema<INovel>({
  _id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  genre: {
    type: String,
    required: true,
    enum: [
      'SCIENCE_FICTION',
      'FANTASY',
      'ROMANCE',
      'MYSTERY',
      'THRILLER',
      'HORROR',
      'ADVENTURE',
      'HISTORICAL_FICTION',
      'LITERARY_FICTION',
      'WESTERN',
      'YOUNG_ADULT'
    ]
  },
  subgenre: {
    type: String,
    required: true
  },
  synopsis: {
    type: String,
    required: true,
    maxlength: 10000
  },
  wordCount: {
    type: Number,
    required: true,
    min: 10000,
    max: 500000
  },
  chapters: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  targetChapterLength: {
    type: Number,
    required: true,
    min: 500,
    max: 10000
  },
  wordCountVariance: {
    type: Number,
    required: true,
    min: 0
  },
  fictionLength: {
    type: String,
    required: true,
    enum: ['novella', 'novel', 'epic']
  },
  status: {
    type: String,
    required: true,
    enum: ['generating', 'completed', 'failed'],
    default: 'generating'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  outline: [{
    title: {
      type: String,
      required: true
    },
    summary: {
      type: String,
      required: true
    }
  }]
}, {
  collection: 'novels',
  timestamps: false
});

// Chapter Schema
const ChapterSchema = new Schema<IChapter>({
  novelId: {
    type: String,
    required: true,
    ref: 'Novel'
  },
  chapterNumber: {
    type: Number,
    required: true,
    min: 1
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 100000 // Approximately 100k characters max per chapter
  },
  wordCount: {
    type: Number,
    required: true,
    min: 0
  },
  summary: {
    type: String,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'chapters',
  timestamps: false
});

// Job Schema
const JobSchema = new Schema<IJob>({
  _id: {
    type: String,
    required: true
  },
  novelId: {
    type: String,
    required: true,
    ref: 'Novel'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'outline', 'generating', 'completed', 'failed'],
    default: 'pending'
  },
  parameters: {
    title: {
      type: String,
      required: true
    },
    genre: {
      type: String,
      required: true
    },
    subgenre: {
      type: String,
      required: true
    },
    synopsis: {
      type: String,
      required: true
    },
    wordCount: {
      type: Number,
      required: true
    },
    chapters: {
      type: Number,
      required: true
    },
    targetChapterLength: {
      type: Number,
      required: true
    },
    wordCountVariance: {
      type: Number,
      required: true
    },
    fictionLength: {
      type: String,
      required: true
    }
  },
  currentChapter: {
    type: Number,
    required: true,
    default: 0
  },
  totalChapters: {
    type: Number,
    required: true
  },
  progress: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  error: {
    type: String,
    maxlength: 1000
  }
}, {
  collection: 'jobs',
  timestamps: false
});

// Indexes for performance
NovelSchema.index({ status: 1, createdAt: -1 });
NovelSchema.index({ genre: 1, subgenre: 1 });

ChapterSchema.index({ novelId: 1, chapterNumber: 1 }, { unique: true });
ChapterSchema.index({ novelId: 1 });

JobSchema.index({ status: 1, lastActivity: -1 });
JobSchema.index({ novelId: 1 });

// Pre-save middleware for validation
NovelSchema.pre('save', function(next) {
  // Validate word count variance is reasonable
  if (this.wordCountVariance > this.targetChapterLength * 0.5) {
    next(new Error('Word count variance too large'));
  } else {
    next();
  }
});

ChapterSchema.pre('save', function(next) {
  // Update word count based on content if not set
  if (!this.wordCount && this.content) {
    this.wordCount = this.content.split(/\s+/).filter(word => word.length > 0).length;
  }
  next();
});

JobSchema.pre('save', function(next) {
  // Update lastActivity timestamp
  this.lastActivity = new Date();
  next();
});

// Instance methods
NovelSchema.methods.calculateExpectedWordCount = function(): number {
  return this.chapters * this.targetChapterLength;
};

NovelSchema.methods.getProgress = function(): number {
  // This would be calculated based on completed chapters
  return 0; // Placeholder
};

ChapterSchema.methods.getWordCount = function(): number {
  return this.content.split(/\s+/).filter(word => word.length > 0).length;
};

// Static methods
NovelSchema.statics.findByGenre = function(genre: string, subgenre?: string) {
  const query: any = { genre };
  if (subgenre) {
    query.subgenre = subgenre;
  }
  return this.find(query).sort({ createdAt: -1 });
};

ChapterSchema.statics.findByNovel = function(novelId: string) {
  return this.find({ novelId }).sort({ chapterNumber: 1 });
};

JobSchema.statics.findActive = function() {
  return this.find({
    status: { $in: ['pending', 'outline', 'generating'] }
  }).sort({ lastActivity: -1 });
};

JobSchema.statics.findCompleted = function() {
  return this.find({
    status: { $in: ['completed', 'failed'] }
  }).sort({ completedAt: -1 });
};

// Export models
export const Novel = mongoose.model<INovel>('Novel', NovelSchema);
export const Chapter = mongoose.model<IChapter>('Chapter', ChapterSchema);
export const Job = mongoose.model<IJob>('Job', JobSchema);

// Export schemas for potential reuse
export { NovelSchema, ChapterSchema, JobSchema };
