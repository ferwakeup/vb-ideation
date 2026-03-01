"""
Pydantic schemas for authentication.
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional, Union
from uuid import UUID


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=1)

    @field_validator('email')
    @classmethod
    def normalize_email(cls, v: str) -> str:
        """Normalize email to lowercase."""
        return v.lower()


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response (safe user data)."""
    id: Union[UUID, int, str]  # UUID for Supabase, int/str for legacy
    email: str
    full_name: str
    is_active: bool
    is_verified: bool
    is_admin: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserStatusUpdate(BaseModel):
    """Schema for updating user status."""
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class RegisterResponse(BaseModel):
    """Schema for registration response."""
    message: str
    email: str
    requires_verification: bool = True


class VerifyEmailRequest(BaseModel):
    """Schema for email verification request."""
    token: str


class ResendVerificationRequest(BaseModel):
    """Schema for resending verification email."""
    email: EmailStr


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
    is_verified: bool = True


class TokenData(BaseModel):
    """Schema for decoded token data."""
    email: Optional[str] = None
