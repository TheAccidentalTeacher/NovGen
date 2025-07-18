import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Create axios instance with default config
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 120000, // 2 minutes for generation requests
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login or clear token
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API service methods
export const novelApi = {
  // Get available genres and subgenres
  getGenres: () => api.get('/genres'),

  // Start novel generation
  generateNovel: (data: any) => api.post('/novels/generate', data),

  // Get job status
  getJobStatus: (jobId: string) => api.get(`/jobs/${jobId}/status`),

  // Calculate chapter configuration
  calculateChapters: (wordCount: number, targetChapterLength: number) =>
    api.get('/novels/calculate', {
      params: { wordCount, targetChapterLength }
    }),

  // Upload synopsis file
  uploadSynopsis: (file: File) => {
    const formData = new FormData()
    formData.append('synopsis', file)
    return api.post('/upload/synopsis', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Get novel details
  getNovel: (novelId: string) => api.get(`/novels/${novelId}`),

  // List user's novels
  listNovels: (params?: any) => api.get('/novels', { params }),
}

// Progress streaming utility
export const createProgressStream = (jobId: string): EventSource => {
  const eventSource = new EventSource(`${API_URL}/api/jobs/${jobId}/stream`)
  return eventSource
}

export default api
