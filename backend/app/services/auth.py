"""
Authentication service with Supabase JWT validation.

This module handles JWT token validation for Supabase authentication.
User authentication is handled by Supabase Auth - we only validate tokens here.
"""
from typing import Optional
from uuid import UUID
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.config import get_settings

# JWT settings for Supabase
ALGORITHM = "HS256"

# Security scheme
security = HTTPBearer()


def decode_supabase_token(token: str) -> Optional[dict]:
    """
    Decode and validate a Supabase JWT token.

    Returns the payload if valid, None otherwise.
    The payload contains:
    - sub: User UUID
    - email: User email
    - role: User role (e.g., "authenticated")
    - exp: Expiration timestamp
    """
    settings = get_settings()

    # Try Supabase JWT secret first
    jwt_secret = settings.supabase_jwt_secret

    # Fall back to legacy JWT secret if Supabase not configured
    if not jwt_secret:
        jwt_secret = settings.jwt_secret_key

    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=[ALGORITHM],
            options={"verify_aud": False}  # Supabase JWTs may have audience claims
        )
        return payload
    except JWTError:
        return None


def get_user_by_id(db: Session, user_id: UUID) -> Optional[User]:
    """Get a user by their UUID."""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get a user by email."""
    return db.query(User).filter(User.email == email.lower()).first()


def create_or_update_user_profile(
    db: Session,
    user_id: UUID,
    email: str,
    full_name: Optional[str] = None,
    is_verified: bool = False
) -> User:
    """
    Create or update a user profile.

    This is called when a user authenticates with Supabase but may not have
    a profile in our users table yet.
    """
    user = get_user_by_id(db, user_id)

    if user:
        # Update existing user
        user.email = email.lower()
        if full_name:
            user.full_name = full_name
        if is_verified:
            user.is_verified = is_verified
    else:
        # Create new user profile
        user = User(
            id=user_id,
            email=email.lower(),
            full_name=full_name or email.split('@')[0],
            is_verified=is_verified,
            is_active=True
        )
        db.add(user)

    db.commit()
    db.refresh(user)
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to get the current authenticated user.
    Validates the Supabase JWT and returns the user profile.
    Raises HTTPException if authentication fails.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    payload = decode_supabase_token(token)

    if payload is None:
        raise credentials_exception

    # Get user ID from token (Supabase uses 'sub' claim)
    user_id_str = payload.get("sub")
    email = payload.get("email")

    if not user_id_str:
        raise credentials_exception

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    # Look up user in our database
    user = get_user_by_id(db, user_id)

    # If user doesn't exist in our profile table, create them
    if user is None and email:
        user = create_or_update_user_profile(
            db,
            user_id=user_id,
            email=email,
            full_name=payload.get("user_metadata", {}).get("full_name"),
            is_verified=payload.get("email_confirmed_at") is not None
        )

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    return user


# Optional security - doesn't require auth but uses it if present
security_optional = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    FastAPI dependency to get the current user if authenticated.
    Returns None if no valid token is provided (doesn't raise error).
    """
    if credentials is None:
        return None

    token = credentials.credentials
    payload = decode_supabase_token(token)

    if payload is None:
        return None

    user_id_str = payload.get("sub")
    email = payload.get("email")

    if not user_id_str:
        return None

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        return None

    user = get_user_by_id(db, user_id)

    # Auto-create profile for authenticated Supabase users
    if user is None and email:
        user = create_or_update_user_profile(
            db,
            user_id=user_id,
            email=email,
            full_name=payload.get("user_metadata", {}).get("full_name"),
            is_verified=payload.get("email_confirmed_at") is not None
        )

    if user is None or not user.is_active:
        return None

    return user


# Legacy functions - kept for backward compatibility during migration
# These will be removed after full Supabase migration

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Legacy: Verify a plain password against a hashed password."""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Legacy: Hash a password."""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Legacy: Authenticate a user by email and password."""
    user = get_user_by_email(db, email)
    if not user or not user.hashed_password:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
