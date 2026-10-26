import type { Metadata } from 'next'
import { Cormorant_Garamond, Outfit } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ryan Wong — Photography & Film',
  description: 'Portfolio of Ryan Wong, photographer and cinematographer based in New York.',
  icons: { icon: '/favicon.svg' },
  metadataBase: new URL('https://ryanwongcreative.vercel.app'),
  openGraph: {
    title: 'Ryan Wong — Photography & Film',
    description: 'Portfolio of Ryan Wong, photographer and cinematographer based in New York.',
    url: 'https://ryanwongcreative.vercel.app',
    siteName: 'Ryan Wong Creative',
    images: [{ url: '/images/hero-nyc.jpg', width: 1200, height: 800, alt: 'Ryan Wong Photography' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ryan Wong — Photography & Film',
    description: 'Portfolio of Ryan Wong, photographer and cinematographer based in New York.',
    images: ['/images/hero-nyc.jpg'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${outfit.variable}`}>
        {children}
      </body>
    </html>
  )
}
