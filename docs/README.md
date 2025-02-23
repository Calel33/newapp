# DocsToMarkdown Converter Documentation

## Overview
DocsToMarkdown Converter is a web application that converts online documentation into clean, readable Markdown format. It supports batch processing of multiple URLs and provides a user-friendly interface.

## Project Structure
- `/app`: Next.js app directory containing routes and layouts
- `/components`: React components
  - `/ui`: Reusable UI components
  - `ConvertedContentCard.tsx`: Displays converted markdown content
  - `docs-converter.tsx`: Main converter component
  - `url-input-list.tsx`: URL input management
- `/lib`: Utility functions and API client
- `/docs`: Project documentation

## Features
1. **URL Input**
   - Single and batch URL processing
   - URL validation
   - Dynamic input list

2. **Conversion**
   - HTML to Markdown conversion
   - Code block formatting
   - Progress tracking
   - Error handling

3. **Display**
   - Clean markdown rendering
   - Code syntax highlighting
   - Error boundary protection
   - Toast notifications

## Error Handling
- ErrorBoundary component for graceful error recovery
- Detailed error messages
- Network error handling
- Input validation

## API Routes
1. `/api/convert`
   - Single URL conversion
   - Returns cleaned markdown

2. `/api/convert-batch`
   - Batch URL processing
   - Streaming response
   - Progress updates

## Development
1. Start the development server:
   ```bash
   npm run dev
   ```

2. Build for production:
   ```bash
   npm run build
   ```

## Best Practices
1. Error Handling
   - Use ErrorBoundary for component errors
   - Validate inputs
   - Provide user feedback

2. Code Style
   - Clean markdown formatting
   - TypeScript type safety
   - Component organization

3. Performance
   - Streaming responses
   - Optimized rendering
   - Error recovery
