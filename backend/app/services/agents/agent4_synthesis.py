"""
Agent 4: Synthesis Sub-Agents.
Three specialized sub-agents for summary, strengths, and concerns.
"""
from langchain_core.prompts import ChatPromptTemplate
from typing import Dict, Optional, List
import re
import logging

from app.services.llm_factory import LLMFactory
from app.services.checkpoint import CheckpointManager
from app.services.agents.prompts import (
    AGENT4_1_SYSTEM_PROMPT, AGENT4_1_USER_PROMPT,
    AGENT4_2_SYSTEM_PROMPT, AGENT4_2_USER_PROMPT,
    AGENT4_3_SYSTEM_PROMPT, AGENT4_3_USER_PROMPT
)

logger = logging.getLogger(__name__)


class Agent4Synthesis:
    """Agent 4: Synthesis sub-agents for summary, strengths, and concerns."""

    def __init__(
        self,
        llm_factory: LLMFactory,
        checkpoint_manager: Optional[CheckpointManager] = None
    ):
        """
        Initialize Agent 4.

        Args:
            llm_factory: LLM factory for creating LLM instances
            checkpoint_manager: Optional checkpoint manager for caching
        """
        self.llm_factory = llm_factory
        self.checkpoint_manager = checkpoint_manager

    def synthesize_all(
        self,
        business_idea: str,
        evaluations: List[Dict]
    ) -> Dict:
        """
        Run all three synthesis sub-agents.

        Args:
            business_idea: Original business idea from Agent 2
            evaluations: List of dimensional evaluations from Agent 3

        Returns:
            Dict with summary, strengths, and concerns
        """
        logger.info("Agent 4: Running synthesis sub-agents")

        # Agent 4.1: Generate business summary
        summary = self.generate_summary(business_idea, evaluations)

        # Agent 4.2: Identify key strengths
        strengths = self.identify_strengths(summary, evaluations)

        # Agent 4.3: Identify key concerns
        concerns = self.identify_concerns(summary, evaluations)

        return {
            "summary": summary,
            "strengths": strengths,
            "concerns": concerns
        }

    def generate_summary(
        self,
        business_idea: str,
        evaluations: List[Dict]
    ) -> str:
        """
        Agent 4.1: Generate business idea summary.

        Args:
            business_idea: Original business idea from Agent 2
            evaluations: List of dimensional evaluations

        Returns:
            Business summary (2-4 sentences)
        """
        logger.info("Agent 4.1: Generating business summary")

        # Check checkpoint first
        if self.checkpoint_manager:
            cached_result = self.checkpoint_manager.load_checkpoint("agent4_1")
            if cached_result:
                logger.info("Agent 4.1: Using cached summary")
                return cached_result.get("summary", "")

        try:
            llm = self.llm_factory.create_llm(temperature=0.5)

            # Prepare dimensional scores text
            dim_scores_text = "\n".join([
                f"- {e['dimension_name']}: {e['score']}/10"
                for e in sorted(evaluations, key=lambda x: x.get("score", 0) or 0, reverse=True)
            ])

            prompt = ChatPromptTemplate.from_messages([
                ("system", AGENT4_1_SYSTEM_PROMPT),
                ("user", AGENT4_1_USER_PROMPT)
            ])

            messages = prompt.format_messages(
                business_idea=business_idea,
                dim_scores=dim_scores_text
            )

            response = llm.invoke(messages)
            summary = response.content.strip()

            logger.info(f"Agent 4.1: Summary generated ({len(summary)} chars)")

            # Save checkpoint
            if self.checkpoint_manager:
                self.checkpoint_manager.save_checkpoint("agent4_1", {"summary": summary})

            return summary

        except Exception as e:
            logger.error(f"Agent 4.1 error: {e}")
            return "Summary generation failed"

    def identify_strengths(
        self,
        business_summary: str,
        evaluations: List[Dict]
    ) -> List[str]:
        """
        Agent 4.2: Identify top 3 key strengths.

        Args:
            business_summary: Summary from Agent 4.1
            evaluations: List of dimensional evaluations

        Returns:
            List of top 3 strengths
        """
        logger.info("Agent 4.2: Identifying key strengths")

        # Check checkpoint first
        if self.checkpoint_manager:
            cached_result = self.checkpoint_manager.load_checkpoint("agent4_2")
            if cached_result:
                logger.info("Agent 4.2: Using cached strengths")
                return cached_result.get("strengths", [])

        try:
            llm = self.llm_factory.create_llm(temperature=0.4)

            # Sort evaluations by score (highest first)
            sorted_evals = sorted(
                evaluations,
                key=lambda x: x.get("score", 0) or 0,
                reverse=True
            )

            # Prepare dimensional evaluations text
            dim_evals_text = "\n\n".join([
                f"{e['dimension_name']}: {e['score']}/10\n{e.get('raw_output', '')}"
                for e in sorted_evals[:5]  # Top 5 for context
            ])

            prompt = ChatPromptTemplate.from_messages([
                ("system", AGENT4_2_SYSTEM_PROMPT),
                ("user", AGENT4_2_USER_PROMPT)
            ])

            messages = prompt.format_messages(
                business_summary=business_summary,
                dim_evaluations=dim_evals_text
            )

            response = llm.invoke(messages)
            output = response.content.strip()

            # Parse bullet points
            strengths = self._parse_bullet_points(output)

            # Fallback if parsing failed
            if len(strengths) < 3:
                strengths = [
                    f"**{e['dimension_name']} ({e['score']}/10):** Strong performance in this dimension."
                    for e in sorted_evals[:3]
                ]

            logger.info(f"Agent 4.2: Identified {len(strengths)} strengths")

            # Save checkpoint
            if self.checkpoint_manager:
                self.checkpoint_manager.save_checkpoint("agent4_2", {"strengths": strengths})

            return strengths[:3]

        except Exception as e:
            logger.error(f"Agent 4.2 error: {e}")
            top_3 = sorted(evaluations, key=lambda x: x.get("score", 0) or 0, reverse=True)[:3]
            return [
                f"**{e['dimension_name']} ({e['score']}/10):** Strong performance."
                for e in top_3
            ]

    def identify_concerns(
        self,
        business_summary: str,
        evaluations: List[Dict]
    ) -> List[str]:
        """
        Agent 4.3: Identify top 3 key concerns.

        Args:
            business_summary: Summary from Agent 4.1
            evaluations: List of dimensional evaluations

        Returns:
            List of top 3 concerns
        """
        logger.info("Agent 4.3: Identifying key concerns")

        # Check checkpoint first
        if self.checkpoint_manager:
            cached_result = self.checkpoint_manager.load_checkpoint("agent4_3")
            if cached_result:
                logger.info("Agent 4.3: Using cached concerns")
                return cached_result.get("concerns", [])

        try:
            llm = self.llm_factory.create_llm(temperature=0.4)

            # Sort evaluations by score (lowest first)
            sorted_evals = sorted(
                evaluations,
                key=lambda x: x.get("score", 0) or 0
            )

            # Prepare dimensional evaluations text
            dim_evals_text = "\n\n".join([
                f"{e['dimension_name']}: {e['score']}/10\n{e.get('raw_output', '')}"
                for e in sorted_evals[:5]  # Bottom 5 for context
            ])

            prompt = ChatPromptTemplate.from_messages([
                ("system", AGENT4_3_SYSTEM_PROMPT),
                ("user", AGENT4_3_USER_PROMPT)
            ])

            messages = prompt.format_messages(
                business_summary=business_summary,
                dim_evaluations=dim_evals_text
            )

            response = llm.invoke(messages)
            output = response.content.strip()

            # Parse bullet points
            concerns = self._parse_bullet_points(output)

            # Fallback if parsing failed
            if len(concerns) < 3:
                concerns = [
                    f"**{e['dimension_name']} ({e['score']}/10):** Lower score indicates potential challenges."
                    for e in sorted_evals[:3]
                ]

            logger.info(f"Agent 4.3: Identified {len(concerns)} concerns")

            # Save checkpoint
            if self.checkpoint_manager:
                self.checkpoint_manager.save_checkpoint("agent4_3", {"concerns": concerns})

            return concerns[:3]

        except Exception as e:
            logger.error(f"Agent 4.3 error: {e}")
            bottom_3 = sorted(evaluations, key=lambda x: x.get("score", 0) or 0)[:3]
            return [
                f"**{e['dimension_name']} ({e['score']}/10):** Potential challenges."
                for e in bottom_3
            ]

    def _parse_bullet_points(self, output: str) -> List[str]:
        """Parse bullet points from output."""
        items = []
        for line in output.split('\n'):
            line = line.strip()
            if line.startswith('- **') or line.startswith('* **') or line.startswith('• **'):
                # Remove leading bullet
                clean_line = re.sub(r'^[-*•]\s*', '', line)
                items.append(clean_line)
        return items
