"""
Analysis database model for storing scoring results.
"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Analysis(Base):
    """Model for storing analysis/scoring results."""

    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Document info
    file_name = Column(String, nullable=False)
    sector = Column(String, nullable=False)

    # Scoring results
    idea_summary = Column(Text, nullable=False)
    overall_score = Column(Float, nullable=False)
    recommendation = Column(String, nullable=False)
    recommendation_rationale = Column(Text, nullable=True)

    # Dimension scores stored as JSON
    dimension_scores = Column(JSON, nullable=False)

    # Strengths and concerns as JSON arrays
    key_strengths = Column(JSON, nullable=False)
    key_concerns = Column(JSON, nullable=False)

    # Metadata
    model_used = Column(String, nullable=False)
    processing_time_seconds = Column(Float, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to user
    user = relationship("User", backref="analyses")
