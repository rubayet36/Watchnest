'use client'

import dynamic from 'next/dynamic'

// ssr: false is only allowed inside Client Components
const ServiceWorkerRegistrar = dynamic(() => import('@/components/pwa/ServiceWorkerRegistrar'), { ssr: false })
const InstallPrompt          = dynamic(() => import('@/components/pwa/InstallPrompt'),          { ssr: false })
const IntroAnimation         = dynamic(() => import('@/components/pwa/IntroAnimation'),         { ssr: false })

export default function ClientProviders() {
  return (
    <>
      <ServiceWorkerRegistrar />
      <InstallPrompt />
      <IntroAnimation />
    </>
  )
}
