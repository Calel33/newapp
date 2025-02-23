"""
Test script for the DocsConverter
"""

from converter import convert_url_to_markdown
import sys
import json
import traceback

def progress_callback(progress: float, message: str):
    """Simple progress callback for testing"""
    # Print as JSON for easy parsing by Node.js
    # Use sys.stdout.write to ensure atomic writes
    sys.stdout.write(json.dumps({
        "progress": progress,
        "message": message
    }) + '\n')
    sys.stdout.flush()

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
        
        # Print final result as JSON
        sys.stdout.write(json.dumps({
            "markdown": result["markdown"],
            "title": result["title"],
            "source_url": url
        }) + '\n')
        sys.stdout.flush()
        sys.exit(0)
        
    except Exception as e:
        # Get full traceback
        error_details = traceback.format_exc()
        sys.stdout.write(json.dumps({
            "error": str(e),
            "details": error_details
        }) + '\n')
        sys.stdout.flush()
        sys.exit(1)

if __name__ == "__main__":
    main()
