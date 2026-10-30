import { NextResponse } from 'next/server'
import { tmdb, anilist } from '@/lib/server/catalog'
const genres = { Action:[28,10759], Comedy:[35,35], Drama:[18,18], Animation:[16,16], Mystery:[9648,9648], Crime:[80,80], Documentary:[99,99] }
export async function GET(request) {
  const p = new URL(request.url).searchParams
  const q=(p.get('q')||'').trim().slice(0,100), type=p.get('type')||'all', genre=p.get('genre')||'', language=p.get('language')||'', year=p.get('year')||'', page=Number(p.get('page')||1)
  if (!['all','movie','tv','anime'].includes(type) || (genre && !genres[genre]) || (language && !/^[a-z]{2}$/.test(language)) || (year && !/^\d{4}$/.test(year)) || !Number.isInteger(page) || page<1 || page>100) return NextResponse.json({error:'Invalid search filters.'},{status:400})
  const types=type==='all'?['movie','tv','anime']:[type]
  const responses = await Promise.allSettled(types.map(async t=>{
    if(t==='anime') {
      // AniList does not expose original audio language: never guess from country.
      if(language) return {results:[],hasMore:false,note:'Anime is excluded by original-language filters because AniList does not supply audio language.'}
      const d=await anilist(`query($q:String,$page:Int,$genre:String,$year:Int){Page(page:$page,perPage:20){pageInfo{hasNextPage} media(type:ANIME,isAdult:false,search:$q,genre:$genre,seasonYear:$year,sort:POPULARITY_DESC){id title{english romaji} coverImage{large} seasonYear genres status}}}`,{q:q||undefined,page,genre:genre==='Animation'?undefined:genre||undefined,year:year?Number(year):undefined})
      return {results:d.Page.media.map(m=>({id:m.id,type:t,title:m.title.english||m.title.romaji,image:m.coverImage.large,year:m.seasonYear,status:m.status,href:`/anime/${m.id}`})),hasMore:d.Page.pageInfo.hasNextPage}
    }
    const genreId=genre?genres[genre][t==='movie'?0:1]:undefined
    const d=await tmdb(`/${q?'search':'discover'}/${t}`,{query:q||undefined,page,include_adult:false,with_genres:!q?genreId:undefined,with_original_language:!q?language:undefined,[t==='movie'?'primary_release_year':'first_air_date_year']:!q?year:undefined,sort_by:!q?'popularity.desc':undefined})
    const rows=(d.results||[]).filter(m=>(!genreId || m.genre_ids?.includes(genreId))&&(!language || m.original_language===language)&&(!year || (m.release_date||m.first_air_date||'').startsWith(year)))
    return {results:rows.map(m=>({id:m.id,type:t,title:m.title||m.name,image:m.poster_path?`https://image.tmdb.org/t/p/w342${m.poster_path}`:null,year:(m.release_date||m.first_air_date||'').slice(0,4),href:`/media/${t}/${m.id}`})),hasMore:page<d.total_pages}
  }))
  const errors=[], results=[];let hasMore=false
  responses.forEach((r,i)=>{if(r.status==='rejected')errors.push(`${types[i]}: ${r.reason.message}`);else {results.push(...r.value.results);hasMore ||= r.value.hasMore;if(r.value.note)errors.push(r.value.note)}})
  return NextResponse.json({results,hasMore,page,warnings:errors},{status:responses.every(r=>r.status==='rejected')?502:200})
}
