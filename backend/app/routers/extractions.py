"""
Extractions API endpoints.
Manages saved PDF text extractions with compression and deduplication.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.extraction import Extraction
from app.models.user import User
from app.schemas.extraction import (
    ExtractionCreate,
    ExtractionResponse,
    ExtractionListResponse,
    ExtractionCheck,
    ExtractionCheckResponse
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/extractions", tags=["extractions"])


@router.post("/check", response_model=ExtractionCheckResponse)
async def check_extraction_exists(
    check_data: ExtractionCheck,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if an extraction already exists for the given file hash and model.
    Use this before creating to avoid duplicates.
    """
    existing = db.query(Extraction).filter(
        Extraction.file_hash == check_data.file_hash,
        Extraction.model_used == check_data.model_used
    ).first()

    if existing:
        return ExtractionCheckResponse(
            exists=True,
            extraction_id=existing.id,
            file_name=existing.file_name,
            created_at=existing.created_at
        )

    return ExtractionCheckResponse(exists=False)


@router.post("/", response_model=ExtractionResponse, status_code=status.HTTP_201_CREATED)
async def create_extraction(
    extraction_data: ExtractionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save a new extraction with compression.
    Returns existing extraction if duplicate (same file_hash + model).
    """
    # Check if extraction already exists
    existing = db.query(Extraction).filter(
        Extraction.file_hash == extraction_data.file_hash,
        Extraction.model_used == extraction_data.model_used
    ).first()

    if existing:
        # Return existing extraction instead of creating duplicate
        user = db.query(User).filter(User.id == existing.user_id).first()
        return ExtractionResponse(
            id=existing.id,
            user_id=existing.user_id,
            file_name=existing.file_name,
            file_hash=existing.file_hash,
            extracted_text=existing.extracted_text,
            model_used=existing.model_used,
            token_count=existing.token_count,
            sector=existing.sector,
            created_at=existing.created_at,
            user_full_name=user.full_name if user else None,
            user_email=user.email if user else None,
            original_size=existing.original_size,
            compressed_size=existing.compressed_size,
            compression_ratio=existing.compression_ratio,
            space_saved_percent=existing.space_saved_percent,
        )

    # Compress the text
    compressed_text, original_size, compressed_size = Extraction.compress_text(
        extraction_data.extracted_text
    )

    extraction = Extraction(
        user_id=current_user.id,
        file_name=extraction_data.file_name,
        file_hash=extraction_data.file_hash,
        compressed_text=compressed_text,
        original_size=original_size,
        compressed_size=compressed_size,
        model_used=extraction_data.model_used,
        token_count=extraction_data.token_count,
        sector=extraction_data.sector,
    )

    try:
        db.add(extraction)
        db.commit()
        db.refresh(extraction)
    except IntegrityError:
        # Race condition: another request created it first
        db.rollback()
        existing = db.query(Extraction).filter(
            Extraction.file_hash == extraction_data.file_hash,
            Extraction.model_used == extraction_data.model_used
        ).first()
        if existing:
            user = db.query(User).filter(User.id == existing.user_id).first()
            return ExtractionResponse(
                id=existing.id,
                user_id=existing.user_id,
                file_name=existing.file_name,
                file_hash=existing.file_hash,
                extracted_text=existing.extracted_text,
                model_used=existing.model_used,
                token_count=existing.token_count,
                sector=existing.sector,
                created_at=existing.created_at,
                user_full_name=user.full_name if user else None,
                user_email=user.email if user else None,
                original_size=existing.original_size,
                compressed_size=existing.compressed_size,
                compression_ratio=existing.compression_ratio,
                space_saved_percent=existing.space_saved_percent,
            )
        raise

    return ExtractionResponse(
        id=extraction.id,
        user_id=extraction.user_id,
        file_name=extraction.file_name,
        file_hash=extraction.file_hash,
        extracted_text=extraction.extracted_text,
        model_used=extraction.model_used,
        token_count=extraction.token_count,
        sector=extraction.sector,
        created_at=extraction.created_at,
        user_full_name=current_user.full_name,
        user_email=current_user.email,
        original_size=extraction.original_size,
        compressed_size=extraction.compressed_size,
        compression_ratio=extraction.compression_ratio,
        space_saved_percent=extraction.space_saved_percent,
    )


@router.get("/stats")
async def get_storage_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get storage statistics for all extractions.
    """
    extractions = db.query(Extraction).all()

    total_original = sum(e.original_size for e in extractions)
    total_compressed = sum(e.compressed_size for e in extractions)
    total_count = len(extractions)

    return {
        "total_extractions": total_count,
        "total_original_bytes": total_original,
        "total_compressed_bytes": total_compressed,
        "total_original_mb": round(total_original / (1024 * 1024), 2),
        "total_compressed_mb": round(total_compressed / (1024 * 1024), 2),
        "overall_compression_ratio": round(total_compressed / total_original, 3) if total_original > 0 else 0,
        "overall_space_saved_percent": round((1 - total_compressed / total_original) * 100, 1) if total_original > 0 else 0,
        "average_original_kb": round(total_original / total_count / 1024, 1) if total_count > 0 else 0,
        "average_compressed_kb": round(total_compressed / total_count / 1024, 1) if total_count > 0 else 0,
    }


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
        text = ext.extracted_text
        result.append(ExtractionListResponse(
            id=ext.id,
            user_id=ext.user_id,
            file_name=ext.file_name,
            file_hash=ext.file_hash,
            model_used=ext.model_used,
            token_count=ext.token_count,
            sector=ext.sector,
            created_at=ext.created_at,
            user_full_name=user.full_name if user else None,
            user_email=user.email if user else None,
            text_preview=text[:200] + "..." if len(text) > 200 else text,
            original_size=ext.original_size,
            compressed_size=ext.compressed_size,
            space_saved_percent=ext.space_saved_percent,
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
        file_hash=extraction.file_hash,
        extracted_text=extraction.extracted_text,
        model_used=extraction.model_used,
        token_count=extraction.token_count,
        sector=extraction.sector,
        created_at=extraction.created_at,
        user_full_name=user.full_name if user else None,
        user_email=user.email if user else None,
        original_size=extraction.original_size,
        compressed_size=extraction.compressed_size,
        compression_ratio=extraction.compression_ratio,
        space_saved_percent=extraction.space_saved_percent,
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
