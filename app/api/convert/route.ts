import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

// Constants
const TIMEOUT = 30000 // 30 seconds
const MAX_URL_LENGTH = 2000
const URL_PATTERN = /^https?:\/\/.+/i

// Validate URL
function isValidUrl(url: string): boolean {
  try {
    if (!url || url.length > MAX_URL_LENGTH || !URL_PATTERN.test(url)) {
      return false
    }
    new URL(url) // This will throw if URL is invalid
    return true
  } catch {
    return false
  }
}

// Clean markdown content before sending response
function cleanMarkdown(content: string): string {
  const lines = content.split('\n');
  let inCodeBlock = false;
  const cleanedLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check for code block markers
    if (line.includes('```')) {
      inCodeBlock = !inCodeBlock;
      cleanedLines.push(line);
      continue;
    }

    // Inside code block: remove line numbers and _13 markers
    if (inCodeBlock) {
      // Remove _13 and similar markers
      line = line.replace(/^_?\d+\s*/, '');
      // Remove any remaining line numbers at start
      line = line.replace(/^\d+\s*/, '');
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join('\n');
}

export async function POST(req: Request) {
  try {
    // Input validation
    const contentType = req.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      )
    }

    const { url } = await req.json()

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid URL provided. URL must be a valid HTTP(S) URL' },
        { status: 400 }
      )
    }

    // Create an encoder for the progress stream
    const encoder = new TextEncoder()

    // Create a readable stream for progress updates
    const stream = new ReadableStream({
      async start(controller) {
        // Path to Python script
        const scriptPath = path.join(process.cwd(), 'python_backend', 'test_converter.py')
        
        // Spawn Python process
        const pythonProcess = spawn('python', [scriptPath, url])
        
        let buffer = ''

        // Set up timeout
        const timeoutId = setTimeout(() => {
          pythonProcess.kill()
          controller.enqueue(encoder.encode(JSON.stringify({
            error: 'Conversion timed out'
          }) + '\n'))
          controller.close()
        }, TIMEOUT)

        // Handle progress updates
        pythonProcess.stdout.on('data', (data) => {
          buffer += data.toString()
          
          // Process complete lines
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep the last incomplete line in buffer
          
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const jsonData = JSON.parse(line)
              // Clean the markdown before sending
              const cleanedContent = cleanMarkdown(jsonData.content);
              controller.enqueue(encoder.encode(JSON.stringify({
                content: cleanedContent,
                url: jsonData.url
              }) + '\n'))
            } catch (error) {
              console.error('Error parsing JSON:', error)
            }
          }
        })

        // Handle process completion
        pythonProcess.on('close', (code) => {
          clearTimeout(timeoutId)
          if (buffer.trim()) {
            try {
              controller.enqueue(encoder.encode(buffer + '\n'))
            } catch (error) {
              console.error('Error sending final buffer:', error)
            }
          }
          controller.close()
        })

        // Handle process errors
        pythonProcess.on('error', (error) => {
          clearTimeout(timeoutId)
          controller.enqueue(encoder.encode(JSON.stringify({
            error: 'Failed to start conversion process'
          }) + '\n'))
          controller.close()
        })
      }
    })

    // Return the stream in the response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    console.error('Conversion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
