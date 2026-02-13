"""
Agent 2: Business Idea Generation.
Generates viable business ideas based on extracted market intelligence.
"""
from langchain_core.prompts import ChatPromptTemplate
from typing import Dict, Optional, List
import logging

from app.services.llm_factory import LLMFactory
from app.services.checkpoint import CheckpointManager
from app.services.agents.prompts import IDEA_GENERATION_SYSTEM_PROMPT, IDEA_GENERATION_USER_PROMPT

logger = logging.getLogger(__name__)


class Agent2Ideas:
    """Agent 2: Generates business ideas from market intelligence."""

    def __init__(
        self,
        llm_factory: LLMFactory,
        checkpoint_manager: Optional[CheckpointManager] = None
    ):
        """
        Initialize Agent 2.

        Args:
            llm_factory: LLM factory for creating LLM instances
            checkpoint_manager: Optional checkpoint manager for caching
        """
        self.llm_factory = llm_factory
        self.checkpoint_manager = checkpoint_manager

    def generate(
        self,
        extraction_output: str,
        sector: str,
        num_ideas: int = 3
    ) -> Dict:
        """
        Generate business ideas based on extracted market intelligence.

        Args:
            extraction_output: Substantive content from Agent 1
            sector: Business sector for context
            num_ideas: Number of ideas to generate (default: 3)

        Returns:
            Dict with generated business ideas and metadata
        """
        logger.info(f"Agent 2: Generating {num_ideas} business ideas for '{sector}'")

        # Check checkpoint first
        if self.checkpoint_manager:
            cached_result = self.checkpoint_manager.load_checkpoint("agent2")
            if cached_result:
                logger.info("Agent 2: Using cached ideas result")
                return cached_result

        try:
            # Create LLM with higher temperature for creativity
            llm = self.llm_factory.create_llm(temperature=0.8)

            # Create prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", IDEA_GENERATION_SYSTEM_PROMPT),
                ("user", IDEA_GENERATION_USER_PROMPT)
            ])

            messages = prompt.format_messages(
                sector=sector,
                num_ideas=num_ideas,
                extracted_info=extraction_output
            )

            response = llm.invoke(messages)
            ideas_output = response.content

            logger.info(f"Agent 2: Generated ideas ({len(ideas_output)} chars)")

            result = {
                "raw_output": ideas_output,
                "sector": sector,
                "num_ideas_requested": num_ideas
            }

            # Save checkpoint
            if self.checkpoint_manager:
                self.checkpoint_manager.save_checkpoint("agent2", result)

            return result

        except Exception as e:
            logger.error(f"Agent 2 generation error: {e}")
            raise

    @staticmethod
    def parse_ideas(ideas_output: str) -> List[str]:
        """
        Parse individual business ideas from Agent 2's output.

        Args:
            ideas_output: Raw output from Agent 2

        Returns:
            List of individual business idea strings
        """
        ideas = ideas_output.split("### BUSINESS IDEA #")
        parsed_ideas = []
        for idea in ideas[1:]:  # Skip the first empty split
            parsed_ideas.append("### BUSINESS IDEA #" + idea.strip())
        return parsed_ideas
