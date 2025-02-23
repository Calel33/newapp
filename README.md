# DocsToMarkdown Converter

A modern web application that converts online documentation into clean, readable Markdown format.

## Features

- Convert any web documentation to Markdown
- Real-time conversion progress tracking
- Clean, modern UI with dark mode support
- Rate limiting and security measures
- Comprehensive error handling

## Tech Stack

- Frontend: Next.js 15.1.0 with React 19
- Backend: Python with BeautifulSoup4 and Markdownify
- UI Components: shadcn/ui
- Styling: Tailwind CSS

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Git

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd newapp
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Set up Python environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

## Development

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Documentation

### Convert Documentation to Markdown

**Endpoint**: `POST /api/convert`

**Request Headers**:
- `Content-Type: application/json`

**Request Body**:
```json
{
  "url": "https://example.com/docs"
}
```

**Response**:
Server-Sent Events stream with the following event types:

1. Progress Updates:
```json
{
  "progress": 50,
  "message": "Converting content..."
}
```

2. Completion:
```json
{
  "result": {
    "title": "Document Title",
    "markdown": "# Converted Content...",
    "source_url": "https://example.com/docs"
  }
}
```

3. Error:
```json
{
  "error": "Error message"
}
```

**Rate Limiting**:
- 10 requests per minute per IP
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Security Headers**:
- X-DNS-Prefetch-Control
- X-XSS-Protection
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security

## Error Handling

The application handles various error scenarios:

1. Invalid URLs
2. Network timeouts (30s limit)
3. Rate limiting
4. Content parsing errors
5. Conversion failures

## Testing

1. Run the test script:
```bash
cd python_backend
python test_converter.py "https://docs.python.org/3/tutorial/introduction.html"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Add your license here]
