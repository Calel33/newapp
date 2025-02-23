# Application Architecture

## Overview
The application follows a modern React architecture using Next.js 13+ with the App Router. It emphasizes type safety, error handling, and clean code practices.

## Core Components

### 1. Frontend Layer
- **Page Components** (`/app`)
  - Server components by default
  - Client components marked with 'use client'
  - Error boundaries for resilience

- **UI Components** (`/components`)
  - Reusable components
  - Shadcn/ui integration
  - Type-safe props

### 2. API Layer
- **Route Handlers** (`/app/api`)
  - REST endpoints
  - Streaming responses
  - Error handling

- **API Client** (`/lib`)
  - Type-safe functions
  - Response parsing
  - Error types

### 3. Utility Layer
- **Markdown Processing**
  - HTML to Markdown conversion
  - Code block cleaning
  - Format preservation

## Data Flow
1. User inputs URLs
2. Frontend validates input
3. API processes URLs
4. Streaming updates to UI
5. Display converted content

## Error Handling Strategy
1. Component-level boundaries
2. API error responses
3. User notifications
4. Recovery options

## Performance Considerations
1. Streaming responses
2. Optimized rendering
3. Error recovery
4. Input validation

## Future Improvements
1. Caching layer
2. Rate limiting
3. Advanced formatting
4. Export options
