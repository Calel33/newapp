"""
Test suite for DocsToMarkdown converter
"""

import unittest
from unittest.mock import MagicMock, patch
from converter import DocsConverter, ConversionError
import requests

class TestDocsConverter(unittest.TestCase):
    def setUp(self):
        self.converter = DocsConverter()
        self.test_url = "https://docs.python.org/3/tutorial/introduction.html"
        self.mock_progress = MagicMock()
        self.converter_with_progress = DocsConverter(self.mock_progress)

    def test_valid_url_fetch(self):
        """Test fetching content from a valid URL"""
        content = self.converter.fetch_content(self.test_url)
        self.assertIsInstance(content, str)
        self.assertGreater(len(content), 0)

    def test_invalid_url_fetch(self):
        """Test fetching content from an invalid URL"""
        with self.assertRaises(ConversionError):
            self.converter.fetch_content("https://invalid-url-that-does-not-exist.com")

    def test_html_parsing(self):
        """Test HTML parsing"""
        test_html = "<html><body><h1>Test</h1><p>Content</p></body></html>"
        soup = self.converter.parse_html(test_html)
        self.assertEqual(soup.h1.text, "Test")
        self.assertEqual(soup.p.text, "Content")

    def test_content_cleaning(self):
        """Test content cleaning"""
        test_html = """
        <html>
            <body>
                <nav>Navigation</nav>
                <script>alert('test')</script>
                <style>.test{color:red}</style>
                <h1>Content</h1>
            </body>
        </html>
        """
        soup = self.converter.parse_html(test_html)
        cleaned = self.converter.clean_content(soup)
        
        # Check that unwanted elements are removed
        self.assertIsNone(cleaned.find('nav'))
        self.assertIsNone(cleaned.find('script'))
        self.assertIsNone(cleaned.find('style'))
        
        # Check that content is preserved
        self.assertIsNotNone(cleaned.find('h1'))

    def test_markdown_conversion(self):
        """Test markdown conversion"""
        test_html = "<h1>Title</h1><p>Content</p>"
        soup = self.converter.parse_html(test_html)
        markdown = self.converter.convert_to_markdown(soup)
        
        # Check for title and content in any markdown header format
        self.assertTrue(any(title in markdown for title in ["# Title", "Title\n====="]))
        self.assertIn("Content", markdown)

    def test_progress_tracking(self):
        """Test progress callback"""
        self.converter_with_progress.fetch_content(self.test_url)
        
        # Verify that progress callback was called
        self.mock_progress.assert_called()
        
        # Verify progress percentage and message format
        args = self.mock_progress.call_args_list[0][0]
        self.assertIsInstance(args[0], int)  # Progress percentage
        self.assertIsInstance(args[1], str)  # Status message

    @patch('requests.get')
    def test_network_timeout(self, mock_get):
        """Test network timeout handling"""
        mock_get.side_effect = requests.Timeout()
        
        with self.assertRaises(ConversionError) as context:
            self.converter.fetch_content("https://example.com")
        
        self.assertIn("Failed to fetch content", str(context.exception))

    def test_full_conversion(self):
        """Test full conversion process"""
        result = self.converter.convert(self.test_url)
        
        self.assertIsInstance(result, dict)
        self.assertIn('title', result)
        self.assertIn('markdown', result)
        self.assertIn('source_url', result)
        self.assertEqual(result['source_url'], self.test_url)

if __name__ == '__main__':
    unittest.main()
