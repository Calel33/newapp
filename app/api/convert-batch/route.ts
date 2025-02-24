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
type ConversionStatus = 'fetching' | 'converting' | 'done' | 'error' | 'notification';

// Base interface for progress updates
interface BaseProgress {
  sourceUrl: string;
  isBatch?: boolean;
}

// Progress update during fetching and conversion
interface ConversionProgress extends BaseProgress {
  status: 'fetching' | 'converting';
}

// Final result with content
interface ConversionResult extends BaseProgress {
  status: 'done';
  content: string;
  title: string;
}

// Error during conversion
interface ConversionError extends BaseProgress {
  status: 'error';
  error: string;
}

// Notification message (for batch completion)
interface ConversionNotification extends BaseProgress {
  status: 'notification';
  message: string;
}

// Union type for all possible updates
type ConversionUpdate = ConversionProgress | ConversionResult | ConversionError | ConversionNotification;

// Constants for content management
const MAX_CONTENT_LENGTH = 3000; // Maximum length for content chunks
const MAX_TOTAL_LENGTH = 10000;  // Maximum total content length

// Split content into multiple parts
function splitContent(content: string): { parts: string[], totalParts: number } {
  const parts: string[] = [];
  let remaining = content;
  let partNumber = 1;
  
  while (remaining.length > 0) {
    // Find a good split point (end of paragraph or sentence)
    let splitPoint = MAX_CONTENT_LENGTH;
    if (remaining.length > MAX_CONTENT_LENGTH) {
      // Try to find paragraph break
      const paragraphBreak = remaining.lastIndexOf('\n\n', MAX_CONTENT_LENGTH);
      if (paragraphBreak > MAX_CONTENT_LENGTH / 2) {
        splitPoint = paragraphBreak;
      } else {
        // Try to find sentence break
        const sentenceBreak = remaining.lastIndexOf('. ', MAX_CONTENT_LENGTH);
        if (sentenceBreak > MAX_CONTENT_LENGTH / 2) {
          splitPoint = sentenceBreak + 1; // Include the period
        }
      }
    } else {
      splitPoint = remaining.length;
    }

    // Extract the part
    const part = remaining.slice(0, splitPoint).trim();
    if (part) {
      const title = `Part ${partNumber} of ${Math.ceil(content.length / MAX_CONTENT_LENGTH)}`;
      parts.push(part);
      partNumber++;
    }

    // Update remaining content
    remaining = remaining.slice(splitPoint).trim();
  }

  return { parts, totalParts: parts.length };
}

// Safely sanitize and chunk content if needed
function sanitizeContent(content: unknown, isBatch: boolean = false): string {
  if (content === null || content === undefined) {
    return '';
  }

  try {
    // Convert to string if not already
    const str = typeof content === 'string' ? content : String(content);
    
    // Truncate content if too long
    let processedContent = str;
    if (str.length > MAX_CONTENT_LENGTH) {
      const truncated = str.slice(0, MAX_CONTENT_LENGTH);
      processedContent = `${truncated}... (content truncated)`;
      console.log(`Content truncated from ${str.length} to ${processedContent.length} characters`);
    }
    
    // First level of escaping for special characters
    const escaped = processedContent
      .replace(/\\/g, '\\\\')     // Backslashes
      .replace(/"/g, '\\"')       // Double quotes
      .replace(/\n/g, '\\n')      // Newlines
      .replace(/\r/g, '\\r')      // Carriage returns
      .replace(/\t/g, '\\t')      // Tabs
      .replace(/\f/g, '\\f')      // Form feeds
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Control characters
      .replace(/\u2028/g, '\\u2028') // Line separator
      .replace(/\u2029/g, '\\u2029'); // Paragraph separator

    // Validate that the escaped string is valid JSON when quoted
    JSON.parse(`"${escaped}"`);
    
    return escaped;
  } catch (error) {
    console.error('Error sanitizing content:', error);
    return isBatch ? '[Content processing error]' : 'Content contains invalid characters';
  }
}

// Safely encode data for streaming
function encodeStreamData(data: any, isBatch: boolean = false): Uint8Array {
  try {
    // Prepare safe data with sanitized content
    const safeData = {
      type: 'update',
      data: {
        ...data,
        isBatch, // Add batch flag to response
        ...(data.content && {
          content: sanitizeContent(data.content, isBatch)
        }),
        ...(data.error && {
          error: sanitizeContent(data.error, isBatch)
        }),
        ...(data.title && {
          title: sanitizeContent(data.title, isBatch)
        })
      }
    };

    // First, stringify the entire object
    const jsonString = JSON.stringify(safeData) + '\n';

    // Check total length
    if (jsonString.length > MAX_TOTAL_LENGTH) {
      console.warn(`JSON string too long: ${jsonString.length} characters`);
      const fallback = {
        type: 'update',
        data: {
          status: 'error',
          error: 'Response too large to process',
          isBatch
        }
      };
      return new TextEncoder().encode(JSON.stringify(fallback) + '\n');
    }

    // Validate the entire JSON string
    try {
      JSON.parse(jsonString);
    } catch (jsonError) {
      console.error('Invalid JSON generated:', jsonError);
      console.error('Problematic data:', safeData);
      
      const fallback = {
        type: 'update',
        data: {
          status: 'error',
          error: 'Failed to encode response data: Invalid JSON generated',
          isBatch
        }
      };
      return new TextEncoder().encode(JSON.stringify(fallback) + '\n');
    }

    return new TextEncoder().encode(jsonString);
  } catch (error) {
    console.error('Error encoding stream data:', error);
    
    const fallback = {
      type: 'update',
      data: {
        status: 'error',
        error: 'Failed to encode response data',
        isBatch
      }
    };
    return new TextEncoder().encode(JSON.stringify(fallback) + '\n');
  }
}

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

      // Check if content needs to be split
      if (cleanedContent.length > MAX_CONTENT_LENGTH) {
        const { parts, totalParts } = splitContent(cleanedContent);
        
        // Yield each part as a separate result
        for (let i = 0; i < parts.length; i++) {
          yield {
            sourceUrl: url,
            status: 'done',
            title: `${title} (Part ${i + 1} of ${totalParts})`,
            content: parts[i]
          };
        }
      } else {
        // Yield single result
        yield {
          sourceUrl: url,
          status: 'done',
          title,
          content: cleanedContent
        };
      }

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
  const isBatch = urls.length > 1;
  
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
          yield {
            ...result,
            isBatch
          } as ConversionUpdate;
        }
      } catch (error) {
        console.error('Error processing URL:', op.url, error);
        yield {
          sourceUrl: op.url,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          isBatch
        } as ConversionError;
      }
    } else if (op.type === 'complete' && isBatch) {
      // For batch processing, send a notification instead of a conversion card
      yield {
        sourceUrl: 'batch',
        status: 'notification',
        message: `Successfully processed ${urls.length} URLs`,
        isBatch: true
      } as ConversionNotification;
    }
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
