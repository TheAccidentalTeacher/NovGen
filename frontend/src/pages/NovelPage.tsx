import React from 'react'
import { useParams } from 'react-router-dom'

const NovelPage: React.FC = () => {
  const { novelId } = useParams<{ novelId: string }>()

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Novel Details
        </h1>
        
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600 mb-4">
            Novel ID: <code className="bg-gray-100 px-2 py-1 rounded">{novelId}</code>
          </p>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Novel Display
              </h3>
              <p className="text-gray-600">
                This page will display the complete generated novel including:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                <li>Novel metadata (title, genre, word count)</li>
                <li>Chapter navigation</li>
                <li>Full chapter content</li>
                <li>Download options (PDF, EPUB, etc.)</li>
                <li>Sharing and export capabilities</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NovelPage
