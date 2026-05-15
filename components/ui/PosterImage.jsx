'use client'
import Image from 'next/image'

/**
 * Renders a movie poster or a styled placeholder when no image is available.
 * - Defaults to loading="lazy" for off-screen images
 * - Pass priority={true} for the LCP (first visible) image to preload it
 */
export default function PosterImage({ src, alt, sizes, style = {}, fill, width, height, priority = false }) {
  if (!src) {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1c1c2e 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 6, color: '#4c4f8a',
        ...style,
      }}>
        <span style={{ fontSize: '2rem' }}>🎬</span>
        <span style={{ fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>No Poster</span>
      </div>
    )
  }

  const imageAlt = alt || ''
  const imageStyle = { objectFit: 'cover', ...style }

  if (fill) {
    return (
      <Image
        src={src}
        alt={imageAlt}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        style={imageStyle}
        fill
      />
    )
  }

  return (
    <Image
      src={src}
      alt={imageAlt}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      style={imageStyle}
      width={width}
      height={height}
    />
  )
}
