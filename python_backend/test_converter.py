"""
Test script for the DocsConverter
"""

from converter import convert_url_to_markdown
import sys
import json
import traceback

def sanitize_for_json(text: str) -> str:
    """Sanitize text to be safely included in JSON"""
    if not isinstance(text, str):
        return str(text)
    return text.encode('unicode_escape').decode('utf-8')

def progress_callback(progress: float, message: str):
    """Simple progress callback for testing"""
    try:
        # Ensure message is JSON-safe
        safe_message = sanitize_for_json(message)
        # Print as JSON for easy parsing by Node.js
        # Use sys.stdout.write to ensure atomic writes
        output = json.dumps({
            "progress": progress,
            "message": safe_message
        }, ensure_ascii=True)
        sys.stdout.write(output + '\n')
        sys.stdout.flush()
    except Exception as e:
        sys.stderr.write(f"Error in progress callback: {str(e)}\n")
        sys.stderr.flush()

def main():
    # Get URL from command line argument
    if len(sys.argv) < 2:
        sys.stdout.write(json.dumps({
            "error": "URL argument is required"
        }) + '\n')
        sys.exit(1)
    
    url = sys.argv[1]
    
    try:
        result = convert_url_to_markdown(url, progress_callback)
        
        # Sanitize all text fields
        safe_markdown = sanitize_for_json(result["markdown"])
        safe_title = sanitize_for_json(result.get("title", ""))
        safe_url = sanitize_for_json(url)
        
        # Print final result as JSON
        output = json.dumps({
            "markdown": safe_markdown,
            "title": safe_title,
            "source_url": safe_url
        }, ensure_ascii=True)
        sys.stdout.write(output + '\n')
        sys.stdout.flush()
        sys.exit(0)
        
    except Exception as e:
        # Get full traceback
        error_details = traceback.format_exc()
        # Ensure error messages are JSON-safe
        safe_error = sanitize_for_json(str(e))
        safe_details = sanitize_for_json(error_details)
        
        output = json.dumps({
            "error": safe_error,
            "details": safe_details
        }, ensure_ascii=True)
        sys.stdout.write(output + '\n')
        sys.stdout.flush()
        sys.exit(1)

if __name__ == "__main__":
    main()
