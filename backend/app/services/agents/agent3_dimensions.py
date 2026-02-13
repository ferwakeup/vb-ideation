"""
Agent 3: Dimensional Evaluation.
Evaluates business ideas across 11 specialized dimensions.
"""
from langchain_core.prompts import ChatPromptTemplate
from typing import Dict, Optional, List, Callable
import re
import logging

from app.services.llm_factory import LLMFactory
from app.services.checkpoint import CheckpointManager
from app.services.agents.prompts import (
    DIMENSIONS,
    DIMENSION_EVALUATION_SYSTEM_PROMPT,
    DIMENSION_EVALUATION_USER_PROMPT
)

logger = logging.getLogger(__name__)


class Agent3Dimensions:
    """Agent 3: Evaluates business ideas across 11 dimensions."""

    def __init__(
        self,
        llm_factory: LLMFactory,
        checkpoint_manager: Optional[CheckpointManager] = None
    ):
        """
        Initialize Agent 3.

        Args:
            llm_factory: LLM factory for creating LLM instances
            checkpoint_manager: Optional checkpoint manager for caching
        """
        self.llm_factory = llm_factory
        self.checkpoint_manager = checkpoint_manager
        self.dimensions = DIMENSIONS

    def evaluate_all(
        self,
        business_idea: str,
        sector_context: str,
        sector: str,
        progress_callback: Optional[Callable[[int], None]] = None
    ) -> List[Dict]:
        """
        Evaluate business idea across all 11 dimensions.

        Args:
            business_idea: Business idea text from Agent 2
            sector_context: Market context from Agent 1
            sector: Sector being analyzed
            progress_callback: Optional callback for progress updates.
                Called with dimension index (0-10) when starting,
                and with negative (-(index+1)) when completing.

        Returns:
            List of evaluation results for all dimensions
        """
        logger.info("Agent 3: Starting evaluation across all 11 dimensions")

        evaluations = []

        for idx, dimension in enumerate(self.dimensions):
            # Report progress start
            if progress_callback:
                progress_callback(idx)

            # Try to load from checkpoint first
            checkpoint_name = f"agent3_{dimension['id']}"

            if self.checkpoint_manager:
                cached_eval = self.checkpoint_manager.load_checkpoint(checkpoint_name)
                if cached_eval:
                    logger.info(f"Agent 3.{dimension['id']}: Using cached evaluation for '{dimension['name']}'")
                    evaluations.append(cached_eval)
                    # Report progress complete
                    if progress_callback:
                        progress_callback(-(idx + 1))
                    continue

            # Run evaluation
            evaluation = self.evaluate_dimension(
                dimension, business_idea, sector_context, sector
            )
            if evaluation:
                evaluations.append(evaluation)

            # Report progress complete
            if progress_callback:
                progress_callback(-(idx + 1))

        logger.info(f"Agent 3: Completed {len(evaluations)}/11 dimensional evaluations")
        return evaluations

    def evaluate_dimension(
        self,
        dimension: Dict,
        business_idea: str,
        sector_context: str,
        sector: str
    ) -> Optional[Dict]:
        """
        Evaluate a business idea on a specific dimension.

        Args:
            dimension: Dimension definition dict
            business_idea: Business idea text
            sector_context: Market context from Agent 1
            sector: Sector being analyzed

        Returns:
            Dict with evaluation result or None on error
        """
        dim_name = dimension["name"]
        dim_id = dimension["id"]
        logger.info(f"Agent 3.{dim_id}: Evaluating '{dim_name}'")

        try:
            # Create LLM with medium-low temperature for consistent evaluation
            llm = self.llm_factory.create_llm(temperature=0.4)

            # Format key questions as numbered list
            questions_formatted = "\n".join([
                f"{i+1}. {q}" for i, q in enumerate(dimension["key_questions"])
            ])

            # Create system prompt with dimension info
            system_prompt = DIMENSION_EVALUATION_SYSTEM_PROMPT.format(
                dimension_name=dim_name,
                dimension_description=dimension["description"],
                key_questions=questions_formatted,
                looks_for=dimension["looks_for"]
            )

            user_prompt = DIMENSION_EVALUATION_USER_PROMPT.format(
                sector=sector,
                dimension_name=dim_name,
                sector_context=sector_context,
                business_idea=business_idea
            )

            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("user", user_prompt)
            ])

            messages = prompt.format_messages()
            response = llm.invoke(messages)
            result = response.content

            # Parse score from output
            score = self._parse_score(result)

            logger.info(f"Agent 3.{dim_id}: Score {score}/10 for '{dim_name}'")

            evaluation_result = {
                "dimension_id": dim_id,
                "dimension_name": dim_name,
                "score": score,
                "raw_output": result
            }

            # Save checkpoint
            if self.checkpoint_manager:
                checkpoint_name = f"agent3_{dim_id}"
                self.checkpoint_manager.save_checkpoint(checkpoint_name, evaluation_result)

            return evaluation_result

        except Exception as e:
            logger.error(f"Agent 3.{dim_id} evaluation error: {e}")
            return None

    def _parse_score(self, result: str) -> Optional[float]:
        """
        Parse score from evaluation output.

        Args:
            result: Raw evaluation output

        Returns:
            Parsed score or None
        """
        try:
            # Look for pattern like "Score: 8/10" or "**Score:** 8/10"
            score_match = re.search(
                r'\*\*Score:\*\*\s*(\d+(?:\.\d+)?)/10|\bScore:\s*(\d+(?:\.\d+)?)/10',
                result
            )
            if score_match:
                score = float(score_match.group(1) or score_match.group(2))
                return min(10, max(0, score))  # Clamp to 0-10
        except Exception:
            pass
        return None

    @staticmethod
    def get_dimension_by_id(dim_id: int) -> Optional[Dict]:
        """Get dimension definition by ID."""
        for dim in DIMENSIONS:
            if dim["id"] == dim_id:
                return dim
        return None
