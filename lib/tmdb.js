const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE = process.env.NEXT_PUBLIC_TMDB_BASE_URL || 'https://api.themoviedb.org/3'
const IMAGE_BASE = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p'

export const getPosterUrl = (path, size = 'w500') =>
  path ? `${IMAGE_BASE}/${size}${path}` : null

export const getBackdropUrl = (path, size = 'w1280') =>
  path ? `${IMAGE_BASE}/${size}${path}` : null

async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`)
  url.searchParams.set('api_key', TMDB_API_KEY)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`)
  return res.json()
}

export async function searchMulti(query) {
  if (!query || query.trim().length < 2) return []
  const data = await tmdbFetch('/search/multi', { query: query.trim(), include_adult: false })
  // Filter out 'person' results, keep only 'movie' and 'tv'
  return (data.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv')
}

export async function getMovieDetails(tmdbId, mediaType = 'movie') {
  return tmdbFetch(`/${mediaType}/${tmdbId}`, { append_to_response: 'credits' })
}

export async function getMoviesByGenre(genreId, page = 1) {
  return tmdbFetch('/discover/movie', { with_genres: genreId, page, sort_by: 'popularity.desc' })
}

// Returns weekly trending movies + TV shows (mixed)
export async function getTrending(page = 1) {
  const data = await tmdbFetch('/trending/all/week', { page })
  return (data.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv')
}

// Returns movies currently in theatres / latest releases
export async function getNowPlaying(page = 1) {
  const data = await tmdbFetch('/movie/now_playing', { page })
  return (data.results || []).map(m => ({ ...m, media_type: 'movie' }))
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
