import React, { useState } from 'react'

const GeneratePage: React.FC = () => {
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedSubgenre, setSelectedSubgenre] = useState('')
  const [title, setTitle] = useState('')
  const [synopsis, setSynopsis] = useState('')

  const genres = [
    'Science Fiction',
    'Fantasy', 
    'Romance',
    'Mystery',
    'Thriller',
    'Horror',
    'Historical Fiction',
    'Contemporary Fiction',
    'Young Adult',
    'Literary Fiction'
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Generate Your Novel
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create a unique, AI-powered novel tailored to your vision. Choose your genre, provide a synopsis, and watch your story come to life.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-8">
            <form className="space-y-8">
              {/* Novel Title */}
              <div>
                <label htmlFor="title" className="block text-lg font-semibold text-gray-900 mb-3">
                  Novel Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your novel's title..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Give your novel a compelling title that captures its essence.
                </p>
              </div>

              {/* Genre Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="genre" className="block text-lg font-semibold text-gray-900 mb-3">
                    Primary Genre
                  </label>
                  <select
                    id="genre"
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                  >
                    <option value="">Select a genre...</option>
                    {genres.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="subgenre" className="block text-lg font-semibold text-gray-900 mb-3">
                    Subgenre (Optional)
                  </label>
                  <select
                    id="subgenre"
                    value={selectedSubgenre}
                    onChange={(e) => setSelectedSubgenre(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                    disabled={!selectedGenre}
                  >
                    <option value="">Choose subgenre...</option>
                    <option value="space-opera">Space Opera</option>
                    <option value="cyberpunk">Cyberpunk</option>
                    <option value="urban-fantasy">Urban Fantasy</option>
                    <option value="paranormal-romance">Paranormal Romance</option>
                  </select>
                </div>
              </div>

              {/* Synopsis */}
              <div>
                <label htmlFor="synopsis" className="block text-lg font-semibold text-gray-900 mb-3">
                  Synopsis
                </label>
                <textarea
                  id="synopsis"
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  rows={8}
                  placeholder="Describe your novel's plot, characters, and key themes. Be as detailed as you'd like - up to 10,000 words..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg resize-none"
                />
                <div className="mt-2 flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Detailed synopses help the AI create more coherent and engaging stories.
                  </p>
                  <span className="text-sm text-gray-500">
                    {synopsis.length.toLocaleString()} characters
                  </span>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Advanced Options
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="length" className="block text-sm font-medium text-gray-700 mb-2">
                      Target Length
                    </label>
                    <select
                      id="length"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="novella">Novella (20-40k words)</option>
                      <option value="short-novel">Short Novel (40-60k words)</option>
                      <option value="standard-novel">Standard Novel (60-80k words)</option>
                      <option value="long-novel">Long Novel (80k+ words)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
                      Writing Style
                    </label>
                    <select
                      id="style"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="balanced">Balanced</option>
                      <option value="descriptive">Descriptive & Atmospheric</option>
                      <option value="dialogue-heavy">Dialogue-Heavy</option>
                      <option value="action-packed">Action-Packed</option>
                      <option value="character-driven">Character-Driven</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-8 rounded-xl text-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transform transition-all duration-200 hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <span className="flex items-center justify-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Novel
                  </span>
                </button>
                <p className="text-center text-sm text-gray-600 mt-3">
                  Generation typically takes 15-30 minutes depending on length
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Creativity</h3>
            <p className="text-sm text-gray-600">
              Our advanced AI understands narrative structure, character development, and genre conventions.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Real-time Progress</h3>
            <p className="text-sm text-gray-600">
              Watch your novel develop chapter by chapter with live progress updates and previews.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Your Intellectual Property</h3>
            <p className="text-sm text-gray-600">
              All generated novels belong to you. Download, publish, and share your creations freely.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GeneratePage
