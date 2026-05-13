'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Search, Plus, ChevronDown } from 'lucide-react'
import { useMovieSearch } from '@/hooks/useMovieSearch'
import { useAuth } from '@/context/AuthContext'
import { getPosterUrl } from '@/lib/tmdb'
import { CATEGORIES } from '@/lib/utils'
import { authFetch } from '@/lib/auth-fetch'
import toast from 'react-hot-toast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const S = {
  overlay:  { position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' },
  backdrop: { position:'absolute', inset:0, background:'rgba(5,5,15,0.75)' },
  modal:    { position:'relative', zIndex:10, width:'100%', maxWidth:480, maxHeight:'90dvh', overflowY:'auto', background:'rgba(18,18,32,0.97)', backdropFilter:'blur(24px)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:24 },
  header:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.07)' },
  body:     { padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'1rem' },
  label:    { display:'block', fontSize:'0.8125rem', fontWeight:600, color:'#94a3b8', marginBottom:6 },
  input:    { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'0.75rem 1rem', color:'#e2e8f0', fontFamily:'inherit', fontSize:'0.9375rem', outline:'none', boxSizing:'border-box' },
  textarea: { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'0.75rem 1rem', color:'#e2e8f0', fontFamily:'inherit', fontSize:'0.9375rem', outline:'none', resize:'none', boxSizing:'border-box' },
  submitBtn:{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'0.875rem', background:'linear-gradient(135deg,#7c3aed,#db2777)', border:'none', borderRadius:14, cursor:'pointer', color:'white', fontWeight:700, fontSize:'0.9375rem', fontFamily:'inherit', transition:'opacity .2s' },
  closeBtn: { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'0.375rem', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center', justifyContent:'center' },
  movieRow: { display:'flex', alignItems:'center', gap:12, padding:'0.625rem', borderRadius:12, cursor:'pointer', width:'100%', textAlign:'left', background:'none', border:'none', fontFamily:'inherit' },
}

export default function AddMovieModal({ onClose, initialMovie = null }) {
  const { user } = useAuth()
  const { query, results, loading, search, clear } = useMovieSearch()
  const [selectedMovie, setSelectedMovie] = useState(initialMovie)
  const [note, setNote]         = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].id)
  const [catOpen, setCatOpen]   = useState(false)
  const [step, setStep]         = useState(initialMovie ? 2 : 1)
  const [submitError, setSubmitError] = useState(null)
  const queryClient = useQueryClient()

  const submitPost = useMutation({
    mutationFn: async () => {
      if (!selectedMovie || !user) throw new Error('Not logged in')

      const genreMap = {28:'Action',35:'Comedy',18:'Drama',27:'Horror',878:'Sci-Fi',10749:'Romance',53:'Thriller',16:'Animation',80:'Crime',12:'Adventure',14:'Fantasy',99:'Documentary'}
      const genres = (selectedMovie.genre_ids || []).map(id => genreMap[id] || 'Other')

      const releaseDate = selectedMovie.release_date || selectedMovie.first_air_date
      const releaseYear = releaseDate ? parseInt(releaseDate.split('-')[0]) : null

      const res = await authFetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          tmdb_id:       selectedMovie.id,
          title:         selectedMovie.title || selectedMovie.name,
          poster_path:   selectedMovie.poster_path || null,
          genres,
          tmdb_rating:   selectedMovie.vote_average || null,
          release_year:  releaseYear,
          category,
          personal_note: note.trim() || null,
          media_type:    selectedMovie.media_type || 'movie',
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (res.status === 409) throw new Error('You already shared this movie — edit your existing post instead.')
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      toast.success('Movie added to WatchNest!')
      onClose()
    },
    onError: (e) => {
      console.error('Post error:', e)
      setSubmitError(e.message)
      toast.error(e.message, { duration: 8000 })
    },
  })

  const handleSelectMovie = useCallback((movie) => {
    setSelectedMovie(movie)
    setStep(2)
    clear()
  }, [clear])

  return (
    <motion.div style={S.overlay} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
      <div onClick={onClose} style={S.backdrop} />
      <motion.div style={S.modal}
        initial={{ scale:0.92, y:24, opacity:0 }}
        animate={{ scale:1, y:0, opacity:1 }}
        exit={{ scale:0.92, y:24, opacity:0 }}
        transition={{ type:'spring', damping:26, stiffness:260 }}
      >
        {/* Header */}
        <div style={S.header}>
          <div>
            <h2 style={{ margin:0, fontSize:'1.125rem', fontWeight:800, background:'linear-gradient(135deg,#a78bfa,#f43f5e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              Add a Movie
            </h2>
            <p style={{ margin:'2px 0 0', fontSize:'0.8125rem', color:'#475569' }}>Share with your WatchNest circle</p>
          </div>
          <button onClick={onClose} style={S.closeBtn}><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={S.body}>

          {/* ── Step 1: Search ── */}
          {step === 1 && (
            <div>
              <label style={S.label}>Search Movie</label>
              <div style={{ position:'relative' }}>
                <Search size={16} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#475569', pointerEvents:'none' }} />
                <input
                  type="text" value={query} onChange={e => search(e.target.value)}
                  placeholder="Type a movie title…" autoFocus
                  style={{ ...S.input, paddingLeft:36 }}
                  onFocus={e => e.target.style.borderColor='rgba(139,92,246,0.6)'}
                  onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'}
                />
                {loading && (
                  <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}>
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>

              <AnimatePresence>
                {results.length > 0 && (
                  <motion.div
                    initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                    transition={{ duration:0.12 }}
                    style={{ marginTop:6, maxHeight:260, overflowY:'auto', background:'#0c0c1a', borderRadius:14, border:'1px solid rgba(255,255,255,0.08)' }}
                  >
                    {results.map(movie => (
                      <button key={movie.id} onClick={() => handleSelectMovie(movie)} style={S.movieRow}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background='none'}
                      >
                        <div style={{ width:36, height:52, borderRadius:8, overflow:'hidden', flexShrink:0, background:'#1c1c2e', position:'relative' }}>
                          {movie.poster_path
                            ? <Image src={getPosterUrl(movie.poster_path,'w92')} alt={movie.title} fill sizes="36px" style={{ objectFit:'cover' }} />
                            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🎬</div>
                          }
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ color:'#e2e8f0', fontWeight:600, fontSize:'0.875rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {movie.title || movie.name}
                            {movie.media_type === 'tv' && <span style={{ marginLeft:6, fontSize:'0.65rem', padding:'1px 4px', background:'rgba(139,92,246,0.2)', color:'#a78bfa', borderRadius:4 }}>TV</span>}
                          </div>
                          <div style={{ color:'#64748b', fontSize:'0.75rem', marginTop:2 }}>
                            {(movie.release_date || movie.first_air_date)?.split('-')[0] || 'N/A'} · ⭐ {movie.vote_average?.toFixed(1)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Step 2: Details ── */}
          {step === 2 && selectedMovie && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

              {/* Movie preview */}
              <div style={{ display:'flex', gap:12, padding:'0.875rem', background:'rgba(255,255,255,0.04)', borderRadius:16, border:'1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ width:56, height:80, borderRadius:10, overflow:'hidden', flexShrink:0, position:'relative', background:'#1c1c2e' }}>
                  {selectedMovie.poster_path
                    ? <Image src={getPosterUrl(selectedMovie.poster_path,'w185')} alt={selectedMovie.title} fill sizes="56px" style={{ objectFit:'cover' }} />
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🎬</div>
                  }
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:'#e2e8f0', fontSize:'0.9375rem' }}>
                    {selectedMovie.title || selectedMovie.name}
                    {selectedMovie.media_type === 'tv' && <span style={{ marginLeft:6, fontSize:'0.65rem', padding:'1px 4px', background:'rgba(139,92,246,0.2)', color:'#a78bfa', borderRadius:4 }}>TV</span>}
                  </div>
                  <div style={{ color:'#64748b', fontSize:'0.8125rem', marginTop:2 }}>{(selectedMovie.release_date || selectedMovie.first_air_date)?.split('-')[0]}</div>
                  <div style={{ color:'#f59e0b', fontSize:'0.8125rem', marginTop:2 }}>⭐ {selectedMovie.vote_average?.toFixed(1)}</div>
                  <button onClick={() => { setStep(1); setSubmitError(null) }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#8b5cf6', fontSize:'0.75rem', padding:0, marginTop:4, fontFamily:'inherit' }}>
                    ← Change movie
                  </button>
                </div>
              </div>

              {/* Category dropdown */}
              <div>
                <label style={S.label}>Category</label>
                <div style={{ position:'relative' }}>
                  <button type="button" onClick={() => setCatOpen(o => !o)} style={{
                    width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'0.75rem 1rem', background:'rgba(255,255,255,0.05)',
                    border:`1px solid ${catOpen ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: catOpen ? '12px 12px 0 0' : 12,
                    color:'#e2e8f0', fontFamily:'inherit', fontSize:'0.9rem', cursor:'pointer', textAlign:'left',
                  }}>
                    <span>{CATEGORIES.find(c => c.id === category)?.label || 'Select category'}</span>
                    <ChevronDown size={16} style={{ color:'#64748b', transition:'transform .2s', transform: catOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                  </button>
                  <AnimatePresence>
                    {catOpen && (
                      <motion.div
                        initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
                        transition={{ duration:0.12 }}
                        style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100, background:'#0e0e1c', border:'1px solid rgba(139,92,246,0.25)', borderTop:'none', borderRadius:'0 0 12px 12px', maxHeight:220, overflowY:'auto', boxShadow:'0 16px 40px rgba(0,0,0,0.5)' }}
                      >
                        {CATEGORIES.map(cat => {
                          const sel = cat.id === category
                          return (
                            <button key={cat.id} type="button"
                              onClick={() => { setCategory(cat.id); setCatOpen(false) }}
                              style={{ width:'100%', textAlign:'left', padding:'0.625rem 1rem', background: sel ? 'rgba(124,58,237,0.2)' : 'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'0.875rem', color: sel ? '#c4b5fd' : '#94a3b8', display:'flex', alignItems:'center', gap:8 }}
                              onMouseEnter={e => { if (!sel) e.currentTarget.style.background='rgba(255,255,255,0.04)' }}
                              onMouseLeave={e => { if (!sel) e.currentTarget.style.background='none' }}
                            >
                              {sel && <span style={{ width:6, height:6, borderRadius:'50%', background:'#8b5cf6', flexShrink:0 }} />}
                              <span style={{ paddingLeft: sel ? 0 : 14 }}>{cat.label}</span>
                            </button>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Personal note */}
              <div>
                <label style={S.label}>Why do you love it? <span style={{ color:'#334155' }}>(optional)</span></label>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Write your personal take…" rows={3} maxLength={300}
                  style={S.textarea}
                  onFocus={e => e.target.style.borderColor='rgba(139,92,246,0.6)'}
                  onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'}
                />
                <div style={{ textAlign:'right', fontSize:'0.75rem', color:'#334155', marginTop:4 }}>{note.length}/300</div>
              </div>

              {/* Inline error */}
              {submitError && (
                <div style={{ padding:'0.75rem 1rem', borderRadius:12, background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.25)', color:'#fda4af', fontSize:'0.8125rem', lineHeight:1.5 }}>
                  ❌ {submitError}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={() => { setSubmitError(null); submitPost.mutate() }}
                disabled={submitPost.isPending}
                style={{ ...S.submitBtn, opacity: submitPost.isPending ? 0.6 : 1 }}
              >
                {submitPost.isPending
                  ? <><LoadingSpinner size="sm" /> Posting…</>
                  : <><Plus size={18} /> Add to WatchNest</>
                }
              </button>

            </motion.div>
          )}

        </div>
      </motion.div>
    </motion.div>
  )
}
