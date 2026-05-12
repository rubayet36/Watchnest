'use client'

import { TMDB_GENRES } from '@/lib/tmdb'

export default function FeedFilters({ activeGenre, onGenreChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: 4 }}>
      <style>{`
        .feed-filter-bar::-webkit-scrollbar { display: none; }
        .feed-filter-bar { scrollbar-width: none; }
      `}</style>
      {[{ id: 0, name: null }, ...TMDB_GENRES].map((genre) => {
        const active = genre.name === null ? !activeGenre : activeGenre === genre.name
        return (
          <button
            key={genre.id}
            onClick={() => onGenreChange(genre.name === null ? null : (activeGenre === genre.name ? null : genre.name))}
            style={{
              flexShrink: 0, padding: '0.375rem 1rem', borderRadius: 99,
              fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', border: 'none', transition: 'all .15s',
              background: active
                ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                : 'rgba(255,255,255,0.05)',
              color: active ? '#fff' : '#64748b',
              outline: active ? 'none' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: active ? '0 4px 12px rgba(124,58,237,0.25)' : 'none',
            }}
          >
            {genre.name || 'All'}
          </button>
        )
      })}
    </div>
  )
}
