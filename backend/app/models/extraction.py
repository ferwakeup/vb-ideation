"""
Extraction database model for storing PDF text extractions.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Extraction(Base):
    """Model for storing extracted text from PDFs."""

    __tablename__ = "extractions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_name = Column(String, nullable=False)
    extracted_text = Column(Text, nullable=False)
    model_used = Column(String, nullable=False)
    token_count = Column(Integer, nullable=True)
    sector = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to user
    user = relationship("User", backref="extractions")
