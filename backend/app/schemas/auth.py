"""
Pydantic schemas for authentication.
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=1)

    @field_validator('email')
    @classmethod
    def validate_moven_email(cls, v: str) -> str:
        """Validate that email belongs to @moven.pro domain."""
        if not v.endswith('@moven.pro'):
            raise ValueError('Only @moven.pro email addresses are allowed')
        return v.lower()


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response (safe user data)."""
    id: int
    email: str
    full_name: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for decoded token data."""
    email: Optional[str] = None
