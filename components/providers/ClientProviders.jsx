'use client'

import dynamic from 'next/dynamic'
import IntroAnimation from '@/components/pwa/IntroAnimation'

// ssr: false is only allowed inside Client Components.
// loading/error fallbacks prevent ChunkLoadError (stale chunk after HMR restart)
// from crashing the entire render tree.
const noop = () => null

const ServiceWorkerRegistrar = dynamic(
  () => import('@/components/pwa/ServiceWorkerRegistrar'),
  { ssr: false, loading: noop }
)
const InstallPrompt = dynamic(
  () => import('@/components/pwa/InstallPrompt'),
  { ssr: false, loading: noop }
)

export default function ClientProviders() {
  return (
    <>
      <ServiceWorkerRegistrar />
      <InstallPrompt />
      <IntroAnimation />
    </>
  )
}
