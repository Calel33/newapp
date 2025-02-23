import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { JSDOM } from 'jsdom'
import TurndownService from 'turndown'
import { cleanMarkdown, detectLanguage } from '@/lib/markdown-utils';

const encoder = new TextEncoder()
const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
})

turndownService.addRule('heading', {
  filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  replacement: function (content: string, node: Node) {
    const element = node as HTMLElement
    const level = parseInt(element.tagName.charAt(1))
    return `\n${Array(level + 1).join('#')} ${content}\n\n`
  }
})

turndownService.addRule('code', {
  filter: ['pre', 'code'],
  replacement: function (content: string, node: Node) {
    const element = node as HTMLElement
    const isPreformatted = element.tagName.toLowerCase() === 'pre'
    const className = element.getAttribute('class') || ''
    const language = detectLanguage(content, className)

    if (isPreformatted) {
      return `\n\`\`\`${language}\n${content}\n\`\`\`\n\n`
    }

    return `\`${content.trim()}\``
  }
})

turndownService.addRule('blockquote', {
  filter: ['blockquote'],
  replacement: function (content: string) {
    content = content.trim()
    content = content.replace(/\n{3,}/g, '\n\n')
    content = content.replace(/^/gm, '> ')
    return `\n\n${content}\n\n`
  }
})

turndownService.addRule('list', {
  filter: ['ul', 'ol'],
  replacement: function (content: string, node: Node) {
    const element = node as HTMLElement
    const isOrdered = element.tagName.toLowerCase() === 'ol'
    const items = content.trim().split('\n')
    const prefix = isOrdered ? '1. ' : '- '
    return `\n\n${items.map(item => prefix + item).join('\n')}\n\n`
  }
})

// Types
type ConversionStatus = 'fetching' | 'converting' | 'done' | 'error';

interface BaseProgress {
  status: ConversionStatus;
  sourceUrl: string;
}

interface ConversionProgress extends BaseProgress {
  status: 'fetching' | 'converting';
}

interface ConversionResult extends BaseProgress {
  status: 'done';
  content: string;
  title: string;
}

interface ConversionError extends BaseProgress {
  status: 'error';
  error: string;
}

type ConversionUpdate = ConversionProgress | ConversionResult | ConversionError;

// Process HTML content and convert to markdown
async function processHtmlContent(html: string): Promise<string> {
  try {
    const dom = new JSDOM(html)
    const { document } = dom.window

    // Remove script and style tags
    document.querySelectorAll('script, style').forEach(el => el.remove())

    // Try to find main content
    const mainContent = document.querySelector('main, article, [role="main"]') || document.body

    // Remove navigation, footer, and other non-content elements
    mainContent.querySelectorAll('nav, footer, header, [role="navigation"], [role="banner"], [role="contentinfo"]')
      .forEach(el => el.remove())

    // Convert HTML to markdown
    const markdown = turndownService.turndown(mainContent.innerHTML)
    return cleanMarkdown(markdown)
  } catch (error) {
    console.error('Error processing HTML:', error)
    throw new Error('Failed to process HTML content')
  }
}

// Process a single URL
async function* processUrl(url: string): AsyncGenerator<ConversionUpdate> {
  try {
    // Validate URL
    const parsedUrl = new URL(url)
    if (!parsedUrl.protocol.startsWith('http')) {
      throw new Error('Invalid URL protocol. Only HTTP(S) URLs are supported.')
    }

    yield { sourceUrl: url, status: 'fetching' }

    // Fetch URL content with timeout and proper headers
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DocsConverter/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('text/html')) {
        throw new Error('URL does not return HTML content')
      }

      const html = await response.text()
      yield { sourceUrl: url, status: 'converting' }

      // Process content
      const cleanedContent = await processHtmlContent(html)
      
      if (!cleanedContent.trim()) {
        throw new Error('No content could be extracted from the page')
      }

      yield { 
        sourceUrl: url, 
        status: 'done', 
        content: cleanedContent,
        title: parsedUrl.pathname.split('/').pop() || 'Converted Document'
      }

    } catch (error: unknown) {
      clearTimeout(timeoutId)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out after 30 seconds')
        }
        throw error
      }
      throw new Error('Unknown fetch error occurred')
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    yield { sourceUrl: url, status: 'error', error: message }
  }
}

// Handle batch conversion request
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  try {
    const body = await request.json()
    const urls: string[] = body.urls || []

    if (!urls.length) {
      return new NextResponse('No URLs provided', { status: 400 })
    }

    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        const writer = {
          write(chunk: Uint8Array) {
            controller.enqueue(chunk)
            return Promise.resolve()
          }
        }

        try {
          // Process each URL
          for (const url of urls) {
            for await (const result of processUrl(url)) {
              await writer.write(
                encoder.encode(
                  JSON.stringify({
                    type: 'update',
                    data: result
                  }) + '\n'
                )
              )
            }
          }

          controller.close()
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error occurred'
          controller.error(message)
        }
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    console.error('Error processing request:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Failed to process request' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
