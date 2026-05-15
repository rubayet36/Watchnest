const IMAGE_BASE = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p'

export const getPosterUrl = (path, size = 'w342') =>
  path ? `${IMAGE_BASE}/${size}${path}` : null

export const getBackdropUrl = (path, size = 'w1280') =>
  path ? `${IMAGE_BASE}/${size}${path}` : null

export const getProviderLogoUrl = (path, size = 'w92') =>
  path ? `${IMAGE_BASE}/${size}${path}` : null

function getAppOrigin() {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

async function tmdbFetch(endpoint, params = {}, options = {}) {
  const url = new URL(`/api/tmdb${endpoint}`, getAppOrigin())
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  const res = await fetch(url.toString(), {
    signal: options.signal,
    cache: options.cache || 'default',
  })

  if (!res.ok) throw new Error(`TMDB error: ${res.status}`)
  return res.json()
}

export async function searchMulti(query, options = {}) {
  if (!query || query.trim().length < 2) return []
  const data = await tmdbFetch('/search/multi', { query: query.trim(), include_adult: false }, options)
  return (data.results || []).filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
}

export async function getMovieDetails(tmdbId, mediaType = 'movie', options = {}) {
  return tmdbFetch(`/${mediaType}/${tmdbId}`, { append_to_response: 'credits,videos,watch/providers' }, options)
}

export async function getMoviesByGenre(genreId, page = 1, options = {}) {
  return tmdbFetch('/discover/movie', { with_genres: genreId, page, sort_by: 'popularity.desc' }, options)
}

export async function getTrending(page = 1, options = {}) {
  const data = await tmdbFetch('/trending/all/week', { page }, options)
  return (data.results || []).filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
}

export async function getNowPlaying(page = 1, options = {}) {
  const data = await tmdbFetch('/movie/now_playing', { page }, options)
  return (data.results || []).map((movie) => ({ ...movie, media_type: 'movie' }))
}

export const TMDB_GENRES = [
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' },
  { id: 878, name: 'Sci-Fi' },
  { id: 10749, name: 'Romance' },
  { id: 53, name: 'Thriller' },
  { id: 16, name: 'Animation' },
  { id: 80, name: 'Crime' },
  { id: 12, name: 'Adventure' },
  { id: 14, name: 'Fantasy' },
  { id: 99, name: 'Documentary' },
]
