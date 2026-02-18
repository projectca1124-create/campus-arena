import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Campus Arena',
  description: 'Campus Arena helps college students connect with their future classmates before campus life begins.',
  icons: {
    icon: '/ca_favicon.ico',
  },
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
      </head>
      <body>{children}</body>
    </html>
  )
}