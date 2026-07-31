import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import QueryProvider from '@/components/providers/QueryProvider'
import { Toaster } from 'react-hot-toast'
import ClientProviders from '@/components/providers/ClientProviders'
import ShaderBackdrop from '@/components/layout/ShaderBackdrop'
import localFont from 'next/font/local'

const geist = localFont({
  src: '../public/fonts/geist-latin.woff2',
  variable: '--font-app',
  display: 'swap',
})

const gambarino = localFont({
  src: '../public/fonts/gambarino-regular.woff2',
  variable: '--font-username-face',
  display: 'swap',
})

export const metadata = {
  title: "WatchNest — Your Circle's Movie Hub",
  description: "Share movies you love, discover what friends are watching, build the ultimate group watchlist.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WatchNest',
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport = {
  themeColor: '#FF6A3D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}


export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${gambarino.variable}`}
      data-theme="oled"
      data-accent="cyan"
      data-scroll-behavior="smooth"
      style={{ colorScheme: 'dark' }}
      suppressHydrationWarning
    >
      <head>
        {/* Google Fonts: Bebas Neue + Manrope + JetBrains Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://image.tmdb.org" />
        {/* PWA manifest */}
        <link rel="manifest" href="/api/manifest" />
        {/* iOS PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WatchNest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="msapplication-TileColor" content="#FF6A3D" />
      </head>
      <body suppressHydrationWarning>
        <ShaderBackdrop />
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 14,
                  fontFamily: 'var(--font-app), ui-sans-serif, system-ui, sans-serif',
                },
              }}
            />
            <ClientProviders />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
