"""
Agent 1: PDF Content Extraction.
Extracts substantive content from documents for business opportunity identification.
"""
from langchain_core.prompts import ChatPromptTemplate
from typing import Dict, Optional, List
import logging

from app.services.llm_factory import LLMFactory
from app.services.checkpoint import CheckpointManager
from app.services.pdf_loader import PDFLoader, chunk_text, estimate_tokens, get_max_tokens_for_provider
from app.services.agents.prompts import EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT

logger = logging.getLogger(__name__)


class Agent1Extraction:
    """Agent 1: Extracts substantive content from PDF documents."""

    def __init__(
        self,
        llm_factory: LLMFactory,
        checkpoint_manager: Optional[CheckpointManager] = None
    ):
        """
        Initialize Agent 1.

        Args:
            llm_factory: LLM factory for creating LLM instances
            checkpoint_manager: Optional checkpoint manager for caching
        """
        self.llm_factory = llm_factory
        self.checkpoint_manager = checkpoint_manager
        self.provider = llm_factory.provider

    def extract(self, document_content: str, sector: str) -> Dict:
        """
        Extract substantive information from document content.

        Args:
            document_content: Raw document text
            sector: Business sector for context

        Returns:
            Dict with extracted information and metadata
        """
        logger.info(f"Agent 1: Extracting content for sector '{sector}'")

        # Check checkpoint first
        if self.checkpoint_manager:
            cached_result = self.checkpoint_manager.load_checkpoint("agent1")
            if cached_result:
                logger.info("Agent 1: Using cached extraction result")
                return cached_result

        try:
            # Create LLM with low temperature for focused extraction
            llm = self.llm_factory.create_llm(temperature=0.3)

            # Check if content needs chunking
            max_tokens = get_max_tokens_for_provider(self.provider)
            estimated_tokens = estimate_tokens(document_content)

            if estimated_tokens > max_tokens:
                logger.info(f"Document too large ({estimated_tokens} tokens), chunking...")
                result = self._extract_chunked(llm, document_content, sector, max_tokens)
            else:
                result = self._extract_single(llm, document_content, sector)

            # Save checkpoint
            if self.checkpoint_manager:
                self.checkpoint_manager.save_checkpoint("agent1", result)

            return result

        except Exception as e:
            logger.error(f"Agent 1 extraction error: {e}")
            raise

    def _extract_single(self, llm, document_content: str, sector: str) -> Dict:
        """Extract from a single document (no chunking needed)."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", EXTRACTION_SYSTEM_PROMPT),
            ("user", EXTRACTION_USER_PROMPT)
        ])

        messages = prompt.format_messages(
            sector=sector,
            document_content=document_content
        )

        response = llm.invoke(messages)
        extracted_content = response.content

        logger.info(f"Agent 1: Extraction complete ({len(extracted_content)} chars)")

        return {
            "raw_output": extracted_content,
            "sector": sector,
            "num_chunks": 1,
            "original_length": len(document_content)
        }

    def _extract_chunked(
        self,
        llm,
        document_content: str,
        sector: str,
        max_tokens: int
    ) -> Dict:
        """Extract from multiple chunks and synthesize."""
        chunks = chunk_text(document_content, max_tokens)
        logger.info(f"Processing {len(chunks)} chunks...")

        chunk_extractions = []

        for i, chunk in enumerate(chunks):
            logger.info(f"Processing chunk {i+1}/{len(chunks)}...")

            prompt = ChatPromptTemplate.from_messages([
                ("system", EXTRACTION_SYSTEM_PROMPT),
                ("user", EXTRACTION_USER_PROMPT)
            ])

            messages = prompt.format_messages(
                sector=sector,
                document_content=chunk
            )

            response = llm.invoke(messages)
            chunk_extractions.append(response.content)

        # Combine chunk extractions
        combined_extraction = "\n\n---\n\n".join([
            f"[Chunk {i+1} Extraction]\n{ext}"
            for i, ext in enumerate(chunk_extractions)
        ])

        # If multiple chunks, do a final synthesis pass
        if len(chunks) > 1:
            synthesis_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are synthesizing multiple extraction results into a single coherent summary.
Combine the insights, remove redundancy, and create a unified analysis following the same structure as the inputs."""),
                ("user", """Synthesize these extraction results into a single coherent summary:

{extractions}

Maintain the original structure (KEY MARKET INSIGHTS, CRITICAL METRICS, etc.) but consolidate and deduplicate.""")
            ])

            messages = synthesis_prompt.format_messages(extractions=combined_extraction)
            response = llm.invoke(messages)
            final_extraction = response.content
        else:
            final_extraction = combined_extraction

        logger.info(f"Agent 1: Chunked extraction complete ({len(final_extraction)} chars)")

        return {
            "raw_output": final_extraction,
            "sector": sector,
            "num_chunks": len(chunks),
            "original_length": len(document_content)
        }
