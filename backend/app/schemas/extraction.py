"""
Pydantic schemas for extractions.
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ExtractionCreate(BaseModel):
    """Schema for creating an extraction."""
    file_name: str
    file_hash: str  # SHA-256 hash of the file content
    extracted_text: str
    model_used: str
    token_count: Optional[int] = None
    sector: Optional[str] = None


class ExtractionResponse(BaseModel):
    """Schema for extraction response."""
    id: int
    user_id: int
    file_name: str
    file_hash: str
    extracted_text: str
    model_used: str
    token_count: Optional[int] = None
    sector: Optional[str] = None
    created_at: datetime
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None
    # Compression stats
    original_size: int
    compressed_size: int
    compression_ratio: float
    space_saved_percent: float

    class Config:
        from_attributes = True


class ExtractionListResponse(BaseModel):
    """Schema for extraction list item (without full text)."""
    id: int
    user_id: int
    file_name: str
    file_hash: str
    model_used: str
    token_count: Optional[int] = None
    sector: Optional[str] = None
    created_at: datetime
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None
    text_preview: Optional[str] = None  # First 200 chars
    # Compression stats
    original_size: int
    compressed_size: int
    space_saved_percent: float

    class Config:
        from_attributes = True


class ExtractionCheck(BaseModel):
    """Schema for checking if extraction exists."""
    file_hash: str
    model_used: str


class ExtractionCheckResponse(BaseModel):
    """Response for extraction check."""
    exists: bool
    extraction_id: Optional[int] = None
    file_name: Optional[str] = None
    created_at: Optional[datetime] = None
