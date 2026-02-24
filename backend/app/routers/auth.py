"""
Authentication API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.schemas.auth import (
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    RegisterResponse,
    VerifyEmailRequest,
    ResendVerificationRequest
)
from app.services.auth import (
    authenticate_user,
    create_user,
    create_access_token,
    get_user_by_email,
    get_current_user,
    get_user_by_verification_token,
    verify_user,
    update_verification_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.services.email import (
    generate_verification_token,
    get_token_expiry,
    send_verification_email
)
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Register a new user.
    Only @moven.pro email addresses are allowed.
    Sends verification email after registration.
    """
    # Check if user already exists
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Generate verification token
    verification_token = generate_verification_token()
    token_expires = get_token_expiry()

    # Create new user with verification token
    user = create_user(
        db=db,
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        verification_token=verification_token,
        verification_token_expires=token_expires
    )

    # Send verification email in background
    background_tasks.add_task(
        send_verification_email,
        user.email,
        user.full_name,
        verification_token
    )

    return RegisterResponse(
        message="Registration successful. Please check your email to verify your account.",
        email=user.email,
        requires_verification=True
    )


@router.post("/verify-email")
async def verify_email(request: VerifyEmailRequest, db: Session = Depends(get_db)):
    """
    Verify user's email with the token sent via email.
    """
    user = get_user_by_verification_token(db, request.token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )

    # Check if token has expired
    if user.verification_token_expires and user.verification_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired. Please request a new one."
        )

    # Verify the user
    verify_user(db, user)

    return {"message": "Email verified successfully. You can now log in."}


@router.post("/resend-verification")
async def resend_verification(
    request: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Resend verification email.
    """
    user = get_user_by_email(db, request.email)

    if not user:
        # Don't reveal if email exists or not
        return {"message": "If this email is registered, a verification email will be sent."}

    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified"
        )

    # Generate new verification token
    verification_token = generate_verification_token()
    token_expires = get_token_expiry()

    # Update user's verification token
    update_verification_token(db, user, verification_token, token_expires)

    # Send verification email in background
    background_tasks.add_task(
        send_verification_email,
        user.email,
        user.full_name,
        verification_token
    )

    return {"message": "If this email is registered, a verification email will be sent."}


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Login and get an access token.
    User must be verified to log in.
    """
    user = authenticate_user(db, user_data.email, user_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Check your inbox for the verification link."
        )

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )

    return Token(access_token=access_token, is_verified=user.is_verified)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user info.
    """
    return current_user
