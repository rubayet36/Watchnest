/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Modern formats — AVIF first (best compression), WebP fallback
    formats: ['image/avif', 'image/webp'],

    // Serve TMDB posters at optimal sizes matching our UI
    deviceSizes: [390, 640, 750, 1080],
    imageSizes: [64, 88, 128, 256],

    // Cache optimized images for 7 days
    minimumCacheTTL: 604800,

    // TMDB images are served from their own CDN — bypass Next.js proxy
    // to avoid /_next/image 504 Gateway Timeout errors
    unoptimized: true,

    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google profile photos
      },
    ],
  },

  // Compress responses
  compress: true,

  // Strict mode catches bugs earlier
  reactStrictMode: true,

  // Hide the local-only "Rendering..." route indicator. Runtime errors still show.
  devIndicators: false,

  // Experimental: faster builds with partial prerendering (Next.js 15+)
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react', 'date-fns'],
  },
}

export default nextConfig
