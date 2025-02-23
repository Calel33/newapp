'use client'

import { DocsConverter } from '@/components/docs-converter'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">DocsToMarkdown Converter</h1>
          <p className="text-lg text-muted-foreground">
            Convert any web documentation into clean, readable Markdown
          </p>
        </div>
        
        <DocsConverter />
      </div>
    </main>
  )
}
