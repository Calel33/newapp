'use client'

import { DocsConverter } from '@/components/docs-converter'
import MarkdownSplitter from '@/components/markdown-splitter'

import { useState } from 'react';

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);

  const clearFiles = () => {
    setFiles([]);
  };

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
        
        <div className="border-t pt-8">
          <h2 className="text-2xl font-semibold mb-4">Markdown Splitter</h2>
          <p className="text-muted-foreground mb-6">
            Split large markdown files into smaller, organized sections
          </p>
          <MarkdownSplitter clearFiles={clearFiles} />
        </div>
      </div>
    </main>
  )
}
