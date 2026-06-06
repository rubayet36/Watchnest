import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'edge'

const ANILIST_API = 'https://graphql.anilist.co'

const ANIME_INFO_QUERY = `
query ($id: Int) {
  Media (id: $id) {
    id
    idMal
    title {
      romaji
      english
      native
    }
    coverImage {
      extraLarge
      large
      color
    }
    bannerImage
    description
    episodes
    genres
    averageScore
    season
    seasonYear
    status
    duration
    studios(isMain: true) {
      nodes {
        name
      }
    }
    recommendations (page: 1, perPage: 10) {
      nodes {
        mediaRecommendation {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          type
        }
      }
    }
  }
}
`

const ANIME_LIST_QUERY = `
query ($page: Int, $perPage: Int, $sort: [MediaSort], $genre: String, $search: String, $seasonYear: Int) {
  Page (page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    media (type: ANIME, sort: $sort, genre: $genre, search: $search, seasonYear: $seasonYear) {
      id
      idMal
      title {
        romaji
        english
      }
      coverImage {
        large
        color
      }
      bannerImage
      description
      episodes
      genres
      averageScore
      seasonYear
      status
    }
  }
}
`

const ANIME_RECENT_QUERY = `
query ($page: Int, $perPage: Int) {
  Page (page: $page, perPage: $perPage) {
    pageInfo {
      hasNextPage
    }
    airingSchedules (airingAt_greater: 0, sort: TIME_DESC) {
      id
      episode
      airingAt
      media {
        id
        idMal
        title {
          romaji
          english
        }
        coverImage {
          large
          color
        }
        bannerImage
        episodes
      }
    }
  }
}
`

export async function GET(request, { params }) {
  try {
    const { path = [] } = await params
    const endpoint = path[0]

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const query = url.searchParams.get('query') || undefined
    const genre = url.searchParams.get('genre') || undefined
    const year = url.searchParams.get('year') ? parseInt(url.searchParams.get('year')) : undefined
    const sortVal = url.searchParams.get('sort') || 'TRENDING_DESC'

    let variables = {}
    let graphQuery = ''

    let resolvedId = undefined

    if (endpoint === 'info') {
      const rawId = url.searchParams.get('id')
      let animeId = parseInt(rawId)

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (isNaN(animeId) && rawId && uuidRegex.test(rawId)) {
        const cookieStore = await cookies()
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
        )

        const { data: post, error: postError } = await supabase
          .from('posts')
          .select('tmdb_id, media_type')
          .eq('id', rawId)
          .single()

        if (!postError && post) {
          if (post.media_type && post.media_type !== 'anime') {
            return NextResponse.json({ redirect: true, mediaType: post.media_type, tmdbId: post.tmdb_id })
          }
          animeId = post.tmdb_id
          resolvedId = post.tmdb_id
        }
      }

      if (!animeId) {
        return NextResponse.json({ error: 'Anime ID is required' }, { status: 400 })
      }
      variables = { id: animeId }
      graphQuery = ANIME_INFO_QUERY
    } else if (endpoint === 'recent') {
      variables = { page, perPage: 24 }
      graphQuery = ANIME_RECENT_QUERY
    } else {
      // Trending or Popular list / search / filter
      let sort = ['TRENDING_DESC', 'POPULARITY_DESC']
      if (endpoint === 'popular') {
        sort = ['POPULARITY_DESC']
      } else if (endpoint === 'latest') {
        sort = ['START_DATE_DESC']
      } else if (sortVal) {
        sort = [sortVal]
      }

      variables = {
        page,
        perPage: 24,
        sort,
        search: query,
        genre,
        seasonYear: year
      }
      graphQuery = ANIME_LIST_QUERY
    }

    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query: graphQuery, variables }),
      next: { revalidate: 300 } // cache for 5 min
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.errors?.[0]?.message || 'GraphQL Error' }, { status: res.status })
    }

    if (resolvedId) {
      return NextResponse.json({ ...data.data, resolvedId })
    }
    return NextResponse.json(data.data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
