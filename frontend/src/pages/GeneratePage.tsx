import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface GenerationProgress {
  stage: string;
  progress: number;
  message: string;
}

interface NovelFormData {
  title: string;
  genre: string;
  theme: string;
  tone: string;
  setting: string;
  characterCount: number;
  chapterCount: number;
  description: string;
}

const GeneratePage: React.FC = () => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({ stage: '', progress: 0, message: '' });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  const [formData, setFormData] = useState<NovelFormData>({
    title: '',
    genre: 'fantasy',
    theme: '',
    tone: 'adventurous',
    setting: '',
    characterCount: 3,
    chapterCount: 10,
    description: ''
  });

  const genres = [
    'fantasy', 'science-fiction', 'mystery', 'thriller', 'romance',
    'historical-fiction', 'literary-fiction', 'young-adult', 'horror',
    'adventure', 'dystopian', 'steampunk', 'urban-fantasy', 'space-opera',
    'cyberpunk', 'magical-realism'
  ];

  const tones = [
    'adventurous', 'dark', 'humorous', 'mysterious', 'romantic',
    'epic', 'gritty', 'whimsical', 'serious', 'satirical'
  ];

  // Debug logging
  useEffect(() => {
    console.log('GeneratePage mounted');
    console.log('API Base URL:', import.meta.env.VITE_API_URL || 'http://localhost:5000');
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    console.log(`Input changed: ${name} = ${value}`);
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const validateForm = (): boolean => {
    console.log('Validating form:', formData);
    
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!formData.theme.trim()) {
      setError('Theme is required');
      return false;
    }
    if (!formData.setting.trim()) {
      setError('Setting is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (formData.characterCount < 1 || formData.characterCount > 10) {
      setError('Character count must be between 1 and 10');
      return false;
    }
    if (formData.chapterCount < 1 || formData.chapterCount > 50) {
      setError('Chapter count must be between 1 and 50');
      return false;
    }
    
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted');
    console.log('Form data:', formData);
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    setIsGenerating(true);
    setError('');
    setSuccess('');
    setProgress({ stage: 'Starting', progress: 0, message: 'Initializing novel generation...' });

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const endpoint = `${apiUrl}/api/novels/generate`;
      
      console.log('Making API request to:', endpoint);
      console.log('Request payload:', formData);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('API Success Response:', result);

      if (result.success) {
        setSuccess('Novel generation started successfully!');
        setProgress({ 
          stage: 'In Progress', 
          progress: 10, 
          message: 'Novel generation has begun. You can track progress in the Progress page.' 
        });
        
        // Redirect to progress page after 3 seconds
        setTimeout(() => {
          navigate('/progress');
        }, 3000);
      } else {
        throw new Error(result.message || 'Unknown error occurred');
      }

    } catch (err) {
      console.error('Generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to generate novel: ${errorMessage}`);
      setProgress({ stage: 'Error', progress: 0, message: errorMessage });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    console.log('Resetting form');
    setFormData({
      title: '',
      genre: 'fantasy',
      theme: '',
      tone: 'adventurous',
      setting: '',
      characterCount: 3,
      chapterCount: 10,
      description: ''
    });
    setError('');
    setSuccess('');
    setProgress({ stage: '', progress: 0, message: '' });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Generate Your Novel</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            <strong>Success:</strong> {success}
          </div>
        )}

        {progress.stage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">{progress.stage}</span>
              <span className="text-sm">{progress.progress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress.progress}%` }}
              ></div>
            </div>
            <p className="text-sm">{progress.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Novel Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your novel title"
                required
              />
            </div>

            <div>
              <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-2">
                Genre *
              </label>
              <select
                id="genre"
                name="genre"
                value={formData.genre}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {genres.map(genre => (
                  <option key={genre} value={genre}>
                    {genre.charAt(0).toUpperCase() + genre.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-2">
                Theme *
              </label>
              <input
                type="text"
                id="theme"
                name="theme"
                value={formData.theme}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Good vs Evil, Coming of Age, Redemption"
                required
              />
            </div>

            <div>
              <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-2">
                Tone *
              </label>
              <select
                id="tone"
                name="tone"
                value={formData.tone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {tones.map(tone => (
                  <option key={tone} value={tone}>
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="setting" className="block text-sm font-medium text-gray-700 mb-2">
                Setting *
              </label>
              <input
                type="text"
                id="setting"
                name="setting"
                value={formData.setting}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Medieval kingdom, Modern city, Space station"
                required
              />
            </div>

            <div>
              <label htmlFor="characterCount" className="block text-sm font-medium text-gray-700 mb-2">
                Main Characters (1-10)
              </label>
              <input
                type="number"
                id="characterCount"
                name="characterCount"
                value={formData.characterCount}
                onChange={handleInputChange}
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="chapterCount" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Chapters (1-50)
              </label>
              <input
                type="number"
                id="chapterCount"
                name="chapterCount"
                value={formData.chapterCount}
                onChange={handleInputChange}
                min="1"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Plot Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the main plot, characters, and what you want to happen in your novel..."
              required
            />
          </div>

          <div className="flex gap-4 justify-center pt-6">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
              disabled={isGenerating}
            >
              Reset Form
            </button>
            
            <button
              type="submit"
              disabled={isGenerating}
              className={`px-8 py-3 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                isGenerating
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {isGenerating ? 'Generating...' : 'Generate Novel'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ul className="space-y-1">
            <li>• Fill out all required fields above</li>
            <li>• Click "Generate Novel" to start the AI generation process</li>
            <li>• You'll be redirected to the Progress page to track generation</li>
            <li>• Once complete, your novel will appear in the Library</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GeneratePage;
