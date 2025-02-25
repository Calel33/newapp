'use client'

import React from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { ConvertedContentCard } from '@/components/ConvertedContentCard'
import { UrlInputList } from '@/components/url-input-list'
import { ConversionStatus } from '@/components/conversion-status'

interface ConvertedContent {
  title: string;
  markdown: string;
  sourceUrl?: string;
}

export function DocsConverter() {
  const [url, setUrl] = React.useState('')
  const [isConverting, setIsConverting] = React.useState(false)
  const [convertedContent, setConvertedContent] = React.useState<ConvertedContent | null>(null)
  const [error, setError] = React.useState<{ message: string } | null>(null)
  const [conversionProgress, setConversionProgress] = React.useState(0)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Don't submit if URL is empty
    if (!url.trim()) {
      toast({
        title: "No URL provided",
        description: "Please enter a valid URL to convert.",
        variant: "destructive",
      });
      return;
    }
    
    setIsConverting(true);
    setError(null);
    setConvertedContent(null);
    setConversionProgress(0);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'update') {
              const update = data.data;
              
              if (update.status === 'progress') {
                setConversionProgress(update.progress);
              } else if (update.status === 'done') {
                setConvertedContent({
                  title: update.title || 'Converted Document',
                  markdown: update.content,
                  sourceUrl: update.sourceUrl,
                });
                setConversionProgress(100);
              } else if (update.status === 'error') {
                setError(update.error);
              }
            }
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
          }
        }
      }

    } catch (error) {
      setError(error instanceof Error ? { message: error.message } : { message: 'Failed to convert documents' });
    } finally {
      setIsConverting(false);
    }
  }

  const getConversionStatus = () => {
    if (error) return 'error';
    if (isConverting) return 'converting';
    if (convertedContent) return 'success';
    return 'idle';
  }

  return (
    <section className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter documentation URL"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <Button
          type="submit"
          className="w-full"
          disabled={isConverting}
        >
          {isConverting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isConverting ? 'Converting...' : 'Convert to Markdown'}
        </Button>
      </form>

      <ConversionStatus 
        status={getConversionStatus()}
        progress={conversionProgress}
        message={error?.message}
      />

      {convertedContent && (
        <article className="space-y-4">
          <ConvertedContentCard
            title={convertedContent.title}
            markdown={convertedContent.markdown}
            sourceUrl={convertedContent.sourceUrl}
            defaultOpen={true}
          />
        </article>
      )}
    </section>
  )
}
