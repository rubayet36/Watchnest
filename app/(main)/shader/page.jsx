'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

const Preview = dynamic(() => import('shaders/react/bundle').then((mod) => mod.Preview), {
  ssr: false,
  loading: () => <div className="shader-demo-loading">Loading shader preview...</div>,
})

export default function ShaderDemoPage() {
  return (
    <main className="shader-demo-page">
      <Link href="/settings" className="shader-demo-back">
        <ChevronLeft size={16} />
        Settings
      </Link>
      <section className="shader-demo-frame">
        <Preview presetId="105db495-7d37-431b-a725-b1bf63d88b12" />
      </section>
    </main>
  )
}
