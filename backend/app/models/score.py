"""
Data models for scoring results.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class TokenUsage(BaseModel):
    """Token usage statistics for an API call."""
    prompt_tokens: int = Field(..., description="Tokens used in the prompt")
    completion_tokens: int = Field(..., description="Tokens used in the completion")
    total_tokens: int = Field(..., description="Total tokens used")
    cost_usd: float = Field(..., description="Estimated cost in USD")


class DimensionScore(BaseModel):
    """Score for a single dimension."""
    dimension: str
    score: int = Field(..., ge=0, le=10, description="Score from 0-10")
    reasoning: str = Field(default="", description="Detailed reasoning for the score")
    confidence: float = Field(default=0.8, ge=0, le=1, description="Confidence level in the assessment")
    token_usage: Optional[TokenUsage] = Field(None, description="Token usage for this dimension")


class IdeaScore(BaseModel):
    """Complete scoring result for a business idea."""
    idea_summary: str = Field(..., description="2-3 sentence summary of the business idea")
    url_source: str = Field(default="", description="Source URL(s) or PDF path analyzed")
    dimension_scores: List[DimensionScore] = Field(..., description="Scores for all dimensions")
    overall_score: float = Field(..., ge=0, le=10, description="Weighted overall score")
    recommendation: str = Field(..., description="Overall recommendation (Strong Pursue, Consider, etc.)")
    key_strengths: List[str] = Field(..., description="Top strengths of the idea")
    key_concerns: List[str] = Field(..., description="Top concerns about the idea")
    timestamp: str = Field(..., description="ISO timestamp of when scoring was performed")
    model_used: str = Field(default="gpt-4o", description="AI model used for analysis")
    total_tokens: int = Field(default=0, description="Total tokens used across all API calls")
    total_cost_usd: float = Field(default=0.0, description="Total estimated cost in USD")


class ScoringRequest(BaseModel):
    """Request to score a business idea (URL-based, backward compatible)."""
    urls: Optional[List[str]] = Field(default=None, description="List of URLs to analyze")
    url_source: Optional[str] = Field(default=None, description="Use 'config' to load from config file")
    model: str = Field(default="gpt-4o", description="Model to use for analysis")

    class Config:
        json_schema_extra = {
            "example": {
                "urls": ["https://example.com/business-idea"],
                "model": "gpt-4o"
            }
        }


class PDFScoringRequest(BaseModel):
    """Request to score a business idea from a PDF file."""
    sector: str = Field(..., description="Business sector for analysis (e.g., 'mobility', 'healthcare')")
    num_ideas: int = Field(default=3, ge=1, le=10, description="Number of ideas to generate")
    idea_index: int = Field(default=0, ge=0, description="Which generated idea to evaluate (0-indexed)")
    provider: str = Field(default="anthropic", description="LLM provider (ollama, groq, anthropic, openai)")
    model: Optional[str] = Field(default=None, description="Model name (uses provider default if not specified)")
    use_checkpoints: bool = Field(default=True, description="Whether to use checkpoint system for resumable processing")

    class Config:
        json_schema_extra = {
            "example": {
                "sector": "mobility",
                "num_ideas": 3,
                "idea_index": 0,
                "provider": "anthropic"
            }
        }


class PDFScoringResult(BaseModel):
    """Complete scoring result from PDF-based multi-agent system."""
    idea_summary: str = Field(..., description="Business idea summary from synthesis")
    source: str = Field(..., description="PDF file path")
    sector: str = Field(..., description="Business sector analyzed")
    dimension_scores: List[DimensionScore] = Field(..., description="Scores for all 11 dimensions")
    overall_score: float = Field(..., ge=0, le=10, description="Weighted overall score")
    recommendation: str = Field(..., description="Recommendation tier")
    recommendation_rationale: str = Field(default="", description="Explanation of recommendation")
    key_strengths: List[str] = Field(..., description="Top 3 strengths")
    key_concerns: List[str] = Field(..., description="Top 3 concerns")
    timestamp: str = Field(..., description="ISO timestamp")
    model_used: str = Field(..., description="Provider/model used")
    processing_time_seconds: float = Field(default=0, description="Total processing time")
    pdf_metadata: Optional[Dict[str, Any]] = Field(default=None, description="PDF file metadata")
    generated_ideas_count: int = Field(default=0, description="Number of ideas generated")
    evaluated_idea_index: int = Field(default=0, description="Index of evaluated idea")


class CheckpointStatus(BaseModel):
    """Status of checkpoints for a PDF/sector combination."""
    pdf_name: str
    sector: str
    is_new_analysis: bool
    total_checkpoints: int
    agent1_complete: bool
    agent2_complete: bool
    agent3_complete: bool
    agent3_progress: str
    agent4_complete: bool
    agent4_progress: str
    agent5_complete: bool
