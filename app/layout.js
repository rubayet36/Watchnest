import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import QueryProvider from '@/components/providers/QueryProvider'
import { Toaster } from 'react-hot-toast'
import ClientProviders from '@/components/providers/ClientProviders'

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
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* PWA manifest */}
        <link rel="manifest" href="/api/manifest" />
        {/* iOS PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WatchNest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="msapplication-TileColor" content="#7c3aed" />
      </head>
      <body style={{ fontFamily: "'Outfit', system-ui, sans-serif" }} suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#1c1c2e',
                  color: '#e2e8f0',
                  border: '1px solid rgba(139,92,246,0.25)',
                  borderRadius: 14,
                  fontFamily: "'Outfit', system-ui, sans-serif",
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
