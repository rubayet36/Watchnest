'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function BottomSheet({ isOpen, onClose, title, children, maxWidth = '640px' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="bottom-sheet-root">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="bottom-sheet-backdrop"
          />

          {/* Sheet container */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 120 || info.velocity.y > 400) {
                onClose()
              }
            }}
            className="bottom-sheet-content glass-strong"
            style={{ maxWidth }}
          >
            {/* Drag Handle Bar */}
            <div className="bottom-sheet-handle-area">
              <div className="bottom-sheet-handle" />
            </div>

            {/* Header */}
            {title && (
              <div className="bottom-sheet-header">
                <h3 className="bottom-sheet-title">{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="bottom-sheet-close"
                  aria-label="Close sheet"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="bottom-sheet-body">{children}</div>
          </motion.div>

          <style jsx global>{`
            .bottom-sheet-root {
              position: fixed;
              inset: 0;
              z-index: 100;
              display: flex;
              align-items: flex-end;
              justify-content: center;
            }

            .bottom-sheet-backdrop {
              position: absolute;
              inset: 0;
              background: rgba(0, 0, 0, 0.72);
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
            }

            .bottom-sheet-content {
              position: relative;
              z-index: 1;
              width: 100%;
              max-height: calc(90dvh - env(safe-area-inset-top));
              display: flex;
              flex-direction: column;
              border-top-left-radius: 28px;
              border-top-right-radius: 28px;
              border: 1px solid var(--glass-border);
              border-bottom: 0;
              box-shadow: 0 -12px 48px rgba(0, 0, 0, 0.6);
              overflow: hidden;
              padding-bottom: max(1rem, env(safe-area-inset-bottom));
            }

            @media (min-width: 640px) {
              .bottom-sheet-root {
                align-items: center;
                padding: 1rem;
              }

              .bottom-sheet-content {
                border-radius: 28px;
                border-bottom: 1px solid var(--glass-border);
                max-height: 85vh;
              }
            }

            .bottom-sheet-handle-area {
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 10px 0 6px;
              cursor: grab;
            }

            .bottom-sheet-handle-area:active {
              cursor: grabbing;
            }

            .bottom-sheet-handle {
              width: 42px;
              height: 5px;
              border-radius: 999px;
              background: rgba(255, 255, 255, 0.24);
            }

            .bottom-sheet-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0.5rem 1.25rem 0.75rem;
              border-bottom: 1px solid var(--control-border);
            }

            .bottom-sheet-title {
              font-size: 1.15rem;
              font-weight: 800;
              color: var(--text);
              margin: 0;
            }

            .bottom-sheet-close {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: 1px solid var(--control-border);
              background: var(--control-bg);
              color: var(--muted);
              cursor: pointer;
              transition: background 0.15s, color 0.15s;
            }

            .bottom-sheet-close:hover {
              background: rgba(255, 255, 255, 0.15);
              color: var(--text);
            }

            .bottom-sheet-body {
              flex: 1;
              overflow-y: auto;
              padding: 1.25rem;
              -webkit-overflow-scrolling: touch;
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  )
}
