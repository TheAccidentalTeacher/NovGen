import React from 'react'
import { Link } from 'react-router-dom'

const LibraryPage: React.FC = () => {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Your Novel Library
        </h1>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Generated Novels
              </h3>
              <p className="text-gray-600 mb-4">
                Access and manage all your AI-generated novels in one place.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Placeholder for novel cards */}
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="bg-gray-100 h-32 rounded mb-3 flex items-center justify-center">
                  <span className="text-gray-500">Novel Cover</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Sample Novel Title</h4>
                <p className="text-sm text-gray-600 mb-2">Science Fiction • 45,000 words</p>
                <p className="text-xs text-gray-500 mb-3">Generated on March 15, 2024</p>
                <div className="flex space-x-2">
                  <Link 
                    to="/novel/sample-id" 
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Read
                  </Link>
                  <button className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300">
                    Download
                  </button>
                </div>
              </div>
            </div>
            
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                Your generated novels will appear here.
              </p>
              <Link 
                to="/generate" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Generate Your First Novel
              </Link>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Library Features
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Browse all your generated novels</li>
                <li>Filter by genre, word count, and generation date</li>
                <li>Search through novel titles and content</li>
                <li>Download in multiple formats (PDF, EPUB, DOCX)</li>
                <li>Share novels with others</li>
                <li>Organize novels into collections</li>
                <li>Track reading progress and bookmarks</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LibraryPage
