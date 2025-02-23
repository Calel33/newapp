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
            
            # Convert to markdown
            content = md(str(soup), escape_underscores=True, escape_asterisks=True)
            
            # Handle potential JSON-breaking characters
            if not isinstance(content, str):
                content = str(content)
                
            # Use Python's built-in JSON string escaping
            content = json.dumps(content)[1:-1]  # Remove the surrounding quotes
            
            return content
            
        except Exception as e:
            raise ConversionError(f"Failed to convert to markdown: {str(e)}")

    def convert(self, url: str) -> Dict[str, str]:
        """
        Convert document at URL to markdown
        
        Args:
            url: URL to convert
            
        Returns:
            Dictionary with markdown content and metadata
            
        Raises:
            ConversionError: If conversion fails
        """
        try:
            html = self.fetch_content(url)
            soup = self.parse_html(html)
            cleaned_soup = self.clean_content(soup)
            markdown = self.convert_to_markdown(cleaned_soup)
            
            # Get title if available
            title = ""
            title_tag = cleaned_soup.find('title')
            if title_tag:
                title = title_tag.string or ""
            
            # Ensure all text is JSON-safe
            if not isinstance(title, str):
                title = str(title)
            title = json.dumps(title)[1:-1]  # Remove the surrounding quotes
            
            self._update_progress(100, "Conversion complete")
            
            return {
                "markdown": markdown,
                "title": title,
                "url": url
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
