'use client'

import { TMDB_GENRES } from '@/lib/tmdb'

const TYPE_FILTERS = [
  { id: null, label: 'All' },
  { id: 'movie', label: 'Movie' },
  { id: 'tv', label: 'TV-Series' },
  { id: 'anime', label: 'Anime' },
]

export default function FeedFilters({ activeGenre, activeType, onGenreChange, onTypeChange }) {
  return (
    <div className="feed-filter-stack">
      <div className="feed-filter-group-label">Genre</div>
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

      <div className="feed-filter-group-label">Type</div>
      <div className="feed-filter-scroller" aria-label="Filter feed by type">
        {TYPE_FILTERS.map((type) => {
          const active = type.id === null ? !activeType : activeType === type.id
          return (
            <button
              key={type.id || 'all'}
              type="button"
              aria-pressed={active}
              onClick={() => onTypeChange(type.id === null ? null : (activeType === type.id ? null : type.id))}
              className={`feed-filter-chip ${active ? 'is-active' : ''}`}
            >
              <span className="feed-filter-chip-dot" />
              <span>{type.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
