"""
Main orchestration service for scoring business ideas.
"""
import asyncio
from datetime import datetime
from typing import List
import logging
from app.services.url_fetcher import URLFetcher
from app.services.ai_service import AIService
from app.models.score import IdeaScore, DimensionScore
from app.utils.prompts import SCORING_DIMENSIONS
from app.utils.aggregation import calculate_weighted_score, generate_recommendation

logger = logging.getLogger(__name__)


class IdeaScorer:
    """
    Main service that orchestrates the entire scoring process.

    Flow:
    1. Fetch content from URLs
    2. Extract idea summary
    3. Score all dimensions in parallel
    4. Calculate weighted overall score
    5. Generate recommendation
    6. Extract key insights
    """

    def __init__(self, model: str = "gpt-4o", openai_api_key: str = "", google_api_key: str = ""):
        """
        Initialize the scorer with required services.

        Args:
            model: AI model to use (default: gpt-4o)
            openai_api_key: OpenAI API key (if using OpenAI models)
            google_api_key: Google API key (if using Gemini models)
        """
        self.url_fetcher = URLFetcher()
        self.ai_service = AIService(
            model=model,
            openai_api_key=openai_api_key,
            google_api_key=google_api_key
        )
        self.model = model

    async def score_idea(self, urls: List[str]) -> IdeaScore:
        """
        Score a business idea from one or more URLs.

        Args:
            urls: List of URLs containing information about the business idea

        Returns:
            Complete IdeaScore object with all dimensions scored

        Raises:
            Exception: If any critical step fails
        """
        try:
            logger.info(f"Starting to score idea from {len(urls)} URL(s)")

            # Step 1: Fetch content from all URLs
            logger.info("Step 1: Fetching URL content")
            url_contents = await self.url_fetcher.fetch_multiple(urls)

            # Combine all content with source attribution
            combined_content = "\n\n---\n\n".join([
                f"Source: {url}\n\n{content}"
                for url, content in url_contents.items()
            ])

            if not combined_content or len(combined_content) < 100:
                raise Exception("Insufficient content fetched from URLs")

            logger.info(f"Fetched {len(combined_content)} characters of content")

            # Step 2: Extract idea summary
            logger.info("Step 2: Extracting idea summary")
            idea_summary = await self.ai_service.extract_idea_summary(combined_content)

            # Step 3: Score all dimensions in parallel
            logger.info("Step 3: Scoring all dimensions in parallel")
            dimension_scores = await self._score_all_dimensions(combined_content)

            # Step 4: Calculate overall score and recommendation
            logger.info("Step 4: Calculating overall score")
            overall_score = calculate_weighted_score(dimension_scores)
            recommendation = generate_recommendation(overall_score, dimension_scores)

            # Step 5: Extract key insights
            logger.info("Step 5: Extracting key insights")
            dimension_scores_for_insights = [
                {
                    "dimension": ds.dimension,
                    "score": ds.score,
                    "reasoning": ds.reasoning
                }
                for ds in dimension_scores
            ]
            insights = await self.ai_service.extract_insights(dimension_scores_for_insights)

            # Calculate total tokens and cost
            total_tokens = 0
            total_cost = 0.0
            for dim_score in dimension_scores:
                if dim_score.token_usage:
                    total_tokens += dim_score.token_usage.total_tokens
                    total_cost += dim_score.token_usage.cost_usd

            # Build final result
            result = IdeaScore(
                idea_summary=idea_summary,
                url_source=", ".join(urls),
                dimension_scores=dimension_scores,
                overall_score=overall_score,
                recommendation=recommendation,
                key_strengths=insights["strengths"],
                key_concerns=insights["concerns"],
                timestamp=datetime.utcnow().isoformat() + "Z",
                model_used=self.model,
                total_tokens=total_tokens,
                total_cost_usd=round(total_cost, 4)
            )

            logger.info(
                f"Scoring complete. Overall score: {overall_score}/10, "
                f"Recommendation: {recommendation}, "
                f"Total tokens: {total_tokens}, Total cost: ${total_cost:.4f}"
            )
            return result

        except Exception as e:
            logger.error(f"Error in scoring process: {e}")
            raise

    async def _score_all_dimensions(self, content: str) -> List[DimensionScore]:
        """
        Score all dimensions in parallel for efficiency.

        Args:
            content: The content to analyze

        Returns:
            List of DimensionScore objects
        """
        # Create tasks for all dimensions
        tasks = [
            self._score_single_dimension(content, dim_key)
            for dim_key in SCORING_DIMENSIONS.keys()
        ]

        # Execute all scoring tasks in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results and handle any errors
        dimension_scores = []
        for i, (dim_key, result) in enumerate(zip(SCORING_DIMENSIONS.keys(), results)):
            if isinstance(result, Exception):
                logger.error(f"Failed to score {dim_key}: {result}")
                # Add a default low score for failed dimensions
                dimension_scores.append(
                    DimensionScore(
                        dimension=SCORING_DIMENSIONS[dim_key]["name"],
                        score=0,
                        reasoning=f"Failed to score this dimension: {str(result)}",
                        confidence=0.0
                    )
                )
            else:
                dimension_scores.append(result)

        return dimension_scores

    async def _score_single_dimension(self, content: str, dimension_key: str) -> DimensionScore:
        """
        Score a single dimension.

        Args:
            content: The content to analyze
            dimension_key: The dimension key to score

        Returns:
            DimensionScore object
        """
        result = await self.ai_service.score_dimension(content, dimension_key)

        return DimensionScore(
            dimension=SCORING_DIMENSIONS[dimension_key]["name"],
            score=result["score"],
            reasoning=result["reasoning"],
            confidence=result["confidence"],
            token_usage=result.get("token_usage")
        )
