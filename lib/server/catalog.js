export async function tmdb(path, params = {}) {
  const key = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY
  if (!key) throw new Error('Movie and series catalogue is not configured.')
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  url.searchParams.set('api_key',key)
  Object.entries(params).forEach(([key,value])=> { if(value !== undefined && value !== '') url.searchParams.set(key,String(value)) })
  const res = await fetch(url,{ signal:AbortSignal.timeout(8000), cache:'no-store' })
  if (!res.ok) throw new Error('Movie and series catalogue is temporarily unavailable.')
  return res.json()
}
export async function anilist(query, variables) {
  const res = await fetch('https://graphql.anilist.co',{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(8000),cache:'no-store' })
  const body = await res.json()
  if(!res.ok || body.errors) throw new Error('Anime catalogue is temporarily unavailable.')
  return body.data
}
export async function latestEpisode(type,id) {
  if (type === 'tv') {
    const d = await tmdb(`/tv/${id}`), ep = d.last_episode_to_air
    return { title:d.name, key:ep && ep.air_date && ep.air_date <= new Date().toISOString().slice(0,10) ? `s${ep.season_number}e${ep.episode_number}` : null, label:ep ? `Season ${ep.season_number}, episode ${ep.episode_number}` : '', link:`/media/tv/${id}` }
  }
  const d = await anilist(`query($id:Int!,$now:Int!){Media(id:$id,type:ANIME){title{english romaji}} Page(page:1,perPage:1){airingSchedules(mediaId:$id,airingAt_lesser:$now,sort:TIME_DESC){episode}}}`,{id:Number(id),now:Math.floor(Date.now()/1000)})
  if(!d.Media) throw new Error('Title not found')
  const ep = d.Page.airingSchedules[0]?.episode
  return { title:d.Media.title.english || d.Media.title.romaji,key:ep ? `e${ep}` : null,label:ep ? `Episode ${ep}` : '',link:`/anime/${id}` }
}
