import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

const PAGE_SIZE = 20
const MAX_FEED_ROWS = 500

const BASE_SELECT = `
  id, tmdb_id, title, poster_path, genres, tmdb_rating,
  release_year, category, personal_note, created_at, user_id, media_type,
  profiles:user_id ( id, name, avatar_url, username ),
  reactions ( reaction_type, user_id ),
  saves ( user_id )
`

const ENRICHED_SELECT = `
  id, tmdb_id, title, poster_path, genres, tmdb_rating,
  release_year, category, personal_note, created_at, user_id, media_type,
  contains_spoilers, mood_tags, user_rating, why_watch,
  profiles:user_id ( id, name, avatar_url, username ),
  reactions ( reaction_type, user_id ),
  saves ( user_id )
`

function missingNewPostColumns(error) {
  const message = error?.message || ''
  return ['contains_spoilers', 'mood_tags', 'user_rating', 'why_watch'].some((column) => message.includes(column))
}

function normalizeAggregatedPost(post) {
  return {
    ...post,
    profiles: post.profiles || null,
    reactions: post.reactions || [],
    saves: post.saves || [],
    reactionCounts: post.reaction_counts || {},
    recommendedBy: (post.recommended_by || [])
      .filter((u) => u?.id && u.id !== post.user_id)
      .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt)),
    allNotes: (post.all_notes || [])
      .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt)),
  }
}

function applyFeedFilters(query, { genreFilter, userFilter, tmdbFilter, mediaFilter }) {
  let nextQuery = query
  if (genreFilter) nextQuery = nextQuery.contains('genres', [genreFilter])
  if (userFilter) nextQuery = nextQuery.eq('user_id', userFilter)
  if (tmdbFilter) nextQuery = nextQuery.eq('tmdb_id', parseInt(tmdbFilter))
  if (mediaFilter) nextQuery = nextQuery.eq('media_type', mediaFilter)
  return nextQuery
}

async function fetchLegacyFeed(supabase, filters) {
  let query = supabase
    .from('posts')
    .select(ENRICHED_SELECT)
    .order('created_at', { ascending: false })

  query = applyFeedFilters(query, filters)
  if (!filters.tmdbFilter) query = query.range(0, MAX_FEED_ROWS - 1)

  let { data, error } = await query

  if (error && missingNewPostColumns(error)) {
    query = supabase
      .from('posts')
      .select(BASE_SELECT)
      .order('created_at', { ascending: false })
    query = applyFeedFilters(query, filters)
    if (!filters.tmdbFilter) query = query.range(0, MAX_FEED_ROWS - 1)
    ;({ data, error } = await query)
  }

  if (error) throw error
  return data || []
}

function mergeLegacyPosts(data) {
  const merged = {}

  for (const post of data || []) {
    const movieKey = `${post.media_type || 'movie'}:${post.tmdb_id}`
    if (!merged[movieKey]) {
      merged[movieKey] = {
        ...post,
        allNotes: [],
        recommendedBy: [],
      }
    }

    const bucket = merged[movieKey]
    const profile = post.profiles

    const hasReviewMeta = Boolean(
      post.personal_note ||
      post.why_watch ||
      Number(post.user_rating) > 0 ||
      (Array.isArray(post.mood_tags) && post.mood_tags.length > 0)
    )

    if (hasReviewMeta) {
      bucket.allNotes.push({
        note: post.personal_note || null,
        user: profile,
        postedAt: post.created_at,
        postId: post.id,
        contains_spoilers: post.contains_spoilers || false,
        mood_tags: post.mood_tags || [],
        user_rating: post.user_rating || null,
        why_watch: post.why_watch || null,
      })
    }

    if (profile && !bucket.recommendedBy.some((u) => u.id === profile.id)) {
      bucket.recommendedBy.push({
        id: profile.id,
        name: profile.name,
        avatar_url: profile.avatar_url,
        username: profile.username,
        postedAt: post.created_at,
        postId: post.id,
      })
    }

    if (new Date(post.created_at) > new Date(bucket.created_at)) {
      merged[movieKey] = {
        ...bucket,
        ...post,
        allNotes: bucket.allNotes,
        recommendedBy: bucket.recommendedBy,
      }
    }
  }

  return Object.values(merged)
    .map((post) => ({
      ...post,
      recommendedBy: post.recommendedBy
        .filter((u) => u.id !== post.user_id)
        .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt)),
      allNotes: post.allNotes
        .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt)),
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '0')
    const genreFilter = searchParams.get('genre') || null
    const userFilter = searchParams.get('user') || null
    const tmdbFilter = searchParams.get('tmdb') || null
    const mediaFilter = searchParams.get('media') || null
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    if (!tmdbFilter) {
      const { data: authData } = await supabase.auth.getUser()
      const { data: rpcRows, error: rpcError } = await supabase.rpc('get_feed_v2', {
        p_viewer_id: authData?.user?.id || null,
        p_page: page,
        p_page_size: PAGE_SIZE,
        p_genre: genreFilter,
        p_user_filter: userFilter || null,
      })

      if (!rpcError && Array.isArray(rpcRows)) {
        return NextResponse.json({
          posts: rpcRows.slice(0, PAGE_SIZE).map(normalizeAggregatedPost),
          nextPage: rpcRows.length > PAGE_SIZE ? page + 1 : null,
        })
      }

      console.warn('[feed] get_feed_v2 unavailable, using legacy merge:', rpcError?.message)
    }

    const data = await fetchLegacyFeed(supabase, { genreFilter, userFilter, tmdbFilter, mediaFilter })

    if (tmdbFilter) {
      return NextResponse.json({ posts: data, nextPage: null })
    }

    const posts = mergeLegacyPosts(data)
    const pagedPosts = posts.slice(from, to + 1)
    const hasMore = posts.length > to + 1

    return NextResponse.json({ posts: pagedPosts, nextPage: hasMore ? page + 1 : null })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
