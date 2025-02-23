type ConversionProgress = {
  progress: number
  message: string
}

type ConversionResult = {
  markdown: string
  title: string
  source_url: string
}

type ConversionErrorData = {
  error: string
  retryAfter?: number
}

type ConversionUpdate = ConversionProgress | ConversionResult | ConversionErrorData

class ConversionError extends Error {
  retryAfter?: number

  constructor(message: string, retryAfter?: number) {
    super(message)
    this.name = 'ConversionError'
    this.retryAfter = retryAfter
  }
}

export async function* convertToMarkdown(url: string): AsyncGenerator<ConversionUpdate, void, unknown> {
  const response = await fetch('/api/convert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    const error = await response.json()
    if (response.status === 429) {
      throw new ConversionError(error.error, error.retryAfter)
    }
    throw new ConversionError(error.error || 'Failed to convert document')
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new ConversionError('Failed to read response')
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = new TextDecoder().decode(value)
      const lines = text.split('\n').filter(Boolean)

      for (const line of lines) {
        const data = JSON.parse(line) as ConversionUpdate

        if ('error' in data) {
          throw new ConversionError(data.error, data.retryAfter)
        }

        yield data
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export { ConversionError }
export type { ConversionProgress, ConversionResult }
