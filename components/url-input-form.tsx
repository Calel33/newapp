import { useState } from 'react'

interface UrlInputFormProps {
  onSubmit: (url: string) => void
  isLoading?: boolean
}

export const UrlInputForm = ({ onSubmit, isLoading = false }: UrlInputFormProps) => {
  const [url, setUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onSubmit(url.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e)
    }
  }

  return (
    <form 
      onSubmit={handleSubmit}
      className="w-full space-y-4"
    >
      <div className="flex flex-col space-y-2">
        <label 
          htmlFor="url-input"
          className="text-sm font-medium text-gray-700"
        >
          Documentation URL
        </label>
        <input
          id="url-input"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter documentation URL"
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label="Documentation URL input"
          required
          disabled={isLoading}
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !url.trim()}
        className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Convert to Markdown"
      >
        {isLoading ? 'Converting...' : 'Convert to Markdown'}
      </button>
    </form>
  )
}
