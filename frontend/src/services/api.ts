// API configuration and utilities for NovGen frontend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface Novel {
  _id: string;
  title: string;
  genre: string;
  theme: string;
  tone: string;
  setting: string;
  characterCount: number;
  chapterCount: number;
  description: string;
  status: 'draft' | 'generating' | 'completed' | 'error';
  createdAt: string;
  updatedAt: string;
  chapters?: Chapter[];
  progress?: GenerationProgress;
}

export interface Chapter {
  _id: string;
  novelId: string;
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationProgress {
  stage: string;
  progress: number;
  message: string;
  currentChapter?: number;
  totalChapters?: number;
}

export interface NovelGenerationRequest {
  title: string;
  genre: string;
  theme: string;
  tone: string;
  setting: string;
  characterCount: number;
  chapterCount: number;
  description: string;
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Novel API functions
export const novelApi = {
  // Get all novels
  getAll: (): Promise<ApiResponse<Novel[]>> => {
    return apiRequest<Novel[]>('/api/novels');
  },

  // Get novel by ID
  getById: (id: string): Promise<ApiResponse<Novel>> => {
    return apiRequest<Novel>(`/api/novels/${id}`);
  },

  // Generate new novel
  generate: (request: NovelGenerationRequest): Promise<ApiResponse<{ novelId: string }>> => {
    return apiRequest<{ novelId: string }>('/api/novels/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // Delete novel
  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/api/novels/${id}`, {
      method: 'DELETE',
    });
  },

  // Get generation progress
  getProgress: (id: string): Promise<ApiResponse<GenerationProgress>> => {
    return apiRequest<GenerationProgress>(`/api/novels/${id}/progress`);
  },
};

// Chapter API functions
export const chapterApi = {
  // Get chapters for a novel
  getByNovelId: (novelId: string): Promise<ApiResponse<Chapter[]>> => {
    return apiRequest<Chapter[]>(`/api/novels/${novelId}/chapters`);
  },

  // Get specific chapter
  getById: (novelId: string, chapterId: string): Promise<ApiResponse<Chapter>> => {
    return apiRequest<Chapter>(`/api/novels/${novelId}/chapters/${chapterId}`);
  },
};

// Health check
export const healthApi = {
  check: (): Promise<ApiResponse<{ status: string; timestamp: string }>> => {
    return apiRequest<{ status: string; timestamp: string }>('/api/health');
  },
};

export default {
  novelApi,
  chapterApi,
  healthApi,
};
