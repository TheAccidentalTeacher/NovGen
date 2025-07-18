import React from 'react'

const GeneratePage: React.FC = () => {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Generate Novel
        </h1>
        
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600 mb-4">
            Novel generation interface coming soon! This will include:
          </p>
          
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Genre and subgenre selection</li>
            <li>Synopsis file upload (up to 10,000 words)</li>
            <li>Word count and chapter configuration</li>
            <li>Real-time generation progress</li>
            <li>Streaming chapter updates</li>
          </ul>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              💡 The backend API is fully functional with all generation capabilities. 
              Frontend components are being built to provide the complete user interface.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GeneratePage
