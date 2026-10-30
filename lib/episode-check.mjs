export function isNewEpisode(next, previous) {
 const parse=key=>{const match=/^(?:s(\d+))?e(\d+)$/.exec(key||'');return match?[Number(match[1]||0),Number(match[2])]:null}
 const n=parse(next),p=parse(previous)
 return !!n&&(!p||n[0]>p[0]||(n[0]===p[0]&&n[1]>p[1]))
}
export async function checkEpisodeBatch(rows,{latest,insertAlert,saveBaseline,push}) {
 let sent=0,failed=0;const releases=new Map()
 await Promise.all(rows.map(async row=>{try{
  const key=`${row.media_type}:${row.media_id}`
  if(!releases.has(key))releases.set(key,latest(row.media_type,row.media_id))
  const release=await releases.get(key)
  if(!isNewEpisode(release.key,row.last_episode_key))return
  const alert=await insertAlert(row,release)
  await saveBaseline(row,release.key)
  if(alert){sent++;await push(row,release,alert)}
 }catch{failed++}}))
 return {sent,failed}
}
