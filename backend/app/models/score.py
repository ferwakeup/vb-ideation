"""
Data models for scoring results.
"""
from pydantic import BaseModel, Field
from typing import List


class DimensionScore(BaseModel):
    """Score for a single dimension."""
    dimension: str
    score: int = Field(..., ge=0, le=10, description="Score from 0-10")
    reasoning: str = Field(..., description="Detailed reasoning for the score")
    confidence: float = Field(..., ge=0, le=1, description="Confidence level in the assessment")


class IdeaScore(BaseModel):
    """Complete scoring result for a business idea."""
    idea_summary: str = Field(..., description="2-3 sentence summary of the business idea")
    url_source: str = Field(..., description="Source URL(s) analyzed")
    dimension_scores: List[DimensionScore] = Field(..., description="Scores for all dimensions")
    overall_score: float = Field(..., ge=0, le=10, description="Weighted overall score")
    recommendation: str = Field(..., description="Overall recommendation (Strong Pursue, Consider, etc.)")
    key_strengths: List[str] = Field(..., description="Top strengths of the idea")
    key_concerns: List[str] = Field(..., description="Top concerns about the idea")
    timestamp: str = Field(..., description="ISO timestamp of when scoring was performed")


class ScoringRequest(BaseModel):
    """Request to score a business idea."""
    urls: List[str] = Field(default=None, description="List of URLs to analyze")
    url_source: str = Field(default=None, description="Use 'config' to load from config file")

    class Config:
        json_schema_extra = {
            "example": {
                "urls": ["https://example.com/business-idea"],
            }
        }
