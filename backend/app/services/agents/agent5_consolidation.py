"""
Agent 5: Final Consolidation.
Consolidates all outputs into final JSON report with overall score and recommendation.
"""
from langchain_core.prompts import ChatPromptTemplate
from typing import Dict, Optional, List
import logging

from app.services.llm_factory import LLMFactory
from app.services.checkpoint import CheckpointManager
from app.services.agents.prompts import (
    DIMENSION_WEIGHTS,
    AGENT5_RATIONALE_SYSTEM_PROMPT,
    AGENT5_RATIONALE_USER_PROMPT
)

logger = logging.getLogger(__name__)


class Agent5Consolidation:
    """Agent 5: Final consolidation and report generation."""

    def __init__(
        self,
        llm_factory: LLMFactory,
        checkpoint_manager: Optional[CheckpointManager] = None
    ):
        """
        Initialize Agent 5.

        Args:
            llm_factory: LLM factory for creating LLM instances
            checkpoint_manager: Optional checkpoint manager for caching
        """
        self.llm_factory = llm_factory
        self.checkpoint_manager = checkpoint_manager
        self.dimension_weights = DIMENSION_WEIGHTS

    def consolidate(
        self,
        business_summary: str,
        key_strengths: List[str],
        key_concerns: List[str],
        evaluations: List[Dict]
    ) -> Dict:
        """
        Consolidate all outputs into final report.

        Args:
            business_summary: Summary from Agent 4.1
            key_strengths: Strengths from Agent 4.2
            key_concerns: Concerns from Agent 4.3
            evaluations: Dimensional evaluations from Agent 3

        Returns:
            Final comprehensive report dict
        """
        logger.info("Agent 5: Consolidating final report")

        # Check checkpoint first
        if self.checkpoint_manager:
            cached_result = self.checkpoint_manager.load_checkpoint("agent5")
            if cached_result:
                logger.info("Agent 5: Using cached final report")
                return cached_result

        try:
            # Calculate overall score
            overall_score = self.calculate_overall_score(evaluations)
            recommendation = self.get_recommendation(overall_score)

            # Generate rationale
            rationale = self.generate_rationale(
                overall_score,
                recommendation,
                key_strengths,
                key_concerns,
                evaluations
            )

            # Build final report
            final_report = {
                "business_idea_summary": business_summary,
                "dimensional_scores": [
                    {
                        "dimension": eval_data["dimension_name"],
                        "score": eval_data["score"],
                        "reasoning": eval_data.get("raw_output", "")
                    }
                    for eval_data in evaluations
                ],
                "key_strengths": key_strengths,
                "key_concerns": key_concerns,
                "overall_score": overall_score,
                "recommendation": recommendation,
                "recommendation_rationale": rationale
            }

            # Save checkpoint
            if self.checkpoint_manager:
                self.checkpoint_manager.save_checkpoint("agent5", final_report)

            logger.info(f"Agent 5: Final report complete (Score: {overall_score}/10, {recommendation})")

            return final_report

        except Exception as e:
            logger.error(f"Agent 5 consolidation error: {e}")
            raise

    def calculate_overall_score(self, evaluations: List[Dict]) -> float:
        """
        Calculate weighted overall score from dimensional evaluations.

        Args:
            evaluations: List of dimensional evaluations

        Returns:
            Weighted overall score (0-10)
        """
        weighted_sum = 0.0

        for eval_data in evaluations:
            dim_name = eval_data.get("dimension_name")
            score = eval_data.get("score", 0) or 0
            weight = self.dimension_weights.get(dim_name, 0)
            weighted_sum += score * weight

        return round(weighted_sum, 1)

    def get_recommendation(self, overall_score: float) -> str:
        """
        Determine recommendation based on overall score.

        Args:
            overall_score: Weighted overall score

        Returns:
            Recommendation tier string
        """
        if overall_score >= 8.0:
            return "STRONG_PROCEED"
        elif overall_score >= 6.0:
            return "CONDITIONAL_PROCEED"
        elif overall_score >= 4.0:
            return "REQUIRES_REFINEMENT"
        else:
            return "REJECT"

    def generate_rationale(
        self,
        overall_score: float,
        recommendation: str,
        strengths: List[str],
        concerns: List[str],
        evaluations: List[Dict]
    ) -> str:
        """
        Generate recommendation rationale using AI.

        Args:
            overall_score: Weighted overall score
            recommendation: Recommendation tier
            strengths: Key strengths from Agent 4.2
            concerns: Key concerns from Agent 4.3
            evaluations: Dimensional evaluations

        Returns:
            Recommendation rationale (2-3 sentences)
        """
        logger.info("Agent 5: Generating recommendation rationale")

        try:
            llm = self.llm_factory.create_llm(temperature=0.5)

            # Prepare inputs
            strengths_text = "\n".join([f"- {s}" for s in strengths])
            concerns_text = "\n".join([f"- {c}" for c in concerns])
            dim_scores_text = "\n".join([
                f"- {e['dimension_name']}: {e['score']}/10"
                for e in sorted(evaluations, key=lambda x: x.get("score", 0) or 0, reverse=True)
            ])

            prompt = ChatPromptTemplate.from_messages([
                ("system", AGENT5_RATIONALE_SYSTEM_PROMPT),
                ("user", AGENT5_RATIONALE_USER_PROMPT)
            ])

            messages = prompt.format_messages(
                overall_score=overall_score,
                recommendation=recommendation,
                strengths=strengths_text,
                concerns=concerns_text,
                dim_scores=dim_scores_text
            )

            response = llm.invoke(messages)
            rationale = response.content.strip()

            logger.info(f"Agent 5: Rationale generated ({len(rationale)} chars)")

            return rationale

        except Exception as e:
            logger.error(f"Agent 5 rationale error: {e}")
            # Fallback rationale
            return (
                f"With an overall score of {overall_score}/10, this business idea shows "
                f"{recommendation.lower().replace('_', ' ')} potential based on the "
                f"comprehensive evaluation across 11 dimensions."
            )
