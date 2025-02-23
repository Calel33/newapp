"""
Test script for the DocsConverter
"""

from converter import convert_url_to_markdown, JSONEncoder
import sys
import json
import traceback

def sanitize_for_json(text: str) -> str:
    """Sanitize text to be safely included in JSON"""
    if not isinstance(text, str):
        return str(text)
    return text.encode('unicode_escape').decode('utf-8')

def progress_callback(progress: float, message: str):
    """Simple progress callback for testing with safe JSON encoding"""
    try:
        # Use custom JSON encoder for all output
        encoder = JSONEncoder(ensure_ascii=True)
        output = encoder.encode({
            "progress": progress,
            "message": message
        })
        sys.stdout.write(output + '\n')
        sys.stdout.flush()
    except Exception as e:
        sys.stderr.write(f"Error in progress callback: {str(e)}\n")
        sys.stderr.flush()

def main():
    # Get URL from command line argument
    if len(sys.argv) < 2:
        encoder = JSONEncoder(ensure_ascii=True)
        sys.stdout.write(encoder.encode({
            "error": "URL argument is required"
        }) + '\n')
        sys.exit(1)
    
    url = sys.argv[1]
    encoder = JSONEncoder(ensure_ascii=True)
    
    try:
        result = convert_url_to_markdown(url, progress_callback)
        
        # Sanitize all text fields
        safe_markdown = sanitize_for_json(result["markdown"])
        safe_title = sanitize_for_json(result.get("title", ""))
        safe_url = sanitize_for_json(url)
        
        # Use custom JSON encoder for final output
        output = encoder.encode({
            "markdown": safe_markdown,
            "title": safe_title,
            "source_url": safe_url
        })
        sys.stdout.write(output + '\n')
        sys.stdout.flush()
        sys.exit(0)
        
    except Exception as e:
        # Get full traceback
        error_details = traceback.format_exc()
        
        # Ensure error messages are JSON-safe
        safe_error = sanitize_for_json(str(e))
        safe_details = sanitize_for_json(error_details)
        
        # Use custom JSON encoder for error output
        error_output = encoder.encode({
            "error": safe_error,
            "details": safe_details
        })
        sys.stdout.write(error_output + '\n')
        sys.stdout.flush()
        sys.exit(1)

if __name__ == "__main__":
    main()
