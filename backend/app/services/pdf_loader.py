"""
PDF Loader Service.
Loads and extracts text content from PDF files using PyMuPDF.
"""
from langchain_community.document_loaders import PyMuPDFLoader
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)


def estimate_tokens(text: str) -> int:
    """
    Estimate token count for text (rough approximation: 1 token ~ 4 characters).

    Args:
        text: Text to estimate

    Returns:
        Estimated token count
    """
    return len(text) // 4


def chunk_text(text: str, max_tokens: int) -> List[str]:
    """
    Split text into chunks that fit within token limit.
    Tries to split on paragraph boundaries for better context.

    Args:
        text: Text to chunk
        max_tokens: Maximum tokens per chunk

    Returns:
        List of text chunks
    """
    max_chars = max_tokens * 4

    if len(text) <= max_chars:
        return [text]

    chunks = []
    current_chunk = ""

    paragraphs = text.split('\n\n')

    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 > max_chars:
            if current_chunk:
                chunks.append(current_chunk)
                current_chunk = para
            else:
                # Single paragraph is too large, split it
                for i in range(0, len(para), max_chars):
                    chunks.append(para[i:i + max_chars])
        else:
            if current_chunk:
                current_chunk += "\n\n" + para
            else:
                current_chunk = para

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def get_max_tokens_for_provider(provider: str) -> int:
    """
    Get maximum safe input tokens for a provider.
    Leaves room for system prompt and response.

    Args:
        provider: LLM provider name

    Returns:
        Maximum safe tokens for document content
    """
    provider_limits = {
        "groq": 8000,         # Conservative for Groq's TPM limits
        "anthropic": 150000,  # Claude has 200K context
        "openai": 100000,     # GPT-4o has 128K context
        "google": 900000,     # Gemini 1.5 Pro has 2M context, conservative limit
        "ollama": 8000        # Conservative default
    }
    return provider_limits.get(provider.lower(), 8000)


def load_pdf(pdf_path: str) -> Tuple[str, dict]:
    """
    Load PDF and return text content using PyMuPDF for better extraction quality.

    Args:
        pdf_path: Path to the PDF file

    Returns:
        Tuple of (extracted text content, metadata dict)
    """
    logger.info(f"Loading PDF: {pdf_path}")

    loader = PyMuPDFLoader(pdf_path)
    documents = loader.load()

    content = "\n\n".join([doc.page_content for doc in documents])

    metadata = {
        "num_pages": len(documents),
        "num_characters": len(content),
        "estimated_tokens": estimate_tokens(content)
    }

    logger.info(
        f"Loaded {metadata['num_characters']:,} characters from "
        f"{metadata['num_pages']} pages (est. {metadata['estimated_tokens']:,} tokens)"
    )

    return content, metadata


class PDFLoader:
    """Service for loading and processing PDF documents."""

    def __init__(self, provider: str = "anthropic"):
        """
        Initialize PDF loader.

        Args:
            provider: LLM provider (affects chunking limits)
        """
        self.provider = provider
        self.max_tokens = get_max_tokens_for_provider(provider)

    def load(self, pdf_path: str) -> Tuple[str, dict]:
        """
        Load a PDF file.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Tuple of (content, metadata)
        """
        return load_pdf(pdf_path)

    def load_chunked(self, pdf_path: str) -> Tuple[List[str], dict]:
        """
        Load a PDF file and split into chunks if needed.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Tuple of (list of content chunks, metadata)
        """
        content, metadata = load_pdf(pdf_path)
        chunks = chunk_text(content, self.max_tokens)
        metadata["num_chunks"] = len(chunks)
        return chunks, metadata
