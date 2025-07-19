'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [partialOutline, setPartialOutline] = useState<string[]>([]);
  const [generationProgress, setGenerationProgress] = useState<{progress: number, message: string} | null>(null);
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
    // Handle numeric fields with validation
    if (field === 'totalWordCount' || field === 'numberOfChapters') {
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      // Only update if it's a valid number, otherwise keep current value
      if (!isNaN(numValue) && numValue > 0) {
        setFormData(prev => ({ ...prev, [field]: numValue }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const savePremise = async () => {
    try {
      setDebugLogs(prev => [...prev, '🔄 Attempting to save premise...']);
      setDebugLogs(prev => [...prev, `📊 Form data: ${JSON.stringify({
        genre: formData.genre,
        subgenre: formData.subgenre,
        totalWordCount: formData.totalWordCount,
        numberOfChapters: formData.numberOfChapters,
        chapterLength: formData.chapterLength,
        premiseLength: formData.premise.length
      })}`]);

      const response = await fetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      setDebugLogs(prev => [...prev, `📡 Response status: ${response.status}`]);

      if (!response.ok) {
        const errorText = await response.text();
        setDebugLogs(prev => [...prev, `❌ Response error: ${errorText}`]);
        throw new Error(`Failed to save premise: ${response.status} - ${errorText}`);
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

  const checkProjectStatus = useCallback(async () => {
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
          setPartialOutline([]);
          setGenerationProgress(null);
          setDebugLogs(prev => [...prev, `✅ Found ${updatedProject.outline.length} chapter outlines!`]);
        } else if (updatedProject.partialOutline && updatedProject.partialOutline.length > 0) {
          setPartialOutline(updatedProject.partialOutline);
          setGenerationProgress(updatedProject.generationProgress || null);
          setDebugLogs(prev => [...prev, `🔄 Partial outline: ${updatedProject.partialOutline.length} chapters completed`]);
        } else if (updatedProject.generationProgress) {
          setGenerationProgress(updatedProject.generationProgress);
          setDebugLogs(prev => [...prev, `ℹ️ ${updatedProject.generationProgress.message}`]);
        } else {
          setDebugLogs(prev => [...prev, `ℹ️ Status: ${updatedProject.status} - No outline yet`]);
        }
      } else {
        setDebugLogs(prev => [...prev, `❌ Error checking status: ${response.status}`]);
      }
    } catch (error) {
      setDebugLogs(prev => [...prev, `❌ Error checking project status: ${error}`]);
    }
  }, [project]);

  const resetStuckGeneration = async () => {
    if (!project) return;

    try {
      setDebugLogs(prev => [...prev, '🔄 Resetting stuck generation...']);
      
      const response = await fetch(`/api/project/${project._id}/outline`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        setDebugLogs(prev => [...prev, `✅ ${data.message}`]);
        
        // Clear local state
        setOutline([]);
        setPartialOutline([]);
        setGenerationProgress(null);
        setProgress({ isGenerating: false, stage: null, currentChapter: 0, totalChapters: 0, message: '' });
        
        // Refresh project status
        await checkProjectStatus();
      } else {
        setDebugLogs(prev => [...prev, `❌ Failed to reset: ${response.status}`]);
      }
    } catch (error) {
      setDebugLogs(prev => [...prev, `❌ Error resetting generation: ${error}`]);
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
  }, [project, outline.length, progress.isGenerating, checkProjectStatus]);

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
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Main Interface */}
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
                onChange={(e) => handleInputChange('totalWordCount', e.target.value)}
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
                onChange={(e) => handleInputChange('numberOfChapters', e.target.value)}
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
              <div className="flex items-center gap-3">
                {project.status === 'drafting' && (
                  <button
                    onClick={resetStuckGeneration}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    Reset Generation
                  </button>
                )}
                <div className="text-sm">
                  <span className="bg-gray-100 px-3 py-1 rounded-full">
                    Status: <span className="font-semibold">{project.status}</span>
                  </span>
                </div>
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

        {/* Right Column - Progressive Outline Display */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Chapter Outline</h2>
            
            {/* No outline state */}
            {outline.length === 0 && partialOutline.length === 0 && !progress.isGenerating && !generationProgress && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">Generate an outline to see chapters appear here</p>
                <p className="text-gray-400 text-sm mt-2">Chapters will appear progressively as they&apos;re generated</p>
              </div>
            )}

            {/* Partial outline display (during generation) */}
            {partialOutline.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4 p-3 bg-green-50 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900">Generation in Progress</h3>
                  <div className="flex items-center space-x-2">
                    <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-700 font-medium">{partialOutline.length} of {project?.numberOfChapters || 0}</span>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {partialOutline.map((chapter, index) => (
                    <div key={index} className="border-l-4 border-green-500 pl-4 py-3 bg-green-50 rounded-r-md">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">Chapter {index + 1}</h4>
                        <span className="text-xs text-green-600 font-medium">✓ Complete</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{chapter}</p>
                    </div>
                  ))}
                  
                  {/* Show remaining chapters as placeholders */}
                  {project && Array.from({ length: project.numberOfChapters - partialOutline.length }, (_, index) => (
                    <div key={index + partialOutline.length} className="border-l-4 border-gray-300 pl-4 py-3 bg-gray-50 rounded-r-md opacity-60">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-400">Chapter {partialOutline.length + index + 1}</h4>
                        <span className="text-xs text-gray-400">Pending...</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse w-2 h-2 bg-gray-400 rounded-full"></div>
                        <p className="text-sm text-gray-400">Generating...</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Complete outline display */}
            {outline.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900">Complete Outline</h3>
                  <span className="text-sm text-blue-700 font-medium">✅ {outline.length} chapters</span>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {outline.map((chapter, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 rounded-r-md">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">Chapter {index + 1}</h4>
                        <span className="text-xs text-blue-600 font-medium">✓ Ready</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{chapter}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generation status indicator */}
            {(progress.isGenerating || generationProgress) && outline.length === 0 && partialOutline.length === 0 && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">
                  {generationProgress?.message || progress.message || 'Starting generation...'}
                </p>
                {generationProgress && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${generationProgress.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{generationProgress.progress}% complete</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
