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
          try {
            // Convert Buffer to string and concatenate with existing buffer
            buffer += data.toString('utf-8')
            
            // Process complete lines
            let lines = buffer.split('\n')
            
            // Keep the last (potentially incomplete) line in the buffer
            buffer = lines.pop() || ''
            
            for (const line of lines) {
              if (!line.trim()) continue
              
              try {
                // Parse and validate JSON
                const jsonData = JSON.parse(line)
                
                // Handle progress updates
                if (jsonData.progress !== undefined && jsonData.message) {
                  controller.enqueue(encoder.encode(JSON.stringify(jsonData) + '\n'))
                  continue
                }
                
                // Handle markdown content
                if (jsonData.markdown) {
                  const cleanedContent = cleanMarkdown(jsonData.markdown)
                  controller.enqueue(encoder.encode(JSON.stringify({
                    content: cleanedContent,
                    title: jsonData.title || '',
                    url: jsonData.source_url
                  }) + '\n'))
                  continue
                }
                
                // Handle errors
                if (jsonData.error) {
                  controller.enqueue(encoder.encode(JSON.stringify({
                    error: jsonData.error,
                    details: jsonData.details || 'No additional details'
                  }) + '\n'))
                  continue
                }
                
              } catch (parseError: unknown) {
                const errorMessage = parseError instanceof Error ? 
                  parseError.message : 
                  'Unknown error occurred during JSON parsing'
                
                console.error('Error parsing JSON line:', parseError)
                console.error('Problematic line:', line)
                controller.enqueue(encoder.encode(JSON.stringify({
                  error: 'Error parsing conversion output',
                  details: `Invalid JSON data received: ${errorMessage}`
                }) + '\n'))
              }
            }
          } catch (streamError: unknown) {
            const errorMessage = streamError instanceof Error ? 
              streamError.message : 
              'Unknown stream processing error'
            
            console.error('Stream processing error:', streamError)
            controller.enqueue(encoder.encode(JSON.stringify({
              error: 'Stream processing error',
              details: errorMessage
            }) + '\n'))
          }
        })

        // Handle process completion
        pythonProcess.on('close', (code) => {
          clearTimeout(timeoutId)
          if (buffer.trim()) {
            try {
              const finalData = JSON.parse(buffer)
              if (finalData.markdown) {
                const cleanedContent = cleanMarkdown(finalData.markdown)
                controller.enqueue(encoder.encode(JSON.stringify({
                  content: cleanedContent,
                  title: finalData.title || '',
                  url: finalData.source_url
                }) + '\n'))
              }
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? 
                error.message : 
                'Unknown error processing final buffer'
              
              console.error('Error processing final buffer:', error)
              controller.enqueue(encoder.encode(JSON.stringify({
                error: 'Error processing final data',
                details: errorMessage
              }) + '\n'))
            }
          }
          controller.close()
        })

        // Handle process errors
        pythonProcess.on('error', (error) => {
          clearTimeout(timeoutId)
          controller.enqueue(encoder.encode(JSON.stringify({
            error: 'Failed to start conversion process',
            details: error.message
          }) + '\n'))
          controller.close()
        })

        // Handle stderr
        pythonProcess.stderr.on('data', (data) => {
          console.error('Python process error:', data.toString())
          controller.enqueue(encoder.encode(JSON.stringify({
            error: 'Python process error',
            details: data.toString()
          }) + '\n'))
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? 
      error.message : 
      'Unknown error occurred during conversion'
    
    console.error('Conversion error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}
