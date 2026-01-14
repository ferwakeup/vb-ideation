"""
Service for interacting with OpenAI API.
"""
from openai import AsyncOpenAI
import json
import logging
from typing import Dict, Any
from app.utils.prompts import (
    build_idea_summary_prompt,
    build_dimension_prompt,
    build_insights_prompt,
    SYSTEM_PROMPT_IDEA_EXTRACTION,
    SYSTEM_PROMPT_DIMENSION_SCORING,
    SYSTEM_PROMPT_INSIGHTS
)

logger = logging.getLogger(__name__)


class OpenAIService:
    """Handles all OpenAI API interactions for idea scoring."""

    def __init__(self, api_key: str):
        """
        Initialize OpenAI service.

        Args:
            api_key: OpenAI API key
        """
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = "gpt-4o"
        self.temperature = 0.3  # Lower temperature for more consistent results

    async def extract_idea_summary(self, content: str) -> str:
        """
        Extract a concise summary of the business idea from content.

        Args:
            content: The content to analyze

        Returns:
            Summary string

        Raises:
            Exception: If OpenAI API call fails
        """
        try:
            logger.info("Extracting idea summary")

            prompt = build_idea_summary_prompt(content)

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT_IDEA_EXTRACTION},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            summary = result.get("summary", "Unable to extract summary")

            logger.info(f"Extracted summary: {summary[:100]}...")
            return summary

        except Exception as e:
            logger.error(f"Error extracting idea summary: {e}")
            raise Exception(f"Failed to extract idea summary: {str(e)}")

    async def score_dimension(self, content: str, dimension_key: str) -> Dict[str, Any]:
        """
        Score a single dimension using GPT-4o.

        Args:
            content: The content to analyze
            dimension_key: The dimension key to score

        Returns:
            Dictionary with keys: score, reasoning, confidence

        Raises:
            Exception: If OpenAI API call fails
        """
        try:
            logger.info(f"Scoring dimension: {dimension_key}")

            prompt = build_dimension_prompt(content, dimension_key)

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT_DIMENSION_SCORING},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)

            # Validate result structure
            if "score" not in result or "reasoning" not in result or "confidence" not in result:
                raise ValueError("Invalid response format from OpenAI")

            # Ensure score is an integer between 0 and 10
            score = int(result["score"])
            if not 0 <= score <= 10:
                raise ValueError(f"Score {score} is out of range [0-10]")

            # Ensure confidence is a float between 0 and 1
            confidence = float(result["confidence"])
            if not 0 <= confidence <= 1:
                confidence = max(0, min(1, confidence))  # Clamp to valid range

            logger.info(f"Scored {dimension_key}: {score}/10 (confidence: {confidence})")

            return {
                "score": score,
                "reasoning": result["reasoning"],
                "confidence": confidence
            }

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response for {dimension_key}: {e}")
            raise Exception(f"Invalid JSON response from OpenAI for {dimension_key}")
        except Exception as e:
            logger.error(f"Error scoring dimension {dimension_key}: {e}")
            raise Exception(f"Failed to score {dimension_key}: {str(e)}")

    async def extract_insights(self, dimension_scores: list) -> Dict[str, list]:
        """
        Extract key strengths and concerns from dimension scores.

        Args:
            dimension_scores: List of dimension score dictionaries

        Returns:
            Dictionary with keys: strengths, concerns

        Raises:
            Exception: If OpenAI API call fails
        """
        try:
            logger.info("Extracting key insights")

            prompt = build_insights_prompt(dimension_scores)

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT_INSIGHTS},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)

            strengths = result.get("strengths", [])
            concerns = result.get("concerns", [])

            logger.info(f"Extracted {len(strengths)} strengths and {len(concerns)} concerns")

            return {
                "strengths": strengths,
                "concerns": concerns
            }

        except Exception as e:
            logger.error(f"Error extracting insights: {e}")
            # Return empty lists rather than failing completely
            return {
                "strengths": ["Unable to extract insights"],
                "concerns": ["Unable to extract insights"]
            }
