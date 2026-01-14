"""
API endpoints for idea scoring.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
import json
import os
import logging
from app.models.score import IdeaScore, ScoringRequest
from app.services.scorer import IdeaScorer
from app.config import get_settings, Settings

logger = logging.getLogger(__name__)

router = APIRouter()


def get_scorer(settings: Settings = Depends(get_settings)) -> IdeaScorer:
    """Dependency to get scorer instance."""
    return IdeaScorer(openai_api_key=settings.openai_api_key)


@router.post("/score", response_model=IdeaScore)
async def score_idea(
    request: ScoringRequest,
    scorer: IdeaScorer = Depends(get_scorer),
    settings: Settings = Depends(get_settings)
):
    """
    Score a business idea from URLs.

    Args:
        request: ScoringRequest with either urls list or url_source='config'

    Returns:
        Complete IdeaScore with all dimension scores and recommendation
    """
    try:
        # Determine which URLs to use
        if request.url_source == "config":
            # Load URLs from config file
            urls = _load_urls_from_config(settings.urls_config_path)
            if not urls:
                raise HTTPException(
                    status_code=400,
                    detail="No URLs found in config file"
                )
        elif request.urls:
            urls = request.urls
        else:
            raise HTTPException(
                status_code=400,
                detail="Must provide either 'urls' or 'url_source=config'"
            )

        logger.info(f"Scoring idea from {len(urls)} URL(s)")

        # Perform scoring
        result = await scorer.score_idea(urls)

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in score endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to score idea: {str(e)}"
        )


@router.get("/urls")
async def get_urls(settings: Settings = Depends(get_settings)) -> dict:
    """
    Get the list of URLs from the config file.

    Returns:
        Dictionary with urls list
    """
    try:
        urls = _load_urls_from_config(settings.urls_config_path)
        return {"urls": urls}
    except Exception as e:
        logger.error(f"Error loading URLs: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load URLs: {str(e)}"
        )


@router.post("/urls")
async def update_urls(
    urls: List[str],
    settings: Settings = Depends(get_settings)
) -> dict:
    """
    Update the URLs in the config file.

    Args:
        urls: List of URLs to save

    Returns:
        Success message
    """
    try:
        _save_urls_to_config(settings.urls_config_path, urls)
        return {"message": f"Updated {len(urls)} URL(s)"}
    except Exception as e:
        logger.error(f"Error saving URLs: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save URLs: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """
    Health check endpoint.

    Returns:
        Status message
    """
    return {"status": "healthy", "service": "vb-idea-scorer"}


def _load_urls_from_config(config_path: str) -> List[str]:
    """Load URLs from JSON config file."""
    if not os.path.exists(config_path):
        logger.warning(f"Config file not found: {config_path}")
        return []

    with open(config_path, 'r') as f:
        config = json.load(f)

    return config.get('urls', [])


def _save_urls_to_config(config_path: str, urls: List[str]):
    """Save URLs to JSON config file."""
    # Ensure directory exists
    os.makedirs(os.path.dirname(config_path), exist_ok=True)

    # Load existing config if it exists
    config = {}
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            config = json.load(f)

    # Update URLs
    config['urls'] = urls

    # Save back to file
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)

    logger.info(f"Saved {len(urls)} URLs to {config_path}")
