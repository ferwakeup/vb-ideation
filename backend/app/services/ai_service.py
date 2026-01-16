"""
Unified AI service supporting multiple providers (OpenAI and Google Gemini).
"""
from openai import AsyncOpenAI
import google.generativeai as genai
import json
import logging
from typing import Dict, Any
from app.models.score import TokenUsage
from app.utils.prompts import (
    build_idea_summary_prompt,
    build_dimension_prompt,
    build_insights_prompt,
    SYSTEM_PROMPT_IDEA_EXTRACTION,
    SYSTEM_PROMPT_DIMENSION_SCORING,
    SYSTEM_PROMPT_INSIGHTS
)

logger = logging.getLogger(__name__)

# Model Pricing (as of January 2025)
# https://openai.com/api/pricing/
# https://ai.google.dev/pricing
MODEL_PRICING = {
    # OpenAI Models
    "gpt-4o": {
        "provider": "openai",
        "input": 2.50 / 1_000_000,
        "output": 10.00 / 1_000_000
    },
    "gpt-4o-mini": {
        "provider": "openai",
        "input": 0.150 / 1_000_000,
        "output": 0.600 / 1_000_000
    },
    "gpt-4-turbo": {
        "provider": "openai",
        "input": 10.00 / 1_000_000,
        "output": 30.00 / 1_000_000
    },
    "gpt-4": {
        "provider": "openai",
        "input": 30.00 / 1_000_000,
        "output": 60.00 / 1_000_000
    },
    # Google Gemini Models
    "gemini-2.5-pro": {
        "provider": "gemini",
        "input": 1.25 / 1_000_000,   # $1.25 per 1M tokens (up to 128k)
        "output": 5.00 / 1_000_000    # $5.00 per 1M tokens
    },
    "gemini-2.5-flash": {
        "provider": "gemini",
        "input": 0.075 / 1_000_000,  # $0.075 per 1M tokens (up to 128k)
        "output": 0.30 / 1_000_000    # $0.30 per 1M tokens
    },
    "gemini-pro-latest": {
        "provider": "gemini",
        "input": 1.25 / 1_000_000,   # $1.25 per 1M tokens
        "output": 5.00 / 1_000_000    # $5.00 per 1M tokens
    },
    "gemini-flash-latest": {
        "provider": "gemini",
        "input": 0.075 / 1_000_000,  # $0.075 per 1M tokens
        "output": 0.30 / 1_000_000    # $0.30 per 1M tokens
    }
}


