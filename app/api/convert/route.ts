import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { JSDOM } from 'jsdom'
import TurndownService from 'turndown'
import { cleanMarkdown, detectLanguage } from '@/lib/markdown-utils'

const MAX_CONTENT_SIZE = 10 * 1024 * 1024 // 10MB
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

export async function POST(request: NextRequest) {
  try {
    // Validate request size
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > MAX_CONTENT_SIZE) {
      return new NextResponse(
        JSON.stringify({ error: 'Request payload too large' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { url } = await request.json()
    
    if (!url || typeof url !== 'string') {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid URL provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create stream for real-time updates
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Fetch URL content
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'update',
            data: { status: 'fetching' }
          }) + '\n'))

          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; DocsConverter/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
            }
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const html = await response.text()
          
          // Validate HTML size
          if (html.length > MAX_CONTENT_SIZE) {
            throw new Error('Content too large to process')
          }

          // Convert HTML to markdown
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'update',
            data: { status: 'converting' }
          }) + '\n'))

          const dom = new JSDOM(html)
          const { document } = dom.window
          const mainContent = document.querySelector('main, article, [role="main"]') || document.body
          const markdown = turndownService.turndown(mainContent.innerHTML)
          const cleanedMarkdown = cleanMarkdown(markdown)

          // Validate markdown size
          if (cleanedMarkdown.length > MAX_CONTENT_SIZE) {
            throw new Error('Converted content too large')
          }

          // Get title from URL or document
          const title = document.title || url.split('/').pop()?.replace(/[._-]/g, ' ') || 'Converted Document'

          // Send final result
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'update',
            data: {
              status: 'done',
              title,
              content: cleanedMarkdown,
              sourceUrl: url
            }
          }) + '\n'))

        } catch (error) {
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'update',
            data: {
              status: 'error',
              error: error instanceof Error ? error.message : 'Conversion failed'
            }
          }) + '\n'))
        } finally {
          controller.close()
        }
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
