'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import dynamic from 'next/dynamic'

// Lazy-load the heavy modal — only downloaded when user clicks "+ Add Movie"
const AddMovieModal = dynamic(() => import('@/components/movie/AddMovieModal'), {
  ssr: false,
})

export default function MainLayout({ children }) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div style={{ minHeight: '100dvh' }}>
      <Navbar onAddClick={() => setShowAdd(true)} />

      {/* Content area — offset for sidebar on desktop */}
      <main style={{ minHeight: '100dvh' }} className="main-content">
        {children}
      </main>

      <AnimatePresence>
        {showAdd && <AddMovieModal onClose={() => setShowAdd(false)} />}
      </AnimatePresence>

      <style>{`
        @media (min-width: 1024px) {
          .main-content {
            margin-left: 220px;
            padding-top: 0;
            padding-bottom: 0;
          }
        }
        @media (max-width: 1023px) {
          .main-content {
            padding-top: 56px;
            padding-bottom: 72px;
          }
        }
      `}</style>
    </div>
  )
}
