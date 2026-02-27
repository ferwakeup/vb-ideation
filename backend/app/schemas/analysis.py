"""
Pydantic schemas for analyses.
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class DimensionScoreSchema(BaseModel):
    """Schema for a dimension score."""
    dimension: str
    score: float
    reasoning: str = ""
    confidence: float = 0.8


class AnalysisCreate(BaseModel):
    """Schema for creating an analysis."""
    file_name: str
    sector: str
    idea_summary: str
    overall_score: float
    recommendation: str
    recommendation_rationale: Optional[str] = None
    dimension_scores: List[DimensionScoreSchema]
    key_strengths: List[str]
    key_concerns: List[str]
    model_used: str
    processing_time_seconds: Optional[float] = None


class AnalysisResponse(BaseModel):
    """Schema for analysis response."""
    id: int
    user_id: Optional[int] = None
    file_name: str
    sector: str
    idea_summary: str
    overall_score: float
    recommendation: str
    recommendation_rationale: Optional[str] = None
    dimension_scores: List[DimensionScoreSchema]
    key_strengths: List[str]
    key_concerns: List[str]
    model_used: str
    processing_time_seconds: Optional[float] = None
    created_at: datetime
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


class AnalysisListResponse(BaseModel):
    """Schema for analysis list item."""
    id: int
    user_id: Optional[int] = None
    file_name: str
    sector: str
    idea_summary: str
    overall_score: float
    recommendation: str
    model_used: str
    processing_time_seconds: Optional[float] = None
    created_at: datetime
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None
    # Include dimension scores for detail view
    dimension_scores: List[DimensionScoreSchema]
    key_strengths: List[str]
    key_concerns: List[str]

    class Config:
        from_attributes = True
