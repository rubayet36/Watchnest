import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

let vapidConfigured = false

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function configureVapid() {
  if (vapidConfigured) return true

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@watchnest.local'

  if (!publicKey || !privateKey) return false

  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
  return true
}

export async function sendPushToUser(userId, payload) {
  if (!userId || !configureVapid()) return

  const admin = getAdminClient()
  if (!admin) return

  const { data: subscriptions, error } = await admin
    .from('push_subscriptions')
    .select('endpoint, subscription')
    .eq('user_id', userId)

  if (error || !subscriptions?.length) return

  await Promise.allSettled(
    subscriptions.map(async ({ endpoint, subscription }) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify({
          title: 'WatchNest',
          icon: '/android-chrome-192x192.png',
          badge: '/favicon-32x32.png',
          ...payload,
        }))
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', endpoint)
        } else {
          console.warn('[push] send failed:', error.message)
        }
      }
    })
  )
}
