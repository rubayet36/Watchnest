'use client'

import { TMDB_GENRES } from '@/lib/tmdb'

const TYPE_FILTERS = [
  { id: null, label: 'ALL' },
  { id: 'movie', label: 'MOVIES' },
  { id: 'tv', label: 'TV SHOWS' },
  { id: 'anime', label: 'ANIME' },
]

export default function FeedFilters({ activeGenre, activeType, onGenreChange, onTypeChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {/* Type Filters */}
      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {TYPE_FILTERS.map((type) => {
          const active = type.id === null ? !activeType : activeType === type.id
          return (
            <button
              key={type.id || 'all'}
              type="button"
              onClick={() => onTypeChange(type.id === null ? null : (activeType === type.id ? null : type.id))}
              style={{
                padding: '0.38rem 0.85rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800,
                border: active ? 'none' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', flexShrink: 0,
                background: active ? 'linear-gradient(135deg, #FF7D4D, #FF6A3D)' : '#15171C',
                color: active ? '#1a0a04' : '#9A9CA3', transition: 'all 0.15s ease'
              }}
            >
              {type.label}
            </button>
          )
        })}
      </div>

      {/* Genre Filters */}
      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {[{ id: 0, name: null }, ...TMDB_GENRES].map((genre) => {
          const active = genre.name === null ? !activeGenre : activeGenre === genre.name
          const label = genre.name ? genre.name.toUpperCase() : 'ALL GENRES'
          return (
            <button
              key={genre.id}
              type="button"
              onClick={() => onGenreChange(genre.name === null ? null : (activeGenre === genre.name ? null : genre.name))}
              style={{
                padding: '0.32rem 0.75rem', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700,
                border: active ? '1px solid rgba(255,106,61,0.4)' : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', flexShrink: 0,
                background: active ? 'rgba(255,106,61,0.14)' : 'rgba(255,255,255,0.03)',
                color: active ? '#FF6A3D' : '#9A9CA3', transition: 'all 0.15s ease'
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
