"""
Pydantic schemas for extractions.
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ExtractionCreate(BaseModel):
    """Schema for creating an extraction."""
    file_name: str
    extracted_text: str
    model_used: str
    token_count: Optional[int] = None
    sector: Optional[str] = None


class ExtractionResponse(BaseModel):
    """Schema for extraction response."""
    id: int
    user_id: int
    file_name: str
    extracted_text: str
    model_used: str
    token_count: Optional[int] = None
    sector: Optional[str] = None
    created_at: datetime
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


class ExtractionListResponse(BaseModel):
    """Schema for extraction list item (without full text)."""
    id: int
    user_id: int
    file_name: str
    model_used: str
    token_count: Optional[int] = None
    sector: Optional[str] = None
    created_at: datetime
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None
    text_preview: Optional[str] = None  # First 200 chars

    class Config:
        from_attributes = True
