import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { ConversionProgress, ConversionResult } from '@/lib/api-client'
import { JSDOM } from 'jsdom'
import TurndownService from 'turndown'

const encoder = new TextEncoder()
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
})

// Configure turndown to handle code blocks better
turndownService.addRule('pre', {
  filter: ['pre'],
  replacement: function(content: string) {
    return '\n```\n' + content + '\n```\n'
  }
})

async function* processUrl(url: string): AsyncGenerator<ConversionProgress | ConversionResult, void, unknown> {
  yield { progress: 0, message: `Starting conversion for ${url}...` }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}`)
    }

    const html = await response.text()
    yield { progress: 50, message: `Processing ${url}...` }

    // Parse HTML and extract content
    const dom = new JSDOM(html)
    const document = dom.window.document
    
    // Get the main content (you might want to adjust this selector based on the sites you're targeting)
    const mainContent = document.querySelector('main') || document.querySelector('article') || document.body
    
    if (!mainContent) {
      throw new Error('Could not find main content')
    }

    // Remove unwanted elements
    const elementsToRemove = mainContent.querySelectorAll('script, style, iframe, nav')
    elementsToRemove.forEach(el => el.remove())

    // Convert to markdown
    const markdown = turndownService.turndown(mainContent)

    // Get page title
    const title = document.title || url

    yield {
      markdown,
      title,
      source_url: url,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    throw new Error(`Failed to convert ${url}: ${errorMessage}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json()

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an array of URLs' },
        { status: 400 }
      )
    }

    if (urls.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 URLs allowed per batch' },
        { status: 400 }
      )
    }

    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // Process URLs concurrently
    const processUrls = async () => {
      try {
        const results = urls.map((url: string) => processUrl(url))
        for await (const updates of results) {
          for await (const update of updates) {
            const chunk = encoder.encode(JSON.stringify(update) + '\n')
            await writer.write(chunk)
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
        const errorUpdate = {
          error: errorMessage,
        }
        const chunk = encoder.encode(JSON.stringify(errorUpdate) + '\n')
        await writer.write(chunk)
      } finally {
        await writer.close()
      }
    }

    processUrls()

    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    )
  }
}
