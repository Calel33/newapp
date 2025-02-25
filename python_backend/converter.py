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

def clean_for_json(text: str) -> str:
    """Clean text to make it safe for JSON encoding"""
    if not isinstance(text, str):
        text = str(text)
        
    # Replace JSON-breaking characters
    text = text.replace('\\', '\\\\')  # Must be first
    text = text.replace('"', '\\"')
    text = text.replace('\b', '\\b')
    text = text.replace('\f', '\\f')
    text = text.replace('\n', '\\n')
    text = text.replace('\r', '\\r')
    text = text.replace('\t', '\\t')
    
    # Handle other control characters
    text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
    
    # Handle Unicode line/paragraph separators
    text = text.replace('\u2028', ' ')
    text = text.replace('\u2029', ' ')
    
    return text

def chunk_content(content: str, chunk_size: int = 5000) -> list:
    """Split content into manageable chunks with smart splitting"""
    chunks = []
    current_chunk = []
    current_size = 0
    
    # Add header to identify multi-part content
    is_multipart = len(content) > chunk_size
    
    for line in content.split('\n'):
        line_size = len(line)
        
        # If adding this line would exceed chunk size
        if current_size + line_size > chunk_size and current_chunk:
            # Try to find a natural break point
            chunk_text = '\n'.join(current_chunk)
            
            # Add part identifier if multipart
            if is_multipart:
                chunk_text = f"[Part {len(chunks) + 1}]\n\n" + chunk_text
            
            chunks.append(chunk_text)
            current_chunk = [line]
            current_size = line_size
        else:
            current_chunk.append(line)
            current_size += line_size
    
    # Handle remaining content
    if current_chunk:
        chunk_text = '\n'.join(current_chunk)
        if is_multipart:
            chunk_text = f"[Part {len(chunks) + 1}]\n\n" + chunk_text
        chunks.append(chunk_text)
    
    return chunks

class DocsConverter:
    def __init__(self, progress_callback: Optional[Callable[[int, str], None]] = None):
        self.progress_callback = progress_callback

    def _update_progress(self, progress: int, message: str):
        """Update conversion progress"""
        if self.progress_callback:
            try:
                safe_message = clean_for_json(message)
                self.progress_callback(progress, safe_message)
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
        """Convert cleaned HTML to Markdown with improved multi-part handling"""
        try:
            self._update_progress(70, "Converting to markdown...")
            
            # Convert to markdown
            content = md(str(soup), escape_underscores=True, escape_asterisks=True)
            
            # Clean and chunk the content
            cleaned_content = clean_for_json(content)
            chunks = chunk_content(cleaned_content)
            
            # Process chunks and combine with proper part handling
            processed_chunks = []
            total_chunks = len(chunks)
            
            for i, chunk in enumerate(chunks, 1):
                self._update_progress(
                    70 + (20 * i // total_chunks),
                    f"Processing chunk {i}/{total_chunks}"
                )
                
                # Add separator between parts for better readability
                if i > 1:
                    processed_chunks.append("\n---\n")
                
                # Add chunk with proper formatting
                processed_chunks.append(chunk)
            
            # Join all parts with proper spacing
            final_content = '\n\n'.join(processed_chunks)
            
            # Add total parts information if multiple chunks
            if total_chunks > 1:
                final_content = f"Total Parts: {total_chunks}\n\n" + final_content
            
            return final_content
            
        except Exception as e:
            raise ConversionError(f"Failed to convert to markdown: {str(e)}")

    def convert(self, url: str) -> Dict[str, str]:
        """Convert document at URL to markdown"""
        try:
            html = self.fetch_content(url)
            soup = self.parse_html(html)
            cleaned_soup = self.clean_content(soup)
            markdown = self.convert_to_markdown(cleaned_soup)
            
            # Get title if available
            title = ""
            title_tag = cleaned_soup.find('title')
            if title_tag and title_tag.string:
                title = clean_for_json(title_tag.string)
            
            self._update_progress(100, "Conversion complete")
            
            result = {
                "markdown": markdown,
                "title": title,
                "url": url
            }
            
            # Final safety check
            try:
                # Test if the result can be JSON encoded
                json.dumps(result)
                return result
            except Exception as json_error:
                raise ConversionError(f"Failed to encode result as JSON: {str(json_error)}")
            
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
