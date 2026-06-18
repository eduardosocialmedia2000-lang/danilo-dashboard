import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dashboard · Dr. Danilo Matsunaga',
  description: 'Dashboard de leads e campanhas',
  robots: 'noindex,nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}
