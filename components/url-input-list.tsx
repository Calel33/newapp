'use client'

import React from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface UrlInputListProps {
  urls: string[]
  onChange: (urls: string[]) => void
}

export function UrlInputList({ urls, onChange }: UrlInputListProps) {
  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls]
    newUrls[index] = value
    onChange(newUrls)
  }

  const addUrl = (e: React.MouseEvent) => {
    e.preventDefault()
    if (urls.length < 10) {
      onChange([...urls, ''])
    }
  }

  const removeUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index)
    onChange(newUrls)
  }

  return (
    <div className="space-y-2">
      {urls.map((url, index) => (
        <div key={index} className="flex gap-2">
          <Input
            type="url"
            value={url}
            onChange={(e) => handleUrlChange(index, e.target.value)}
            placeholder="Enter URL"
            className="flex-1"
          />
          {index === urls.length - 1 && urls.length < 10 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={addUrl}
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : (
            urls.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeUrl(index)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      ))}
      {urls.length < 10 && urls.length > 0 ? null : (
        <Button
          variant="outline"
          className="w-full"
          onClick={addUrl}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add URL
        </Button>
      )}
    </div>
  )
}
