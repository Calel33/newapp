'use client'

import React from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { ConvertedContentCard } from '@/components/ConvertedContentCard'
import { UrlInputList } from '@/components/url-input-list'
import { convertBatchToMarkdown, ConversionError, type ConversionProgress, type ConversionResult } from '@/lib/api-client'

export function DocsConverter() {
  const [urls, setUrls] = React.useState<string[]>([''])
  const [isConverting, setIsConverting] = React.useState(false)
  const [progress, setProgress] = React.useState<ConversionProgress>({ progress: 0, message: '' })
  const [results, setResults] = React.useState<ConversionResult[]>([])
  const [error, setError] = React.useState<{ message: string; retryAfter?: number } | null>(null)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const validUrls = urls.filter(url => url.trim() !== '')
    
    if (validUrls.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter at least one valid URL',
        variant: 'destructive',
      })
      return
    }

    setIsConverting(true)
    setProgress({ progress: 0, message: 'Starting conversion...' })
    setResults([])
    setError(null)

    try {
      for await (const update of convertBatchToMarkdown(validUrls)) {
        if ('progress' in update) {
          setProgress(update)
        } else if ('markdown' in update) {
          setResults(prev => [...prev, update])
        }
      }
      toast({
        title: 'Success',
        description: 'Documents converted successfully!',
      })
    } catch (err) {
      if (err instanceof ConversionError) {
        setError({
          message: err.message,
          retryAfter: err.retryAfter,
        })
        
        if (err.retryAfter) {
          toast({
            title: 'Rate Limited',
            description: `Please try again in ${err.retryAfter} seconds`,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Error',
            description: err.message,
            variant: 'destructive',
          })
        }
      } else {
        setError({
          message: 'An unexpected error occurred',
        })
        toast({
          title: 'Error',
          description: 'An unexpected error occurred while converting the documents',
          variant: 'destructive',
        })
      }
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <UrlInputList urls={urls} onChange={setUrls} />
        
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

      {isConverting && (
        <div className="space-y-2">
          <Progress value={progress.progress} />
          <p className="text-sm text-muted-foreground text-center">
            {progress.message}
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, index) => (
            <ConvertedContentCard
              key={index}
              title={result.title}
              markdown={result.markdown}
              sourceUrl={result.source_url}
            />
          ))}
        </div>
      )}
    </div>
  )
}
