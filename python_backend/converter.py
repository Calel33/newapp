"""
Core conversion module for DocsToMarkdown
Handles web scraping and markdown conversion with progress tracking
"""

import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as md
from typing import Dict, Optional, Callable
import json

class ConversionError(Exception):
    """Custom exception for conversion errors"""
    pass

class DocsConverter:
    def __init__(self, progress_callback: Optional[Callable[[int, str], None]] = None):
        """
        Initialize the converter
        
        Args:
            progress_callback: Optional callback function for progress updates
                             Takes progress percentage and status message
        """
        self.progress_callback = progress_callback

    def _update_progress(self, progress: int, message: str):
        """Update conversion progress"""
        if self.progress_callback:
            self.progress_callback(progress, message)

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
            response = requests.get(url)
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
        """
        Convert cleaned HTML to Markdown
        
        Args:
            soup: Cleaned BeautifulSoup object
            
        Returns:
            Markdown string
            
        Raises:
            ConversionError: If conversion fails
        """
        try:
            self._update_progress(70, "Converting to markdown...")
            # Convert to markdown with proper escaping
            content = md(str(soup), escape_underscores=True, escape_asterisks=True)
            
            # Ensure content is properly escaped for JSON
            content = content.replace('\\', '\\\\')  # Escape backslashes
            content = content.replace('"', '\\"')    # Escape quotes
            content = content.replace('\n', '\\n')   # Escape newlines
            content = content.replace('\r', '\\r')   # Escape carriage returns
            content = content.replace('\t', '\\t')   # Escape tabs
            
            return content
        except Exception as e:
            raise ConversionError(f"Failed to convert to markdown: {str(e)}")

    def convert(self, url: str) -> Dict[str, str]:
        """
        Convert documentation from URL to Markdown
        
        Args:
            url: URL of documentation to convert
            
        Returns:
            Dictionary with markdown content and metadata
            
        Raises:
            ConversionError: If any step fails
        """
        try:
            self._update_progress(0, "Starting conversion...")
            
            # Fetch content
            html = self.fetch_content(url)
            
            # Parse HTML
            soup = self.parse_html(html)
            
            # Clean content
            cleaned_soup = self.clean_content(soup)
            
            # Convert to Markdown
            markdown = self.convert_to_markdown(cleaned_soup)
            
            # Get title
            title = cleaned_soup.title.string if cleaned_soup.title else "Converted Document"
            
            self._update_progress(100, "Conversion complete!")
            
            return {
                "title": title.strip(),
                "markdown": markdown.strip(),
                "source_url": url
            }
            
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
