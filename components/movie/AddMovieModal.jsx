'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, CloudOff, Plus, Search, ShieldAlert, Star, X } from 'lucide-react'
import { useMovieSearch } from '@/hooks/useMovieSearch'
import { useAuth } from '@/context/AuthContext'
import { getPosterUrl } from '@/lib/tmdb'
import { CATEGORIES } from '@/lib/utils'
import { authFetch } from '@/lib/auth-fetch'
import { saveOfflinePostDraft } from '@/lib/offline-drafts'
import toast from 'react-hot-toast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import BottomSheet from '@/components/ui/BottomSheet'

const S = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0 1rem', borderBottom: '1px solid var(--glass-border)' },
  body: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  label: { display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-soft)', marginBottom: 6 },
  input: { width: '100%', background: 'var(--control-bg)', border: '1px solid var(--control-border)', borderRadius: 14, padding: '0.75rem 1rem', color: 'var(--text)', fontFamily: 'inherit', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', background: 'var(--control-bg)', border: '1px solid var(--control-border)', borderRadius: 14, padding: '0.75rem 1rem', color: 'var(--text)', fontFamily: 'inherit', fontSize: '0.9375rem', outline: 'none', resize: 'none', boxSizing: 'border-box' },
  submitBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.875rem', background: 'linear-gradient(135deg,#22d3ee,#8b5cf6 55%,#fb7185)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 14, cursor: 'pointer', color: 'white', fontWeight: 800, fontSize: '0.9375rem', fontFamily: 'inherit', transition: 'opacity .2s' },
  closeBtn: { background: 'var(--control-bg)', border: '1px solid var(--control-border)', borderRadius: 12, padding: '0.4rem', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  movieRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '0.625rem', borderRadius: 12, cursor: 'pointer', width: '100%', textAlign: 'left', background: 'none', border: 'none', fontFamily: 'inherit' },
}

const MOOD_TAGS = ['Cozy', 'Funny', 'Emotional', 'Mind-bending', 'Dark', 'Romantic', 'Hype', 'Rewatch']

export default function AddMovieModal({ onClose, initialMovie = null }) {
  const { user } = useAuth()
  const { query, results, loading, error: searchError, search, clear } = useMovieSearch()
  const [selectedMovie, setSelectedMovie] = useState(initialMovie)
  const [note, setNote] = useState('')
  const [whyWatch, setWhyWatch] = useState('')
  const [containsSpoilers, setContainsSpoilers] = useState(false)
  const [moodTags, setMoodTags] = useState([])
  const [userRating, setUserRating] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].id)
  const [catOpen, setCatOpen] = useState(false)
  const [step, setStep] = useState(initialMovie ? 2 : 1)
  const [submitError, setSubmitError] = useState(null)
  const queryClient = useQueryClient()

  function buildPayload() {
    const genreMap = { 28: 'Action', 35: 'Comedy', 18: 'Drama', 27: 'Horror', 878: 'Sci-Fi', 10749: 'Romance', 53: 'Thriller', 16: 'Animation', 80: 'Crime', 12: 'Adventure', 14: 'Fantasy', 99: 'Documentary' }
    const genres = (selectedMovie.genre_ids || []).map((id) => genreMap[id] || 'Other')
    const releaseDate = selectedMovie.release_date || selectedMovie.first_air_date
    const releaseYear = releaseDate ? parseInt(releaseDate.split('-')[0]) : null

    return {
      tmdb_id: selectedMovie.id,
      title: selectedMovie.title || selectedMovie.name,
      poster_path: selectedMovie.poster_path || null,
      genres,
      tmdb_rating: selectedMovie.vote_average || null,
      release_year: releaseYear,
      category,
      personal_note: note.trim() || null,
      media_type: selectedMovie.media_type || 'movie',
      contains_spoilers: containsSpoilers,
      mood_tags: moodTags,
      user_rating: userRating === '' ? null : Number(userRating),
      why_watch: whyWatch.trim() || null,
    }
  }

  const submitPost = useMutation({
    mutationFn: async () => {
      if (!selectedMovie || !user) throw new Error('Not logged in')
      const payload = buildPayload()

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        saveOfflinePostDraft(payload)
        return { offline: true }
      }

      try {
        const res = await authFetch('/api/posts', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        const json = await res.json().catch(() => ({}))
        if (res.status === 409) throw new Error('You already shared this title - edit your existing post instead.')
        if (!res.ok) throw new Error(json.error || `Server error ${res.status}`)
        return { offline: false }
      } catch (error) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          saveOfflinePostDraft(payload)
          return { offline: true }
        }
        throw error
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      toast.success(result?.offline ? 'Saved as an offline draft' : 'Movie added to WatchNest!')
      onClose()
    },
    onError: (err) => {
      setSubmitError(err.message || 'Failed to save movie')
    },
  })

  function handleSelectMovie(movie) {
    setSelectedMovie(movie)
    setSubmitError(null)
    setStep(2)
  }

  function toggleMoodTag(tag) {
    setMoodTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    )
  }

  return (
    <BottomSheet isOpen={true} onClose={onClose} title={step === 1 ? 'Add to WatchNest' : 'Add Movie Take'}>
      <div style={S.body}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search TMDB for a movie or TV show..."
                value={query}
                onChange={(e) => search(e.target.value)}
                style={{ ...S.input, paddingLeft: '2.5rem' }}
                autoFocus
              />
              <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
              {query && (
                <button type="button" onClick={clear} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                  <X size={16} />
                </button>
              )}
            </div>

            {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><LoadingSpinner /></div>}
            {searchError && <div style={{ color: '#fb7185', fontSize: '0.875rem', textAlign: 'center' }}>Failed to search. Try again.</div>}

            <AnimatePresence>
              {results.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {results.slice(0, 7).map((m) => (
                    <button key={m.id} type="button" onClick={() => handleSelectMovie(m)} style={S.movieRow} className="surface-row">
                      <div style={{ width: 40, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0, position: 'relative', background: 'var(--control-bg)' }}>
                        {m.poster_path
                          ? <Image src={getPosterUrl(m.poster_path, 'w92')} alt={m.title || m.name || 'Poster'} fill sizes="40px" style={{ objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 10, color: 'var(--muted)' }}>N/A</div>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.title || m.name}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 2 }}>
                          {(m.release_date || m.first_air_date)?.split('-')[0] || 'N/A'} • {m.media_type === 'tv' ? 'TV Series' : 'Movie'}
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {step === 2 && selectedMovie && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: 12, padding: '0.875rem', background: 'var(--surface-row-bg)', borderRadius: 16, border: '1px solid var(--control-border)' }}>
              <div style={{ width: 56, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0, position: 'relative', background: 'var(--control-bg)' }}>
                {selectedMovie.poster_path
                  ? <Image src={getPosterUrl(selectedMovie.poster_path, 'w185')} alt={selectedMovie.title || selectedMovie.name || 'Poster'} fill sizes="56px" style={{ objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 11, color: 'var(--muted)' }}>No poster</div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.9375rem' }}>{selectedMovie.title || selectedMovie.name}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginTop: 2 }}>{(selectedMovie.release_date || selectedMovie.first_air_date)?.split('-')[0] || 'N/A'}</div>
                <button type="button" onClick={() => { setStep(1); setSubmitError(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.75rem', padding: 0, marginTop: 6, fontFamily: 'inherit' }}>
                  Change movie
                </button>
              </div>
            </div>

            <div>
              <label style={S.label}>Category</label>
              <div style={{ position: 'relative' }}>
                <button type="button" onClick={() => setCatOpen((open) => !open)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem', background: 'var(--control-bg)',
                  border: `1px solid ${catOpen ? 'var(--accent-soft)' : 'var(--control-border)'}`,
                  borderRadius: catOpen ? '12px 12px 0 0' : 12,
                  color: 'var(--text)', fontFamily: 'inherit', fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left',
                }}>
                  <span>{CATEGORIES.find((c) => c.id === category)?.label || 'Select category'}</span>
                  <ChevronDown size={16} style={{ color: 'var(--muted)', transition: 'transform .2s', transform: catOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                </button>
                <AnimatePresence>
                  {catOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--glass-bg-strong)', border: '1px solid var(--accent-soft)', borderTop: 'none', borderRadius: '0 0 12px 12px', maxHeight: 220, overflowY: 'auto', boxShadow: 'var(--soft-shadow)' }}
                    >
                      {CATEGORIES.map((cat) => {
                        const selected = cat.id === category
                        return (
                          <button key={cat.id} type="button" onClick={() => { setCategory(cat.id); setCatOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '0.625rem 1rem', background: selected ? 'rgba(124,58,237,0.2)' : 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', color: selected ? '#c4b5fd' : 'var(--text-soft)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {selected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />}
                            <span style={{ paddingLeft: selected ? 0 : 14 }}>{cat.label}</span>
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div>
              <label style={S.label}>Your rating</label>
              <div className="review-rating-row">
                <Star size={16} />
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={userRating === '' ? 0 : userRating}
                  onChange={(e) => setUserRating(e.target.value)}
                  aria-label="Your rating out of 10"
                />
                <strong>{userRating === '' ? 'Skip' : `${Number(userRating).toFixed(1)}/10`}</strong>
              </div>
            </div>

            <div>
              <label style={S.label}>Mood tags</label>
              <div className="mood-tag-row">
                {MOOD_TAGS.map((tag) => (
                  <button key={tag} type="button" onClick={() => toggleMoodTag(tag)} className={`mood-tag ${moodTags.includes(tag) ? 'is-active' : ''}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <label className="spoiler-toggle">
              <input
                type="checkbox"
                checked={containsSpoilers}
                onChange={(e) => setContainsSpoilers(e.target.checked)}
              />
              <span><ShieldAlert size={15} /> This note contains spoilers</span>
            </label>

            <div>
              <label style={S.label}>Why do you love it? <span style={{ color: 'var(--muted)' }}>(optional)</span></label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write your personal take..."
                rows={3}
                maxLength={500}
                style={S.textarea}
              />
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>{note.length}/500</div>
            </div>

            <div>
              <label style={S.label}>Why should someone watch it? <span style={{ color: 'var(--muted)' }}>(optional)</span></label>
              <textarea
                value={whyWatch}
                onChange={(e) => setWhyWatch(e.target.value)}
                placeholder="A sharp prompt for friends who are on the fence..."
                rows={2}
                maxLength={280}
                style={S.textarea}
              />
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>{whyWatch.length}/280</div>
            </div>

            {submitError && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 12, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: '#fda4af', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                {submitError}
              </div>
            )}

            <button
              type="button"
              onClick={() => { setSubmitError(null); submitPost.mutate() }}
              disabled={submitPost.isPending}
              style={{ ...S.submitBtn, opacity: submitPost.isPending ? 0.6 : 1 }}
            >
              {submitPost.isPending
                ? <><LoadingSpinner size="sm" /> Posting...</>
                : <><Plus size={18} /> Add to WatchNest</>
              }
            </button>
          </motion.div>
        )}
      </div>
    </BottomSheet>
  )
}
