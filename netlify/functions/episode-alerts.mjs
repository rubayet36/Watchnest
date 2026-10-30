export default async function scheduleEpisodeAlerts() {
 const origin=process.env.URL || process.env.NEXT_PUBLIC_APP_ORIGIN
 const secret=process.env.EPISODE_CRON_SECRET
 if(!origin||!secret)throw new Error('Episode scheduler requires URL and EPISODE_CRON_SECRET')
 const response=await fetch(new URL('/.netlify/functions/episode-alerts-background',origin),{method:'POST',headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(15000)})
 if(!response.ok)throw new Error(`Could not enqueue episode checks: ${response.status}`)
}
export const config={schedule:'0 */6 * * *'}
