'use client'

import { useState } from 'react'
import { useMovieSearch } from '@/hooks/useMovieSearch'
import Image from 'next/image'
import Link from 'next/link'
import { Search, X, Star, Plus } from 'lucide-react'
import { getPosterUrl } from '@/lib/tmdb'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import PosterImage from '@/components/ui/PosterImage'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'

const AddMovieModal = dynamic(() => import('@/components/movie/AddMovieModal'), { ssr: false })

async function searchNest(term) {
  if (!term || term.length < 2) return []
  const res  = await fetch(`/api/search?q=${encodeURIComponent(term)}`)
  const json = await res.json()
  return json.results || []
}

export default function SearchPage() {
  const [input, setInput] = useState('')
  const [searchMode, setSearchMode] = useState('nest')
  const [addingMovie, setAddingMovie] = useState(null)
  const { results: tmdbResults, loading: tmdbLoading, search: tmdbSearch, clear } = useMovieSearch()

  const { data: nestResults, isLoading: nestLoading } = useQuery({
    queryKey: ['nestSearch', input],
    queryFn: () => searchNest(input),
    enabled: searchMode === 'nest' && input.length >= 2,
    staleTime: 10_000,
  })

  function handleInput(value) {
    setInput(value)
    if (searchMode === 'tmdb') tmdbSearch(value)
  }

  const isLoading = searchMode === 'nest' ? nestLoading : tmdbLoading
  const results   = searchMode === 'nest' ? nestResults  : tmdbResults

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* Title */}
      <h1 style={{
        fontSize: '1.5rem', fontWeight: 900, marginBottom: '1.25rem',
        background: 'linear-gradient(135deg,#a78bfa,#f43f5e)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>Search</h1>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { id: 'nest',  label: 'In WatchNest' },
          { id: 'tmdb',  label: 'All Movies (TMDB)' },
        ].map(({ id, label }) => {
          const active = searchMode === id
          return (
            <button key={id}
              onClick={() => { setSearchMode(id); setInput(''); clear() }}
              style={{
                padding: '0.5rem 1rem', borderRadius: 12, fontSize: '0.875rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', border: 'none',
                background: active ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.05)',
                color: active ? '#fff' : '#64748b',
                outline: active ? 'none' : '1px solid rgba(255,255,255,0.08)',
                transition: 'all .15s',
              }}
            >{label}</button>
          )
        })}
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
        <input
          type="text"
          value={input}
          onChange={e => handleInput(e.target.value)}
          placeholder={searchMode === 'nest' ? 'Search movies in your nest…' : 'Search any movie…'}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, paddingLeft: 44, paddingRight: input ? 44 : 16, paddingTop: 14, paddingBottom: 14,
            color: '#e2e8f0', fontFamily: 'inherit', fontSize: '1rem', outline: 'none',
            transition: 'border-color .15s',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.6)'}
          onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
        {input && !isLoading && (
          <button onClick={() => { setInput(''); clear() }} style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4,
          }}><X size={18} /></button>
        )}
        {isLoading && (
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {/* Results */}
      {input.length < 2 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔍</div>
          <h3 style={{ color: '#e2e8f0', fontWeight: 700, margin: '0 0 0.5rem' }}>Start typing</h3>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
            Search for movies in your nest or any movie from TMDB
          </p>
        </div>
      ) : isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <LoadingSpinner size="md" />
        </div>
      ) : !results || results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎭</div>
          <p style={{ color: '#64748b' }}>No results for "{input}"</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {results.map((movie, i) => {
            let isAnime = false
            if (searchMode === 'tmdb') {
               isAnime = movie.genre_ids?.includes(16) && movie.media_type === 'tv'
            } else {
               isAnime = movie.genres?.includes('Animation') && movie.media_type === 'tv'
            }
            const mediaLabel = isAnime ? 'ANIME' : (movie.media_type === 'tv' ? 'TV' : 'MOVIE')
            const mediaColor = isAnime ? '#ec4899' : (movie.media_type === 'tv' ? '#3b82f6' : '#10b981')

            return (
            <motion.div key={movie.tmdb_id || movie.id || i}
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{ position: 'relative' }}
            >
              <Link href={`/media/${movie.media_type || 'movie'}/${movie.tmdb_id || movie.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, transition: 'border-color .15s, background .15s',
                  paddingRight: searchMode === 'tmdb' ? '3.5rem' : '0.875rem',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(139,92,246,0.3)'; e.currentTarget.style.background='rgba(139,92,246,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; e.currentTarget.style.background='rgba(255,255,255,0.04)' }}
                >
                  {/* Poster */}
                  <div style={{ width: 56, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0, position: 'relative', background: '#1c1c2e' }}>
                    <PosterImage src={getPosterUrl(movie.poster_path)} alt={movie.title || movie.name}
                      fill sizes="56px" style={{ objectFit: 'cover' }} />
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {movie.title || movie.name}
                      <span style={{ marginLeft:8, fontSize:'0.65rem', padding:'2px 5px', background:`${mediaColor}22`, color:mediaColor, border:`1px solid ${mediaColor}44`, borderRadius:4, textDecoration:'none', verticalAlign:'middle' }}>{mediaLabel}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 4, fontSize: '0.8125rem', color: '#64748b' }}>
                      <span>{movie.release_year || movie.release_date?.split('-')[0]}</span>
                      {(movie.tmdb_rating || movie.vote_average) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b' }}>
                          <Star size={12} fill="#f59e0b" />
                          {(movie.tmdb_rating || movie.vote_average)?.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {movie.genres?.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.375rem', marginTop: 6, flexWrap: 'wrap' }}>
                        {movie.genres.slice(0, 3).map(g => (
                          <span key={g} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>{g}</span>
                        ))}
                      </div>
                    )}
                    {movie.profiles && searchMode === 'nest' && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#7c3aed' }}>
                        Added by {movie.profiles.name}
                      </p>
                    )}
                  </div>
                </div>
              </Link>

              {/* Add to Nest button — TMDB mode only */}
              {searchMode === 'tmdb' && (
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setAddingMovie(movie) }}
                  title="Add to WatchNest"
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg,#7c3aed,#db2777)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(124,58,237,0.45)',
                    transition: 'transform .15s, box-shadow .15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-50%) scale(1.12)'; e.currentTarget.style.boxShadow='0 6px 22px rgba(124,58,237,0.65)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(-50%) scale(1)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(124,58,237,0.45)' }}
                >
                  <Plus size={18} color="white" />
                </button>
              )}
            </motion.div>
          )})}
        </div>
      )}

      {/* Quick-add modal triggered from TMDB search results */}
      <AnimatePresence>
        {addingMovie && (
          <AddMovieModal
            initialMovie={addingMovie}
            onClose={() => setAddingMovie(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
