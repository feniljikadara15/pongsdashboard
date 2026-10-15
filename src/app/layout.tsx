import type { Metadata, Viewport } from 'next'
import './globals.css'
import AppShell from '@/components/AppShell'
import { FeedbackHost } from '@/components/feedback'

export const metadata: Metadata = {
  title: { default: 'Pongs', template: '%s · Pongs' },
  description: 'Quotations, projects and inventory for Pongs stretch ceilings',
}

export const viewport: Viewport = {
  themeColor: '#f8f8f7',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AppShell>{children}</AppShell>
        <FeedbackHost />
      </body>
    </html>
  )
}
