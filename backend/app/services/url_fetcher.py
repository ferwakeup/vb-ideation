"""
Service for fetching and extracting content from URLs.
"""
import httpx
from bs4 import BeautifulSoup
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class URLFetcher:
    """Fetches and extracts clean text content from URLs."""

    def __init__(self):
        self.timeout = 30.0
        self.max_content_length = 50000  # characters

    async def fetch_content(self, url: str) -> Optional[str]:
        """
        Fetch and extract text content from a URL.

        Args:
            url: The URL to fetch content from

        Returns:
            Cleaned text content, or None if fetch fails

        Raises:
            httpx.HTTPError: If the request fails
        """
        try:
            logger.info(f"Fetching content from: {url}")

            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(
                    url,
                    timeout=self.timeout,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                    }
                )
                response.raise_for_status()

                # Parse HTML
                soup = BeautifulSoup(response.text, 'html.parser')

                # Remove script, style, and other non-content elements
                for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe']):
                    element.decompose()

                # Get text content
                text = soup.get_text()

                # Clean up whitespace
                lines = (line.strip() for line in text.splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                text = ' '.join(chunk for chunk in chunks if chunk)

                # Limit length
                if len(text) > self.max_content_length:
                    logger.warning(f"Content from {url} exceeds max length, truncating")
                    text = text[:self.max_content_length]

                logger.info(f"Successfully fetched {len(text)} characters from {url}")
                return text

        except httpx.TimeoutException:
            logger.error(f"Timeout fetching {url}")
            raise Exception(f"Timeout while fetching {url}")
        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching {url}: {e}")
            raise Exception(f"Failed to fetch {url}: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error fetching {url}: {e}")
            raise Exception(f"Error processing {url}: {str(e)}")

    async def fetch_multiple(self, urls: list[str]) -> dict[str, str]:
        """
        Fetch content from multiple URLs.

        Args:
            urls: List of URLs to fetch

        Returns:
            Dictionary mapping URLs to their content
        """
        results = {}

        for url in urls:
            try:
                content = await self.fetch_content(url)
                if content:
                    results[url] = content
            except Exception as e:
                logger.error(f"Failed to fetch {url}: {e}")
                # Continue with other URLs even if one fails
                results[url] = f"[Error fetching content: {str(e)}]"

        return results
