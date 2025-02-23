'use client'

import React from 'react'
import { AlertCircle, Copy, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { ConvertedContentCard } from '@/components/ConvertedContentCard'
import { convertToMarkdown, ConversionError, type ConversionProgress, type ConversionResult } from '@/lib/api-client'

export function DocsConverter() {
  const [url, setUrl] = React.useState('')
  const [isConverting, setIsConverting] = React.useState(false)
  const [progress, setProgress] = React.useState<ConversionProgress>({ progress: 0, message: '' })
  const [result, setResult] = React.useState<ConversionResult | null>(null)
  const [error, setError] = React.useState<{ message: string; retryAfter?: number } | null>(null)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!url) {
      toast({
        title: 'Error',
        description: 'Please enter a valid URL',
        variant: 'destructive',
      })
      return
    }

    setIsConverting(true)
    setProgress({ progress: 0, message: 'Starting conversion...' })
    setResult(null)
    setError(null)

    try {
      for await (const update of convertToMarkdown(url)) {
        if ('progress' in update) {
          setProgress(update)
        } else if ('markdown' in update) {
          setResult(update)
          toast({
            title: 'Success',
            description: 'Document converted successfully!',
          })
        }
      }
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
          description: 'An unexpected error occurred while converting the document',
          variant: 'destructive',
        })
      }
    } finally {
      setIsConverting(false)
    }
  }

  const handleCopy = async () => {
    if (!result?.markdown) return
    try {
      await navigator.clipboard.writeText(result.markdown)
      toast({
        title: 'Copied!',
        description: 'Markdown content copied to clipboard',
      })
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      })
    }
  }

  const handleDownload = () => {
    if (!result?.markdown) return
    
    // Get the last part of the URL path and clean it for use as filename
    const urlPath = new URL(url).pathname
    const lastPathSegment = urlPath.split('/').filter(Boolean).pop() || 'converted-doc'
    const filename = `${lastPathSegment.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}.md`
    
    const blob = new Blob([result.markdown], { type: 'text/markdown' })
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(downloadUrl)
    
    toast({
      title: 'Downloaded',
      description: `Saved as ${filename}`,
    })
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <Input
            type="url"
            placeholder="Enter documentation URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isConverting}
          />
          <Button type="submit" disabled={isConverting}>
            {isConverting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              'Convert'
            )}
          </Button>
        </div>

        {isConverting && (
          <div className="space-y-2">
            <Progress value={progress.progress * 100} />
            <p className="text-sm text-muted-foreground">{progress.message}</p>
          </div>
        )}
      </form>

      {error && (
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <ConvertedContentCard
            siteName={new URL(url).hostname}
            content={result.markdown}
          />
          
          <div className="flex gap-2">
            <Button onClick={handleCopy} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
