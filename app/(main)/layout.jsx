'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import dynamic from 'next/dynamic'

const AddMovieModal = dynamic(() => import('@/components/movie/AddMovieModal'), {
  ssr: false,
})

export default function MainLayout({ children }) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="app-shell">
      <Navbar onAddClick={() => setShowAdd(true)} />

      <main className="main-content" style={{ minHeight: '100dvh' }}>
        {children}
      </main>

      <AnimatePresence>
        {showAdd && <AddMovieModal onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  )
}
