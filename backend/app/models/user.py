"""
User database model for Supabase authentication.

This model represents the user profile stored in our database.
Authentication is handled by Supabase Auth - this table stores additional user metadata.
The id column references auth.users(id) in Supabase.
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid


class User(Base):
    """
    User profile model.

    Note: This table is synchronized with Supabase auth.users.
    The id is a UUID that matches the Supabase auth user id.
    Password handling is done by Supabase Auth, not this model.
    """

    __tablename__ = "users"

    # UUID primary key matching Supabase auth.users(id)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Legacy field - kept for backward compatibility during migration
    # Will be removed after full Supabase migration
    hashed_password = Column(String, nullable=True)
    verification_token = Column(String, nullable=True)
    verification_token_expires = Column(DateTime(timezone=True), nullable=True)
