import React from 'react'
import { useParams } from 'react-router-dom'

const ProgressPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>()

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Generation Progress
        </h1>
        
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600 mb-4">
            Job ID: <code className="bg-gray-100 px-2 py-1 rounded">{jobId}</code>
          </p>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Progress Tracking
              </h3>
              <p className="text-gray-600">
                This page will show real-time progress updates including:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                <li>Outline generation status</li>
                <li>Chapter-by-chapter progress</li>
                <li>Word count tracking</li>
                <li>Streaming generation updates</li>
                <li>Error handling and retry status</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProgressPage
