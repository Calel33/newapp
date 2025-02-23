import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory store for rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>()

// Rate limit configuration
const RATE_LIMIT = 10 // requests
const TIME_WINDOW = 60 * 1000 // 1 minute in milliseconds

// Helper to get client IP
function getClientIP(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  return xff ? xff.split(',')[0] : 'unknown'
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add security headers
  const securityHeaders = {
    'X-DNS-Prefetch-Control': 'off',
    'X-XSS-Protection': '1; mode=block',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  }

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Only apply rate limiting to the conversion API
  if (request.nextUrl.pathname === '/api/convert') {
    const ip = getClientIP(request)
    const now = Date.now()
    const windowStart = now - TIME_WINDOW

    // Clean up old entries
    Array.from(rateLimit.entries()).forEach(([key, data]) => {
      if (data.timestamp < windowStart) {
        rateLimit.delete(key)
      }
    })

    // Get existing rate limit data
    const rateLimitData = rateLimit.get(ip) ?? { count: 0, timestamp: now }

    // Reset count if outside time window
    if (rateLimitData.timestamp < windowStart) {
      rateLimitData.count = 0
      rateLimitData.timestamp = now
    }

    // Increment count
    rateLimitData.count++

    // Store updated rate limit data
    rateLimit.set(ip, rateLimitData)

    // Check if rate limit exceeded
    if (rateLimitData.count > RATE_LIMIT) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitData.timestamp + TIME_WINDOW - now) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimitData.timestamp + TIME_WINDOW - now) / 1000).toString()
          }
        }
      )
    }

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT.toString())
    response.headers.set('X-RateLimit-Remaining', (RATE_LIMIT - rateLimitData.count).toString())
    response.headers.set('X-RateLimit-Reset', (rateLimitData.timestamp + TIME_WINDOW).toString())
  }

  return response
}
