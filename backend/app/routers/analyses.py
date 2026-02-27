"""
API endpoints for analysis history management.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.analysis import Analysis
from app.models.user import User
from app.schemas.analysis import AnalysisCreate, AnalysisResponse, AnalysisListResponse
from app.services.auth import get_current_user, get_current_user_optional

router = APIRouter(prefix="/analyses", tags=["analyses"])


@router.post("/", response_model=AnalysisResponse)
async def create_analysis(
    analysis: AnalysisCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    """Create a new analysis record."""
    db_analysis = Analysis(
        user_id=current_user.id if current_user else None,
        file_name=analysis.file_name,
        sector=analysis.sector,
        idea_summary=analysis.idea_summary,
        overall_score=analysis.overall_score,
        recommendation=analysis.recommendation,
        recommendation_rationale=analysis.recommendation_rationale,
        dimension_scores=[d.model_dump() for d in analysis.dimension_scores],
        key_strengths=analysis.key_strengths,
        key_concerns=analysis.key_concerns,
        model_used=analysis.model_used,
        processing_time_seconds=analysis.processing_time_seconds,
    )

    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)

    return _analysis_to_response(db_analysis)


@router.get("/", response_model=List[AnalysisListResponse])
async def list_analyses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    """List all analyses (for admin) or user's analyses."""
    query = db.query(Analysis)

    # If user is admin, show all analyses; otherwise show only user's analyses
    if current_user and current_user.is_admin:
        analyses = query.order_by(Analysis.created_at.desc()).all()
    elif current_user:
        analyses = query.filter(Analysis.user_id == current_user.id).order_by(Analysis.created_at.desc()).all()
    else:
        # No user - return empty list
        analyses = []

    return [_analysis_to_list_response(a) for a in analyses]


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    """Get a specific analysis."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Check access: admin can see all, users can see their own
    if current_user:
        if not current_user.is_admin and analysis.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    return _analysis_to_response(analysis)


@router.delete("/{analysis_id}")
async def delete_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an analysis."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Check access: admin can delete all, users can delete their own
    if not current_user.is_admin and analysis.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(analysis)
    db.commit()

    return {"message": "Analysis deleted successfully"}


@router.delete("/")
async def clear_analyses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear all analyses for the current user (or all if admin)."""
    if current_user.is_admin:
        db.query(Analysis).delete()
    else:
        db.query(Analysis).filter(Analysis.user_id == current_user.id).delete()

    db.commit()

    return {"message": "Analyses cleared successfully"}


def _analysis_to_response(analysis: Analysis) -> AnalysisResponse:
    """Convert Analysis model to response schema."""
    return AnalysisResponse(
        id=analysis.id,
        user_id=analysis.user_id,
        file_name=analysis.file_name,
        sector=analysis.sector,
        idea_summary=analysis.idea_summary,
        overall_score=analysis.overall_score,
        recommendation=analysis.recommendation,
        recommendation_rationale=analysis.recommendation_rationale,
        dimension_scores=analysis.dimension_scores,
        key_strengths=analysis.key_strengths,
        key_concerns=analysis.key_concerns,
        model_used=analysis.model_used,
        processing_time_seconds=analysis.processing_time_seconds,
        created_at=analysis.created_at,
        user_full_name=analysis.user.full_name if analysis.user else None,
        user_email=analysis.user.email if analysis.user else None,
    )


def _analysis_to_list_response(analysis: Analysis) -> AnalysisListResponse:
    """Convert Analysis model to list response schema."""
    return AnalysisListResponse(
        id=analysis.id,
        user_id=analysis.user_id,
        file_name=analysis.file_name,
        sector=analysis.sector,
        idea_summary=analysis.idea_summary,
        overall_score=analysis.overall_score,
        recommendation=analysis.recommendation,
        model_used=analysis.model_used,
        processing_time_seconds=analysis.processing_time_seconds,
        created_at=analysis.created_at,
        user_full_name=analysis.user.full_name if analysis.user else None,
        user_email=analysis.user.email if analysis.user else None,
        dimension_scores=analysis.dimension_scores,
        key_strengths=analysis.key_strengths,
        key_concerns=analysis.key_concerns,
    )
