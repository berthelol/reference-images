import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Reference Images',
  description: 'A collection of reference images organized by tags',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NuqsAdapter>
          <QueryProvider>
            <main className="min-h-screen bg-background">
              {children}
            </main>
          </QueryProvider>
        </NuqsAdapter>
      </body>
    </html>
  )
}