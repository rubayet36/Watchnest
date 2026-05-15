'use client'

import { TMDB_GENRES } from '@/lib/tmdb'

export default function FeedFilters({ activeGenre, onGenreChange }) {
  return (
    <div className="feed-filter-scroller" aria-label="Filter feed by genre">
      {[{ id: 0, name: null }, ...TMDB_GENRES].map((genre) => {
        const active = genre.name === null ? !activeGenre : activeGenre === genre.name
        return (
          <button
            key={genre.id}
            type="button"
            aria-pressed={active}
            onClick={() => onGenreChange(genre.name === null ? null : (activeGenre === genre.name ? null : genre.name))}
            className={`feed-filter-chip ${active ? 'is-active' : ''}`}
          >
            <span className="feed-filter-chip-dot" />
            <span>{genre.name || 'All'}</span>
          </button>
        )
      })}
    </div>
  )
}
