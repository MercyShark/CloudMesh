import { ThemeProvider } from './theme-provider'
import { Toaster } from './ui/sonner'
import { AppHeader } from '@/components/app-header'
import React from 'react'
import { AppFooter } from '@/components/app-footer'
import { ClusterChecker } from '@/components/cluster/cluster-ui'

export function AppLayout({
  children,
  links,
}: {
  children: React.ReactNode
  links: { label: string; path: string }[]
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <div className="flex flex-col min-h-screen bg-white">
        <AppHeader links={links} />
        <main className="flex-grow w-full p-4 bg-white">
          <ClusterChecker>{children}</ClusterChecker>
        </main>
        <AppFooter />
      </div>
      <Toaster />
    </ThemeProvider>
  )
}
