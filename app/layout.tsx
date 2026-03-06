import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Campus Arena',
  description: 'Campus Arena helps college students connect with their future classmates before campus life begins.',
  icons: {
    icon: '/ca_favicon.ico',
    apple: '/icons/icon-192.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Campus Arena',
  },
}

// ✅ Viewport must be exported separately in Next.js 13+ App Router
// This adds the critical <meta name="viewport"> tag that makes mobile work correctly.
// Without it, browsers render at ~980px desktop width and zoom out to fit.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,          // prevent iOS auto-zoom on input focus
  userScalable: false,
  viewportFit: 'cover',     // allow content under notch/home-bar on iPhone
  themeColor: '#4f46e5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        className="antialiased"
      >
        {children}
      </body>
    </html>
  )
}