import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from './components/ui/Toaster'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import GeneratePage from './pages/GeneratePage'
import ProgressPage from './pages/ProgressPage'
import NovelPage from './pages/NovelPage'
import LibraryPage from './pages/LibraryPage'

function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/progress/:jobId" element={<ProgressPage />} />
          <Route path="/novel/:novelId" element={<NovelPage />} />
          <Route path="/library" element={<LibraryPage />} />
        </Routes>
      </Layout>
      <Toaster />
    </>
  )
}

export default App