class AIService:
    """Unified AI service supporting OpenAI and Google Gemini."""

    def __init__(self, model: str, openai_api_key: str = "", google_api_key: str = ""):
        """
        Initialize AI service.

        Args:
            model: Model name (e.g., "gpt-4o", "gemini-1.5-pro")
            openai_api_key: OpenAI API key (if using OpenAI)
            google_api_key: Google API key (if using Gemini)
        """
        self.model = model
        self.temperature = 0.3

        # Get model info and pricing
        if model not in MODEL_PRICING:
            logger.warning(f"Model {model} not in pricing table, using gpt-4o defaults")
            self.model_info = MODEL_PRICING["gpt-4o"]
        else:
            self.model_info = MODEL_PRICING[model]

        self.provider = self.model_info["provider"]
        self.pricing = {"input": self.model_info["input"], "output": self.model_info["output"]}

        # Initialize the appropriate client
        if self.provider == "openai":
            if not openai_api_key:
                raise ValueError("OpenAI API key required for OpenAI models")
            self.openai_client = AsyncOpenAI(api_key=openai_api_key)
        elif self.provider == "gemini":
            if not google_api_key:
                raise ValueError("Google API key required for Gemini models")
            genai.configure(api_key=google_api_key)
            self.gemini_model = genai.GenerativeModel(model)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

        logger.info(f"Initialized AI service with {model} ({self.provider})")

    def _calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """Calculate cost based on token usage and model pricing."""
        input_cost = prompt_tokens * self.pricing["input"]
        output_cost = completion_tokens * self.pricing["output"]
        return round(input_cost + output_cost, 6)

    def _create_token_usage(self, prompt_tokens: int, completion_tokens: int) -> TokenUsage:
        """Create TokenUsage object."""
        total_tokens = prompt_tokens + completion_tokens
        cost = self._calculate_cost(prompt_tokens, completion_tokens)

        return TokenUsage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost_usd=cost
        )

    async def _call_openai(self, system_prompt: str, user_prompt: str) -> tuple[str, TokenUsage]:
        """Call OpenAI API."""
        response = await self.openai_client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=self.temperature,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        token_usage = self._create_token_usage(
            response.usage.prompt_tokens,
            response.usage.completion_tokens
        )

        return content, token_usage

    async def _call_gemini(self, system_prompt: str, user_prompt: str) -> tuple[str, TokenUsage]:
        """Call Google Gemini API."""
        # Combine system and user prompts for Gemini
        full_prompt = f"{system_prompt}\n\n{user_prompt}\n\nIMPORTANT: Return your response as valid JSON only."

        generation_config = {
            "temperature": self.temperature,
            "response_mime_type": "application/json"
        }

        response = await self.gemini_model.generate_content_async(
            full_prompt,
            generation_config=generation_config
        )

        content = response.text

        # Extract token counts from Gemini response
        prompt_tokens = response.usage_metadata.prompt_token_count
        completion_tokens = response.usage_metadata.candidates_token_count

        token_usage = self._create_token_usage(prompt_tokens, completion_tokens)

        return content, token_usage

    async def extract_idea_summary(self, content: str) -> str:
        """Extract a concise summary of the business idea from content."""
        try:
            logger.info("Extracting idea summary")

            prompt = build_idea_summary_prompt(content)

            if self.provider == "openai":
                result_str, _ = await self._call_openai(SYSTEM_PROMPT_IDEA_EXTRACTION, prompt)
            else:  # gemini
                result_str, _ = await self._call_gemini(SYSTEM_PROMPT_IDEA_EXTRACTION, prompt)

            result = json.loads(result_str)
            summary = result.get("summary", "Unable to extract summary")

            logger.info(f"Extracted summary: {summary[:100]}...")
            return summary

        except Exception as e:
            logger.error(f"Error extracting idea summary: {e}")
            raise Exception(f"Failed to extract idea summary: {str(e)}")

    async def score_dimension(self, content: str, dimension_key: str) -> Dict[str, Any]:
        """Score a single dimension."""
        try:
            logger.info(f"Scoring dimension: {dimension_key}")

            prompt = build_dimension_prompt(content, dimension_key)

            if self.provider == "openai":
                result_str, token_usage = await self._call_openai(
                    SYSTEM_PROMPT_DIMENSION_SCORING,
                    prompt
                )
            else:  # gemini
                result_str, token_usage = await self._call_gemini(
                    SYSTEM_PROMPT_DIMENSION_SCORING,
                    prompt
                )

            result = json.loads(result_str)

            # Validate result structure
            if "score" not in result or "reasoning" not in result or "confidence" not in result:
                raise ValueError("Invalid response format from AI")

            # Ensure score is an integer between 0 and 10
            score = int(result["score"])
            if not 0 <= score <= 10:
                raise ValueError(f"Score {score} is out of range [0-10]")

            # Ensure confidence is a float between 0 and 1
            confidence = float(result["confidence"])
            if not 0 <= confidence <= 1:
                confidence = max(0, min(1, confidence))

            logger.info(
                f"Scored {dimension_key}: {score}/10 (confidence: {confidence}) - "
                f"Tokens: {token_usage.total_tokens}, Cost: ${token_usage.cost_usd:.4f}"
            )

            return {
                "score": score,
                "reasoning": result["reasoning"],
                "confidence": confidence,
                "token_usage": token_usage
            }

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response for {dimension_key}: {e}")
            raise Exception(f"Invalid JSON response from AI for {dimension_key}")
        except Exception as e:
            logger.error(f"Error scoring dimension {dimension_key}: {e}")
            raise Exception(f"Failed to score {dimension_key}: {str(e)}")

    async def extract_insights(self, dimension_scores: list) -> Dict[str, list]:
        """Extract key strengths and concerns from dimension scores."""
        try:
            logger.info("Extracting key insights")

            prompt = build_insights_prompt(dimension_scores)

            if self.provider == "openai":
                result_str, _ = await self._call_openai(SYSTEM_PROMPT_INSIGHTS, prompt)
            else:  # gemini
                result_str, _ = await self._call_gemini(SYSTEM_PROMPT_INSIGHTS, prompt)

            result = json.loads(result_str)

            strengths = result.get("strengths", [])
            concerns = result.get("concerns", [])

            logger.info(f"Extracted {len(strengths)} strengths and {len(concerns)} concerns")

            return {
                "strengths": strengths,
                "concerns": concerns
            }

        except Exception as e:
            logger.error(f"Error extracting insights: {e}")
            return {
                "strengths": ["Unable to extract insights"],
                "concerns": ["Unable to extract insights"]
            }
