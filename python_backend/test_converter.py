"""
Test script for the DocsConverter
"""

from converter import convert_url_to_markdown, clean_for_json
import sys
import json
import traceback

def safe_json_write(data: dict):
    """Safely write JSON data to stdout"""
    try:
        # Convert all string values to safe JSON
        safe_data = {}
        for key, value in data.items():
            if isinstance(value, str):
                safe_data[key] = clean_for_json(value)
            else:
                safe_data[key] = value
        
        # Write with ensure_ascii=True for maximum compatibility
        output = json.dumps(safe_data, ensure_ascii=True)
        sys.stdout.write(output + '\n')
        sys.stdout.flush()
    except Exception as e:
        sys.stderr.write(f"Error writing JSON: {str(e)}\n")
        sys.stderr.flush()

def progress_callback(progress: float, message: str):
    """Simple progress callback for testing"""
    safe_json_write({
        "progress": progress,
        "message": message
    })

def main():
    # Get URL from command line argument
    if len(sys.argv) < 2:
        safe_json_write({
            "error": "URL argument is required"
        })
        sys.exit(1)
    
    url = sys.argv[1]
    
    try:
        result = convert_url_to_markdown(url, progress_callback)
        safe_json_write(result)
        sys.exit(0)
        
    except Exception as e:
        # Get full traceback
        error_details = traceback.format_exc()
        
        safe_json_write({
            "error": str(e),
            "details": error_details
        })
        sys.exit(1)

if __name__ == "__main__":
    main()
