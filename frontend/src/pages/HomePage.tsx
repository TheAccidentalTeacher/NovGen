import React from 'react'

const HomePage: React.FC = () => {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-6xl">
          Somers Novel Generator
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
          Create sophisticated AI-powered novels with genre-aware prompting. 
          Choose from 15+ genres and 150+ subgenres for truly customized fiction.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <a
            href="/generate"
            className="rounded-md bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            Start Generating
          </a>
          <a
            href="/library"
            className="text-sm font-semibold leading-6 text-gray-900"
          >
            View Library <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
      
      <div className="mt-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              15+ Genres
            </h3>
            <p className="text-gray-600">
              From Science Fiction to Romance, each with specialized AI instructions
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Real-time Progress
            </h3>
            <p className="text-gray-600">
              Watch your novel come to life with streaming generation updates
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              10,000 Word Synopsis
            </h3>
            <p className="text-gray-600">
              Upload detailed synopses to guide your novel's development
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
