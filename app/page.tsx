'use client';

import { useState, useEffect, useMemo } from 'react';
import { genres } from '@/lib/genres';
import { NovelProject } from '@/lib/database';

interface FormData {
  genre: string;
  subgenre: string;
  totalWordCount: number;
  numberOfChapters: number;
  chapterLength: number;
  premise: string;
}

interface ProgressState {
  isGenerating: boolean;
  stage: 'outline' | 'chapters' | 'complete' | null;
  currentChapter: number;
  totalChapters: number;
  message: string;
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    genre: 'Christian',
    subgenre: '',
    totalWordCount: 50000,
    numberOfChapters: 20,
    chapterLength: 1600,
    premise: ''
  });

  const [project, setProject] = useState<NovelProject | null>(null);
  const [outline, setOutline] = useState<string[]>([]);
  const [progress, setProgress] = useState<ProgressState>({
    isGenerating: false,
    stage: null,
    currentChapter: 0,
    totalChapters: 0,
    message: ''
  });
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Load existing project from localStorage on page load
  useEffect(() => {
    const loadSavedProject = async () => {
      const savedProjectId = localStorage.getItem('currentProjectId');
      if (savedProjectId) {
        try {
          setDebugLogs(prev => [...prev, `🔄 Loading saved project: ${savedProjectId}`]);
          
          const response = await fetch(`/api/project/${savedProjectId}`);
          if (response.ok) {
            const savedProject = await response.json();
            setProject(savedProject);
            
            // Restore outline if it exists
            if (savedProject.outline && savedProject.outline.length > 0) {
              setOutline(savedProject.outline);
            }
            
            // Update form data to match saved project
            setFormData({
              genre: savedProject.genre,
              subgenre: savedProject.subgenre,
              totalWordCount: savedProject.totalWordCount,
              numberOfChapters: savedProject.numberOfChapters,
              chapterLength: savedProject.chapterLength,
              premise: savedProject.premise
            });
            
            setDebugLogs(prev => [...prev, `✅ Restored project: ${savedProject.genre}/${savedProject.subgenre} - ${savedProject.numberOfChapters} chapters`]);
          } else {
            // Project not found, clear localStorage
            localStorage.removeItem('currentProjectId');
            setDebugLogs(prev => [...prev, `⚠️ Saved project not found, starting fresh`]);
          }
        } catch (error) {
          localStorage.removeItem('currentProjectId');
          setDebugLogs(prev => [...prev, `❌ Error loading saved project: ${error}`]);
        }
      }
    };
    
    loadSavedProject();
  }, []);

  // Auto-calculate chapter length based on total word count and number of chapters
  useEffect(() => {
    if (formData.numberOfChapters > 0) {
      const calculatedLength = Math.round(formData.totalWordCount / formData.numberOfChapters);
      setFormData(prev => ({ ...prev, chapterLength: calculatedLength }));
    }
  }, [formData.totalWordCount, formData.numberOfChapters]);

  // Get available subgenres for selected genre
  const availableSubgenres = useMemo(() => 
    genres.find(g => g.genre === formData.genre)?.subgenres || [], 
    [formData.genre]
  );

  // Auto-select first subgenre when genre changes
  useEffect(() => {
    if (availableSubgenres.length > 0 && !availableSubgenres.includes(formData.subgenre)) {
      setFormData(prev => ({ ...prev, subgenre: availableSubgenres[0] }));
    }
  }, [formData.genre, availableSubgenres, formData.subgenre]);

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const savePremise = async () => {
    try {
      const response = await fetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save premise');
      }

      const savedProject = await response.json();
      setProject(savedProject);
      
      // Save project ID to localStorage for persistence across refreshes
      localStorage.setItem('currentProjectId', savedProject._id);
      
      // Add to debug logs
      setDebugLogs(prev => [...prev, `✅ Premise saved successfully - Project ID: ${savedProject._id}`]);
    } catch (error) {
      setDebugLogs(prev => [...prev, `❌ Error saving premise: ${error}`]);
    }
  };

  const generateOutline = async () => {
    if (!project) return;

    setProgress({ isGenerating: true, stage: 'outline', currentChapter: 0, totalChapters: 0, message: 'Starting outline generation...' });
    setDebugLogs(prev => [...prev, '🔄 Starting outline generation...']);

    try {
      const response = await fetch(`/api/project/${project._id}/outline`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to generate outline');
      }

      const data = await response.json();
      setDebugLogs(prev => [...prev, `✅ ${data.message}`]);
      
      // Handle different response types
      if (data.outline) {
        // Small novel - outline generated immediately
        setOutline(data.outline);
        setProgress({ isGenerating: false, stage: null, currentChapter: 0, totalChapters: 0, message: '' });
      } else {
        // Large novel - background processing
        setProgress({ isGenerating: false, stage: null, currentChapter: 0, totalChapters: 0, message: data.note || 'Check back in 60-90 seconds' });
        if (data.note) {
          setDebugLogs(prev => [...prev, `ℹ️ ${data.note}`]);
        }
      }

    } catch (error) {
      setDebugLogs(prev => [...prev, `❌ Error generating outline: ${error}`]);
      setProgress({ isGenerating: false, stage: null, currentChapter: 0, totalChapters: 0, message: '' });
    }
  };

  const draftChapters = async () => {
    if (!project) return;

    setProgress({ 
      isGenerating: true, 
      stage: 'chapters', 
      currentChapter: 0, 
      totalChapters: project.numberOfChapters, 
      message: 'Starting chapter generation...' 
    });
    setDebugLogs(prev => [...prev, '🔄 Starting chapter generation...']);

    try {
      const response = await fetch(`/api/project/${project._id}/chapters`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to start chapter generation');
      }

      // Poll for progress updates
      const pollProgress = setInterval(async () => {
        try {
          const progressResponse = await fetch(`/api/project/${project._id}/progress`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            
            setProgress({
              isGenerating: progressData.isGenerating,
              stage: progressData.stage,
              currentChapter: progressData.currentChapter,
              totalChapters: progressData.totalChapters,
              message: progressData.message
            });

            if (progressData.debugLogs && progressData.debugLogs.length > 0) {
              setDebugLogs(prev => [...prev, ...progressData.debugLogs]);
            }

            if (!progressData.isGenerating) {
              clearInterval(pollProgress);
              if (progressData.stage === 'complete') {
                setDebugLogs(prev => [...prev, '✅ All chapters generated successfully!']);
                
                // Refresh project data
                const updatedProject = await fetch(`/api/project/${project._id}`);
                if (updatedProject.ok) {
                  const updated = await updatedProject.json();
                  setProject(updated);
                }
              }
            }
          }
        } catch (error) {
          setDebugLogs(prev => [...prev, `❌ Error polling progress: ${error}`]);
        }
      }, 2000); // Poll every 2 seconds

    } catch (error) {
      setDebugLogs(prev => [...prev, `❌ Error starting chapter generation: ${error}`]);
      setProgress({ isGenerating: false, stage: null, currentChapter: 0, totalChapters: 0, message: '' });
    }
  };

  const checkProjectStatus = async () => {
    if (!project) return;

    try {
      setDebugLogs(prev => [...prev, '🔄 Checking project status...']);
      
      const response = await fetch(`/api/project/${project._id}`);
      if (response.ok) {
        const updatedProject = await response.json();
        setProject(updatedProject);
        
        // Update outline if it exists
        if (updatedProject.outline && updatedProject.outline.length > 0) {
          setOutline(updatedProject.outline);
          setDebugLogs(prev => [...prev, `✅ Found ${updatedProject.outline.length} chapter outlines!`]);
        } else {
          setDebugLogs(prev => [...prev, `ℹ️ Status: ${updatedProject.status} - No outline yet`]);
        }
      } else {
        setDebugLogs(prev => [...prev, `❌ Error checking status: ${response.status}`]);
      }
    } catch (error) {
      setDebugLogs(prev => [...prev, `❌ Error checking project status: ${error}`]);
    }
  };

  // Auto-check project status every 30 seconds when project exists but no outline
  useEffect(() => {
    if (project && outline.length === 0 && !progress.isGenerating) {
      const interval = setInterval(() => {
        checkProjectStatus();
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, [project, outline.length, progress.isGenerating]);

  const clearProject = () => {
    // Clear all state
    setProject(null);
    setOutline([]);
    setProgress({ isGenerating: false, stage: null, currentChapter: 0, totalChapters: 0, message: '' });
    
    // Clear localStorage
    localStorage.removeItem('currentProjectId');
    
    // Reset form to defaults
    setFormData({
      genre: 'Christian',
      subgenre: '',
      totalWordCount: 50000,
      numberOfChapters: 20,
      chapterLength: 1600,
      premise: ''
    });
    
    setDebugLogs(prev => [...prev, '🔄 Project cleared - starting fresh']);
  };

  const exportNovel = async () => {
    if (!project) return;

    try {
      setDebugLogs(prev => [...prev, '🔄 Starting novel export...']);
      
      const response = await fetch(`/api/project/${project._id}/export`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to export novel');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.genre}_Novel_${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDebugLogs(prev => [...prev, '✅ Novel exported successfully!']);
    } catch (error) {
      setDebugLogs(prev => [...prev, `❌ Error exporting novel: ${error}`]);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Novel Generator
        </h1>

        {/* Project Setup Form */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Genre Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genre
              </label>
              <select
                value={formData.genre}
                onChange={(e) => handleInputChange('genre', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={project !== null}
              >
                {genres.map(g => (
                  <option key={g.genre} value={g.genre}>{g.genre}</option>
                ))}
              </select>
            </div>

            {/* Subgenre Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subgenre
              </label>
              <select
                value={formData.subgenre}
                onChange={(e) => handleInputChange('subgenre', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={project !== null}
              >
                {availableSubgenres.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Word Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Word Count
              </label>
              <input
                type="number"
                min="20000"
                max="200000"
                step="1000"
                value={formData.totalWordCount}
                onChange={(e) => handleInputChange('totalWordCount', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={project !== null}
              />
            </div>

            {/* Number of Chapters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Chapters
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.numberOfChapters}
                onChange={(e) => handleInputChange('numberOfChapters', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={project !== null}
              />
            </div>

            {/* Chapter Length */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Average Chapter Length
              </label>
              <input
                type="number"
                value={formData.chapterLength}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                readOnly
              />
            </div>
          </div>

          {/* Premise */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Premise/Synopsis (up to 10,000 words)
            </label>
            <textarea
              value={formData.premise}
              onChange={(e) => handleInputChange('premise', e.target.value)}
              maxLength={60000}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your novel's premise, plot outline, character descriptions, and any other details..."
              disabled={project !== null}
            />
            <div className="text-sm text-gray-500 mt-1">
              {formData.premise.split(/\s+/).filter(word => word.length > 0).length}/10,000 words (~{formData.premise.length}/60,000 characters)
            </div>
          </div>

          {/* Save Premise Button */}
          {!project && (
            <div className="text-center">
              <button
                onClick={savePremise}
                disabled={!formData.premise.trim() || progress.isGenerating}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Save Premise
              </button>
            </div>
          )}

          {/* Clear Project Button */}
          {project && (
            <div className="text-center">
              <button
                onClick={clearProject}
                className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Start New Project
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Current Project: {project.genre}/{project.subgenre} - {project.numberOfChapters} chapters
              </p>
            </div>
          )}
        </div>

        {/* Outline Section */}
        {project && (
          <div className="mt-8 border-t pt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Outline Generation</h2>
              <div className="text-sm">
                <span className="bg-gray-100 px-3 py-1 rounded-full">
                  Status: <span className="font-semibold">{project.status}</span>
                </span>
              </div>
            </div>
            
            {outline.length === 0 ? (
              <div className="text-center space-y-4">
                <button
                  onClick={generateOutline}
                  disabled={progress.isGenerating}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mr-4"
                >
                  {progress.stage === 'outline' ? 'Generating Outline...' : 'Generate Outline'}
                </button>
                <button
                  onClick={checkProjectStatus}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Check Status
                </button>
                <div className="text-sm text-gray-600 mt-2">
                  Click &quot;Check Status&quot; to see if background generation completed
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-gray-50 rounded-lg p-6 mb-4">
                  <h3 className="text-lg font-semibold mb-3">Chapter Outline:</h3>
                  <div className="space-y-3">
                    {outline.map((summary, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <div className="font-medium text-gray-700">Chapter {index + 1}</div>
                        <div className="text-gray-600">{summary}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Draft Chapters Button */}
                <div className="text-center">
                  <button
                    onClick={draftChapters}
                    disabled={progress.isGenerating}
                    className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {progress.stage === 'chapters' ? 'Drafting Chapters...' : 'Draft Chapters'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress Indicator */}
        {progress.isGenerating && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-800">
                {progress.stage === 'outline' ? 'Generating Outline' : 'Generating Chapters'}
              </h3>
              <div className="text-blue-600">
                {progress.stage === 'chapters' && `${progress.currentChapter}/${progress.totalChapters}`}
              </div>
            </div>
            
            {progress.stage === 'chapters' && (
              <div className="w-full bg-blue-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.currentChapter / progress.totalChapters) * 100}%` }}
                ></div>
              </div>
            )}

            <div className="text-blue-700">{progress.message}</div>

            {/* Spinning indicator */}
            <div className="flex items-center mt-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-blue-600">Processing...</span>
            </div>
          </div>
        )}

        {/* Export Section */}
        {project && project.status === 'completed' && (
          <div className="mt-8 border-t pt-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Export Novel</h2>
              <div className="mb-4">
                <div className="text-gray-600">
                  {project.chapters.length} chapters complete
                  ({project.chapters.reduce((sum, ch) => sum + ch.wordCount, 0).toLocaleString()} words)
                </div>
              </div>
              <button
                onClick={exportNovel}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Download as DOCX
              </button>
            </div>
          </div>
        )}

        {/* Debug Logs */}
        <div className="mt-8 border-t pt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Debug Console</h2>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showLogs ? 'Hide' : 'Show'} Logs ({debugLogs.length})
            </button>
          </div>
          
          {showLogs && (
            <div className="bg-black text-green-400 rounded-lg p-4 font-mono text-sm max-h-60 overflow-y-auto">
              {debugLogs.length === 0 ? (
                <div className="text-gray-500">No logs yet...</div>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-400">{new Date().toLocaleTimeString()}</span> {log}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
