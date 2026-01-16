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


def get_scorer_factory(settings: Settings = Depends(get_settings)):
    """Factory to create scorer instances with specific models."""
    def create_scorer(model: str = "gpt-4o") -> IdeaScorer:
        return IdeaScorer(
            model=model,
            openai_api_key=settings.openai_api_key,
            google_api_key=settings.google_api_key
        )
    return create_scorer


@router.post("/score", response_model=IdeaScore)
async def score_idea(
    request: ScoringRequest,
    settings: Settings = Depends(get_settings),
    scorer_factory = Depends(get_scorer_factory)
):
    """
    Score a business idea from URLs.

    Args:
        request: ScoringRequest with either urls list or url_source='config' and optional model

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

        # Create scorer with specified model
        model = request.model or "gpt-4o"
        logger.info(f"Scoring idea from {len(urls)} URL(s) using model: {model}")
        scorer = scorer_factory(model=model)

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
