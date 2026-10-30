import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateReport,summarizeReports,mergeProgress,progressPercent,parsePlayerProgress,resumeUrl,releaseStatus } from '../lib/watch-features.mjs'
import { checkEpisodeBatch,isNewEpisode } from '../lib/episode-check.mjs'
test('reports reject invalid reason, identity and oversized input',()=>{
 const r={media_type:'tv',media_id:1399,title:'Show',provider:'vidsrc',season:1,episode:2,reason:'buffering'}
 assert.equal(validateReport(r).episode,2)
 for(const change of [{media_type:'user'},{media_id:0},{title:'x'.repeat(201)},{provider:''},{reason:'injected'},{episode:-1}])assert.equal(validateReport({...r,...change}),null)
})
test('dashboard keeps same-number movie and anime IDs distinct',()=>{
 const summary=summarizeReports([{media_type:'movie',media_id:1,title:'Film',provider:'x'},{media_type:'anime',media_id:1,title:'Anime',provider:'x'}])
 assert.equal(summary.titles.length,2);assert.equal(summary.providers[0].count,2)
})
test('progress survives reopening but resets on different episodes',()=>{
 const saved={season:1,episode:2,currentTime:400,duration:1000,completed:false}
 assert.equal(mergeProgress(saved,{season:1,episode:2}).currentTime,400)
 assert.equal(mergeProgress(saved,{season:1,episode:3}).currentTime,undefined)
 assert.equal(progressPercent(saved),40);assert.equal(progressPercent({}),null)
})
test('resume routes retain anime language and precise TV episode',()=>{
 assert.match(resumeUrl({id:21,media_type:'anime',progress:{episodeId:'21~ep-2',epNum:2,language:'dub'}}),/language=dub/)
 assert.match(resumeUrl({id:1399,media_type:'tv',progress:{season:2,episode:3}}),/watch=1&season=2&episode=3/)
})
test('only trusted matching iframe events can save time',()=>{
 const frame={},identity={tmdbId:550,mediaType:'movie'},data={type:'PLAYER_EVENT',data:{player_info:{tmdb:550,mediaType:'movie'},player_status:'playing',player_progress:20,player_duration:100}}
 const event={source:frame,origin:'https://vidsrc.sh',data}
 assert.equal(parsePlayerProgress(event,frame,event.origin,identity).currentTime,20)
 assert.equal(parsePlayerProgress({...event,source:{}},frame,event.origin,identity),null)
 assert.equal(parsePlayerProgress({...event,origin:'https://evil.example'},frame,event.origin,identity),null)
 assert.equal(parsePlayerProgress(event,frame,event.origin,{tmdbId:551,mediaType:'movie'}),null)
 data.data.player_progress=Infinity;assert.equal(parsePlayerProgress(event,frame,event.origin,identity),null)
})
test('upcoming label is independent of stream availability',()=>{
 assert.equal(releaseStatus('2030-01-01',null,'2026-10-30'),'Upcoming')
 assert.equal(releaseStatus(null,'NOT_YET_RELEASED'),'Upcoming')
 assert.match(releaseStatus('2000-01-01'),/checked/)
})
test('release progression handles new seasons without alerting regressions',()=>{
 assert.equal(isNewEpisode('s2e1','s1e10'),true);assert.equal(isNewEpisode('e10','e9'),true)
 assert.equal(isNewEpisode('e9','e10'),false);assert.equal(isNewEpisode('e9','e9'),false)
 assert.equal(isNewEpisode(null,null),false)
})
test('episode job deduplicates shared lookups and repeated alerts',async()=>{
 const rows=[{id:'a',user_id:'u',media_type:'tv',media_id:1,last_episode_key:'s1e1'},{id:'b',user_id:'v',media_type:'tv',media_id:1,last_episode_key:'s1e1'}]
 let lookups=0,pushes=0;const inserted=new Set()
 const deps={latest:async()=>{lookups++;return {key:'s1e2'}},insertAlert:async row=>{if(inserted.has(row.id))return null;inserted.add(row.id);return {id:row.id}},saveBaseline:async()=>{},push:async()=>{pushes++}}
 assert.deepEqual(await checkEpisodeBatch(rows,deps),{sent:2,failed:0})
 assert.equal(lookups,1);assert.equal(pushes,2)
 assert.deepEqual(await checkEpisodeBatch(rows,deps),{sent:0,failed:0});assert.equal(pushes,2)
})
test('failed catalogue checks cannot advance subscription baseline',async()=>{
 let advanced=false
 const r=await checkEpisodeBatch([{id:'a',media_type:'anime',media_id:1}],{latest:async()=>{throw new Error('outage')},insertAlert:async()=>assert.fail(),saveBaseline:async()=>{advanced=true},push:async()=>assert.fail()})
 assert.equal(r.failed,1);assert.equal(advanced,false)
})
