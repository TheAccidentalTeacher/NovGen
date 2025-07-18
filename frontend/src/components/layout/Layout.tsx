import React from 'react'
import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()
  
  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Somers Novel Generator
                </span>
              </Link>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <Link 
                to="/" 
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/') 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
                }`}
              >
                Home
              </Link>
              <Link 
                to="/generate" 
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/generate') 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
                }`}
              >
                Generate
              </Link>
              <Link 
                to="/library" 
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/library') 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
                }`}
              >
                Library
              </Link>
            </div>

            <div className="flex items-center">
              <Link 
                to="/generate"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transform transition-all duration-200 hover:scale-105 shadow-md"
              >
                Start Writing
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}

export default Layout
