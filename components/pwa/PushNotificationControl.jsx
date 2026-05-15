'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { authFetch } from '@/lib/auth-fetch'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export default function PushNotificationControl() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState('default')
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const canUsePush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
      setSupported(canUsePush)
      if (!canUsePush) return

      setPermission(Notification.permission)
      navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => setEnabled(Boolean(subscription)))
        .catch(() => setEnabled(false))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const enablePush = async () => {
    if (!supported) return
    if (!VAPID_PUBLIC_KEY) {
      toast.error('Add NEXT_PUBLIC_VAPID_PUBLIC_KEY to enable web push.')
      return
    }

    setBusy(true)
    try {
      const nextPermission = await Notification.requestPermission()
      setPermission(nextPermission)
      if (nextPermission !== 'granted') throw new Error('Notifications are blocked for this browser.')

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const res = await authFetch('/api/push-subscriptions', {
        method: 'POST',
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to save push subscription')

      setEnabled(true)
      toast.success('Push notifications enabled')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const disablePush = async () => {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await authFetch('/api/push-subscriptions', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setEnabled(false)
      toast.success('Push notifications disabled')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  if (!supported) {
    return (
      <div className="push-control is-disabled">
        <BellOff size={18} />
        <div>
          <strong>Push notifications</strong>
          <p>This browser does not support installable push notifications.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="push-control">
      <Bell size={18} />
      <div>
        <strong>Push notifications</strong>
        <p>{enabled ? 'Partner requests, shares, replies, and reactions can reach this device.' : 'Enable device alerts for WatchNest activity.'}</p>
        {permission === 'denied' && <p className="push-control-warning">Notifications are blocked in browser settings.</p>}
      </div>
      <button type="button" onClick={enabled ? disablePush : enablePush} disabled={busy || permission === 'denied'}>
        {busy ? <LoadingSpinner size="sm" /> : enabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  )
}
