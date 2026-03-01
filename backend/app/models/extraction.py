"""
Extraction database model for storing PDF text extractions.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, LargeBinary, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import zlib


class Extraction(Base):
    """Model for storing extracted text from PDFs."""

    __tablename__ = "extractions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # UUID for Supabase auth
    file_name = Column(String, nullable=False)
    file_hash = Column(String(64), nullable=False, index=True)  # SHA-256 hash of file content
    model_used = Column(String, nullable=False)

    # Compressed text storage
    compressed_text = Column(LargeBinary, nullable=False)
    original_size = Column(Integer, nullable=False)  # Size in bytes before compression
    compressed_size = Column(Integer, nullable=False)  # Size in bytes after compression

    token_count = Column(Integer, nullable=True)
    sector = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to user
    user = relationship("User", backref="extractions")

    # Unique constraint: same file + model = same extraction
    __table_args__ = (
        UniqueConstraint('file_hash', 'model_used', name='uix_file_model'),
    )

    @property
    def extracted_text(self) -> str:
        """Decompress and return the extracted text."""
        if self.compressed_text:
            return zlib.decompress(self.compressed_text).decode('utf-8')
        return ""

    @staticmethod
    def compress_text(text: str) -> tuple[bytes, int, int]:
        """
        Compress text and return (compressed_bytes, original_size, compressed_size).
        """
        text_bytes = text.encode('utf-8')
        original_size = len(text_bytes)
        compressed = zlib.compress(text_bytes, level=9)  # Maximum compression
        compressed_size = len(compressed)
        return compressed, original_size, compressed_size

    @property
    def compression_ratio(self) -> float:
        """Return compression ratio (e.g., 0.25 means 75% space saved)."""
        if self.original_size > 0:
            return self.compressed_size / self.original_size
        return 1.0

    @property
    def space_saved_percent(self) -> float:
        """Return percentage of space saved by compression."""
        return (1 - self.compression_ratio) * 100
