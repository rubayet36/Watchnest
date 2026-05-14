'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const tagline = 'Welcome to WatchNest: Where your movie saves and movie partners meet'

// Split tagline into words for staggered reveal
const words = tagline.split(' ')

export default function IntroAnimation() {
  const [show, setShow] = useState(false)
  const [exit, setExit] = useState(false)

  useEffect(() => {
    // Only show once per browser session
    const seen = sessionStorage.getItem('wn_intro_seen')
    if (!seen) {
      setShow(true)
      sessionStorage.setItem('wn_intro_seen', '1')

      // Start exit after 3.6s
      const exitTimer = setTimeout(() => setExit(true), 3600)
      // Fully unmount after exit animation (0.8s)
      const unmountTimer = setTimeout(() => setShow(false), 4400)
      return () => {
        clearTimeout(exitTimer)
        clearTimeout(unmountTimer)
      }
    }
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(12px)' }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at 50% 60%, #160d2e 0%, #0d0d1a 60%, #000 100%)',
            padding: '2rem',
            overflow: 'hidden',
          }}
        >
          {/* Ambient glow orbs */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.35 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              position: 'absolute', width: 500, height: 500,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #7c3aed44 0%, transparent 70%)',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -60%)',
              pointerEvents: 'none',
            }}
          />
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.25 }}
            transition={{ duration: 1.8, ease: 'easeOut', delay: 0.2 }}
            style={{
              position: 'absolute', width: 350, height: 350,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #db277744 0%, transparent 70%)',
              top: '55%', left: '55%',
              transform: 'translate(-30%, -50%)',
              pointerEvents: 'none',
            }}
          />

          {/* Floating film frame lines */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 0.07, scaleX: 1 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.6 }}
              style={{
                position: 'absolute',
                left: 0, right: 0,
                height: 1,
                background: 'linear-gradient(90deg, transparent, #a78bfa, transparent)',
                top: `${10 + i * 16}%`,
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Logo Icon */}
          <motion.img
            src="/android-chrome-192x192.png"
            alt="WatchNest"
            initial={{ scale: 0.3, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
            style={{
              width: 80, height: 80, borderRadius: 22,
              marginBottom: '1.25rem',
              boxShadow: '0 0 60px rgba(124,58,237,0.6), 0 0 120px rgba(219,39,119,0.3)',
              objectFit: 'cover',
            }}
          />

          {/* WatchNest title */}
          <motion.h1
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{
              fontSize: 'clamp(2rem, 8vw, 3.5rem)',
              fontWeight: 900,
              margin: '0 0 1.75rem',
              background: 'linear-gradient(135deg, #c4b5fd, #f9a8d4, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            WatchNest
          </motion.h1>

          {/* Tagline — word by word stagger */}
          <div
            style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
              gap: '0.35em', maxWidth: 520, lineHeight: 1.7,
            }}
          >
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  delay: 0.85 + i * 0.055,
                  duration: 0.4,
                  ease: 'easeOut',
                }}
                style={{
                  fontSize: 'clamp(0.9rem, 3vw, 1.1rem)',
                  color: i === 0 ? '#a78bfa'       // "Welcome"
                       : word.includes('WatchNest') ? '#f9a8d4'   // "WatchNest:"
                       : word === 'movie' || word === 'saves' || word === 'partners' ? '#c4b5fd'
                       : '#94a3b8',
                  fontWeight: word.includes('WatchNest') || word === 'saves' || word === 'partners' ? 700 : 400,
                }}
              >
                {word}
              </motion.span>
            ))}
          </div>

          {/* Divider line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 2.8, duration: 0.6 }}
            style={{
              width: 60, height: 2, borderRadius: 99,
              background: 'linear-gradient(90deg, #7c3aed, #db2777)',
              marginTop: '2rem',
            }}
          />

          {/* Subtle loading dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.0 }}
            style={{ display: 'flex', gap: 6, marginTop: '1rem' }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed' }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
