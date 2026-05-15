import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import QueryProvider from '@/components/providers/QueryProvider'
import { Toaster } from 'react-hot-toast'
import ClientProviders from '@/components/providers/ClientProviders'
import ShaderBackdrop from '@/components/layout/ShaderBackdrop'
import { ThemeProvider } from '@/context/ThemeContext'
import localFont from 'next/font/local'
import Script from 'next/script'

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
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

const themeInitScript = `
  try {
    var theme = localStorage.getItem('watchnest-theme') === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
  }
`

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable} ${gambarino.variable}`} data-theme="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://image.tmdb.org" />
        <Script id="watchnest-theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
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
      <body suppressHydrationWarning>
        <ShaderBackdrop />
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  )
}
