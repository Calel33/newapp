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
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!parsedUrl.protocol.startsWith('http')) {
        throw new Error('Invalid URL protocol. Only HTTP(S) URLs are supported.');
      }
    } catch (urlError) {
      throw new Error('Invalid URL format: ' + (urlError instanceof Error ? urlError.message : 'Unknown error'));
    }

    yield { sourceUrl: url, status: 'fetching' };

    // Fetch URL content with timeout and proper headers
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DocsConverter/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type')?.toLowerCase() || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        throw new Error('URL does not return HTML content. Content-Type: ' + contentType);
      }

      const html = await response.text();
      
      if (!html.trim()) {
        throw new Error('Empty response received from server');
      }

      yield { sourceUrl: url, status: 'converting' };

      // Process content
      const cleanedContent = await processHtmlContent(html);
      
      if (!cleanedContent.trim()) {
        throw new Error('No content could be extracted from the page');
      }

      // Get a meaningful title
      const title = (() => {
        const pathName = parsedUrl.pathname.split('/').pop() || '';
        return pathName.replace(/[._-]/g, ' ').trim() || 'Converted Document';
      })();

      yield { 
        sourceUrl: url, 
        status: 'done', 
        content: cleanedContent,
        title
      };

    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out after 30 seconds');
        }
        throw error;
      }
      throw new Error('Unknown fetch error occurred');
    }

  } catch (error: unknown) {
    console.error(`Error processing URL ${url}:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    yield { sourceUrl: url, status: 'error', error: message };
  }
}

// Types for queue operations
type QueueOperation = {
  type: 'url' | 'complete';
  url?: string;
};

// Process queue of operations
async function* processQueue(urls: string[]): AsyncGenerator<ConversionUpdate> {
  // Create queue of operations
  const queue: QueueOperation[] = [
    ...urls.map(url => ({ type: 'url' as const, url })),
    { type: 'complete' as const }
  ];

  // Process each operation in sequence
  for (const op of queue) {
    if (op.type === 'url' && op.url) {
      try {
        // Process single URL
        const generator = processUrl(op.url);
        for await (const result of generator) {
          yield result;
        }
      } catch (error) {
        console.error('Error processing URL:', op.url, error);
        yield {
          sourceUrl: op.url,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    } else if (op.type === 'complete') {
      // Use proper type for completion message with correct status
      yield {
        sourceUrl: 'batch',
        status: 'done',
        title: 'Batch Conversion Complete',
        content: 'All URLs processed',
      } as ConversionUpdate;
    }
  }
}

// Safely encode data for streaming
function encodeStreamData(data: any): Uint8Array {
  try {
    const safeData = {
      type: 'update',
      data: {
        ...data,
        ...(data.content && {
          content: data.content
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            .replace(/"/g, '\\"')
        }),
        ...(data.error && {
          error: data.error
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            .replace(/"/g, '\\"')
        })
      }
    };

    const jsonString = JSON.stringify(safeData) + '\n';
    JSON.parse(jsonString); // Validate JSON
    return new TextEncoder().encode(jsonString);
  } catch (error) {
    console.error('Error encoding stream data:', error);
    const fallback = {
      type: 'update',
      data: {
        status: 'error',
        error: 'Failed to encode response data'
      }
    };
    return new TextEncoder().encode(JSON.stringify(fallback) + '\n');
  }
}

// Handle batch conversion request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const urls: unknown = body.urls;

    // Validate URLs array
    if (!Array.isArray(urls)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid request: urls must be an array' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!urls.length) {
      return new NextResponse(
        JSON.stringify({ error: 'No URLs provided' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!urls.every(url => typeof url === 'string')) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid request: all URLs must be strings' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create stream from queue processor
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Process queue sequentially
          const generator = processQueue(urls);
          for await (const result of generator) {
            try {
              controller.enqueue(encodeStreamData(result));
            } catch (error) {
              console.error('Error writing to stream:', error);
              break;
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Error processing batch request:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
