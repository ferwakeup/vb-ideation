"""
Extractions API endpoints.
Manages saved PDF text extractions.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.extraction import Extraction
from app.models.user import User
from app.schemas.extraction import ExtractionCreate, ExtractionResponse, ExtractionListResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/extractions", tags=["extractions"])


@router.post("/", response_model=ExtractionResponse, status_code=status.HTTP_201_CREATED)
async def create_extraction(
    extraction_data: ExtractionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save a new extraction.
    """
    extraction = Extraction(
        user_id=current_user.id,
        file_name=extraction_data.file_name,
        extracted_text=extraction_data.extracted_text,
        model_used=extraction_data.model_used,
        token_count=extraction_data.token_count,
        sector=extraction_data.sector,
    )
    db.add(extraction)
    db.commit()
    db.refresh(extraction)

    return ExtractionResponse(
        id=extraction.id,
        user_id=extraction.user_id,
        file_name=extraction.file_name,
        extracted_text=extraction.extracted_text,
        model_used=extraction.model_used,
        token_count=extraction.token_count,
        sector=extraction.sector,
        created_at=extraction.created_at,
        user_full_name=current_user.full_name,
        user_email=current_user.email,
    )


@router.get("/", response_model=List[ExtractionListResponse])
async def list_extractions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all extractions (all users can see all extractions).
    Returns list without full text for efficiency.
    """
    extractions = db.query(Extraction).order_by(Extraction.created_at.desc()).all()

    result = []
    for ext in extractions:
        user = db.query(User).filter(User.id == ext.user_id).first()
        result.append(ExtractionListResponse(
            id=ext.id,
            user_id=ext.user_id,
            file_name=ext.file_name,
            model_used=ext.model_used,
            token_count=ext.token_count,
            sector=ext.sector,
            created_at=ext.created_at,
            user_full_name=user.full_name if user else None,
            user_email=user.email if user else None,
            text_preview=ext.extracted_text[:200] + "..." if len(ext.extracted_text) > 200 else ext.extracted_text,
        ))

    return result


@router.get("/{extraction_id}", response_model=ExtractionResponse)
async def get_extraction(
    extraction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific extraction with full text.
    """
    extraction = db.query(Extraction).filter(Extraction.id == extraction_id).first()

    if not extraction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extraction not found"
        )

    user = db.query(User).filter(User.id == extraction.user_id).first()

    return ExtractionResponse(
        id=extraction.id,
        user_id=extraction.user_id,
        file_name=extraction.file_name,
        extracted_text=extraction.extracted_text,
        model_used=extraction.model_used,
        token_count=extraction.token_count,
        sector=extraction.sector,
        created_at=extraction.created_at,
        user_full_name=user.full_name if user else None,
        user_email=user.email if user else None,
    )


@router.delete("/{extraction_id}")
async def delete_extraction(
    extraction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an extraction.
    Only the owner or an admin can delete.
    """
    extraction = db.query(Extraction).filter(Extraction.id == extraction_id).first()

    if not extraction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extraction not found"
        )

    # Check permission: owner or admin
    if extraction.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this extraction"
        )

    db.delete(extraction)
    db.commit()

    return {"message": "Extraction deleted successfully"}
