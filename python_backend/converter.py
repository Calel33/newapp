"""
Core conversion module for DocsToMarkdown
Handles web scraping and markdown conversion with progress tracking
"""

import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as md
from typing import Dict, Optional, Callable
import json
import re
import sys

class ConversionError(Exception):
    """Custom exception for conversion errors"""
    pass

class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle special characters"""
    def encode(self, obj):
        if isinstance(obj, str):
            # Replace problematic characters
            obj = obj.replace('\u2028', '\\u2028')
            obj = obj.replace('\u2029', '\\u2029')
            # Handle other potential JSON-breaking characters
            obj = re.sub(r'[\x00-\x1F\x7F-\x9F]', lambda m: f'\\u{ord(m.group(0)):04x}', obj)
        return super().encode(obj)

class DocsConverter:
    def __init__(self, progress_callback: Optional[Callable[[int, str], None]] = None):
        """Initialize converter with custom JSON encoder"""
        self.progress_callback = progress_callback
        self.json_encoder = JSONEncoder(ensure_ascii=True)

    def _update_progress(self, progress: int, message: str):
        """Update conversion progress with safe JSON encoding"""
        if self.progress_callback:
            try:
                safe_message = self.json_encoder.encode(message)
                self.progress_callback(progress, json.loads(safe_message))
            except Exception as e:
                print(f"Progress update error: {str(e)}", file=sys.stderr)

    def fetch_content(self, url: str) -> str:
        """
        Fetch content from URL
        
        Args:
            url: URL to fetch content from
            
        Returns:
            HTML content as string
            
        Raises:
            ConversionError: If fetching fails
        """
        try:
            self._update_progress(10, "Fetching document...")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            raise ConversionError(f"Failed to fetch content: {str(e)}")

    def parse_html(self, html: str) -> BeautifulSoup:
        """
        Parse HTML content
        
        Args:
            html: HTML content to parse
            
        Returns:
            BeautifulSoup object
            
        Raises:
            ConversionError: If parsing fails
        """
        try:
            self._update_progress(30, "Parsing document...")
            return BeautifulSoup(html, 'html.parser')
        except Exception as e:
            raise ConversionError(f"Failed to parse HTML: {str(e)}")

    def clean_content(self, soup: BeautifulSoup) -> BeautifulSoup:
        """
        Clean and prepare HTML content
        
        Args:
            soup: BeautifulSoup object to clean
            
        Returns:
            Cleaned BeautifulSoup object
        """
        self._update_progress(50, "Cleaning content...")
        
        # Remove script and style elements
        for element in soup.find_all(['script', 'style']):
            element.decompose()
            
        # Remove navigation elements (common in documentation)
        for nav in soup.find_all(['nav', 'header', 'footer']):
            nav.decompose()
            
        # Remove meta elements
        for meta in soup.find_all('meta'):
            meta.decompose()
            
        # Remove comments
        for comment in soup.find_all(string=lambda text: isinstance(text, str) and text.strip().startswith('//')):
            comment.extract()
            
        return soup

    def convert_to_markdown(self, soup: BeautifulSoup) -> str:
        """Convert cleaned HTML to Markdown with safe JSON encoding"""
        try:
            self._update_progress(70, "Converting to markdown...")
            
            # Convert to markdown
            content = md(str(soup), escape_underscores=True, escape_asterisks=True)
            
            # Ensure content is a string
            if not isinstance(content, str):
                content = str(content)

            # Use custom JSON encoder to safely encode the content
            encoded_content = self.json_encoder.encode(content)
            # Remove surrounding quotes added by JSON encoder
            return json.loads(encoded_content)
            
        except Exception as e:
            raise ConversionError(f"Failed to convert to markdown: {str(e)}")

    def convert(self, url: str) -> Dict[str, str]:
        """Convert document at URL to markdown with safe JSON encoding"""
        try:
            html = self.fetch_content(url)
            soup = self.parse_html(html)
            cleaned_soup = self.clean_content(soup)
            markdown = self.convert_to_markdown(cleaned_soup)
            
            # Get title if available
            title = ""
            title_tag = cleaned_soup.find('title')
            if title_tag and title_tag.string:
                # Use custom JSON encoder for title
                encoded_title = self.json_encoder.encode(title_tag.string)
                title = json.loads(encoded_title)
            
            self._update_progress(100, "Conversion complete")
            
            # Use custom JSON encoder for final output
            result = {
                "markdown": markdown,
                "title": title,
                "url": url
            }
            
            return json.loads(self.json_encoder.encode(result))
            
        except Exception as e:
            raise ConversionError(f"Conversion failed: {str(e)}")

def convert_url_to_markdown(url: str, progress_callback: Optional[Callable[[int, str], None]] = None) -> Dict[str, str]:
    """
    Convenience function to convert URL to Markdown
    
    Args:
        url: URL to convert
        progress_callback: Optional callback for progress updates
        
    Returns:
        Dictionary with markdown content and metadata
    """
    converter = DocsConverter(progress_callback)
    return converter.convert(url)
