"""
API endpoints for idea scoring.
Supports both URL-based scoring (backward compatible) and PDF-based multi-agent scoring.
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, AsyncGenerator
import json
import os
import logging
import tempfile
import shutil
import asyncio
import hashlib
from queue import Queue
from threading import Thread

from app.models.score import (
    IdeaScore,
    ScoringRequest,
    PDFScoringRequest,
    PDFScoringResult,
    CheckpointStatus,
    DimensionScore
)
from app.models.extraction import Extraction
from app.services.scorer import IdeaScorer
from app.services.mas_scorer import MASScorer
from app.config import get_settings, Settings
from app.services.agents.progress import get_architecture, get_all_steps_info
from app.database import get_db

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


def get_mas_scorer(
    provider: str,
    model: Optional[str],
    use_checkpoints: bool,
    settings: Settings
) -> MASScorer:
    """Create MAS scorer with specified configuration."""
    return MASScorer(
        provider=provider,
        model=model,
        openai_api_key=settings.openai_api_key,
        anthropic_api_key=settings.anthropic_api_key,
        groq_api_key=settings.groq_api_key,
        use_checkpoints=use_checkpoints,
        checkpoint_dir=settings.checkpoint_dir
    )


# ==============================================================================
# URL-BASED SCORING (Backward Compatible)
# ==============================================================================

@router.post("/score", response_model=IdeaScore)
async def score_idea(
    request: ScoringRequest,
    settings: Settings = Depends(get_settings),
    scorer_factory=Depends(get_scorer_factory)
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


# ==============================================================================
# PDF-BASED MULTI-AGENT SCORING
# ==============================================================================

@router.post("/score-pdf", response_model=PDFScoringResult)
async def score_pdf(
    file: UploadFile = File(..., description="PDF file to analyze"),
    sector: str = Form(..., description="Business sector (e.g., 'mobility', 'healthcare')"),
    num_ideas: int = Form(default=3, description="Number of ideas to generate"),
    idea_index: int = Form(default=0, description="Which idea to evaluate (0-indexed)"),
    provider: str = Form(default="anthropic", description="LLM provider"),
    model: Optional[str] = Form(default=None, description="Model name"),
    use_checkpoints: bool = Form(default=True, description="Use checkpoint system"),
    settings: Settings = Depends(get_settings)
):
    """
    Score a business idea from a PDF file using the multi-agent system.

    This endpoint runs the 5-agent pipeline:
    1. Agent 1: PDF content extraction
    2. Agent 2: Business idea generation
    3. Agent 3: 11-dimension evaluation
    4. Agent 4: Synthesis (summary, strengths, concerns)
    5. Agent 5: Final consolidation

    Args:
        file: PDF file to analyze
        sector: Business sector for context
        num_ideas: Number of ideas to generate (default: 3)
        idea_index: Which generated idea to evaluate (default: 0)
        provider: LLM provider (ollama, groq, anthropic, openai)
        model: Model name (optional)
        use_checkpoints: Whether to use checkpoints for resumable processing

    Returns:
        Complete PDFScoringResult with all dimension scores and recommendation
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="File must be a PDF"
        )

    # Save uploaded file to temp location
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, file.filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Processing PDF: {file.filename} (sector: {sector}, provider: {provider})")

        # Create MAS scorer
        mas_scorer = get_mas_scorer(provider, model, use_checkpoints, settings)

        # Run multi-agent scoring
        result = mas_scorer.score_pdf(
            pdf_path=temp_path,
            sector=sector,
            num_ideas=num_ideas,
            idea_index=idea_index
        )

        # Convert to response model
        return PDFScoringResult(
            idea_summary=result["idea_summary"],
            source=file.filename,
            sector=result["sector"],
            dimension_scores=[
                DimensionScore(
                    dimension=ds["dimension"],
                    score=ds["score"],
                    reasoning=ds.get("reasoning", ""),
                    confidence=ds.get("confidence", 0.8)
                )
                for ds in result["dimension_scores"]
            ],
            overall_score=result["overall_score"],
            recommendation=result["recommendation"],
            recommendation_rationale=result.get("recommendation_rationale", ""),
            key_strengths=result["key_strengths"],
            key_concerns=result["key_concerns"],
            timestamp=result["timestamp"],
            model_used=result["model_used"],
            processing_time_seconds=result.get("processing_time_seconds", 0),
            pdf_metadata=result.get("pdf_metadata"),
            generated_ideas_count=result.get("generated_ideas_count", 0),
            evaluated_idea_index=result.get("evaluated_idea_index", 0)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in PDF scoring: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to score PDF: {str(e)}"
        )
    finally:
        # Cleanup temp file
        shutil.rmtree(temp_dir, ignore_errors=True)


@router.post("/score-pdf-stream")
async def score_pdf_stream(
    file: UploadFile = File(..., description="PDF file to analyze"),
    sector: str = Form(..., description="Business sector (e.g., 'mobility', 'healthcare')"),
    num_ideas: int = Form(default=3, description="Number of ideas to generate"),
    idea_index: int = Form(default=0, description="Which idea to evaluate (0-indexed)"),
    provider: str = Form(default="anthropic", description="LLM provider"),
    model: Optional[str] = Form(default=None, description="Model name"),
    use_checkpoints: bool = Form(default=True, description="Use checkpoint system"),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db)
):
    """
    Score a business idea from a PDF file with real-time progress streaming (SSE).

    This endpoint runs the 5-agent pipeline and streams progress updates:
    - 17 total steps across 5 agents
    - Progress events sent as Server-Sent Events (SSE)
    - Final result sent when complete

    Returns:
        StreamingResponse with SSE events
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="File must be a PDF"
        )

    # Save uploaded file to temp location
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, file.filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Compute file hash for deduplication
        with open(temp_path, "rb") as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()

        logger.info(f"Processing PDF (streaming): {file.filename} (sector: {sector}, provider: {provider})")

        # Create MAS scorer
        mas_scorer = get_mas_scorer(provider, model, use_checkpoints, settings)
        model_used = model or mas_scorer.llm_factory.model

        async def event_generator() -> AsyncGenerator[str, None]:
            """Generate SSE events for progress and final result."""
            progress_queue: Queue = Queue()
            result_holder = {"result": None, "error": None}

            # Send architecture info first for debug panel
            arch_event = {
                "architecture": get_architecture(),
                "steps": get_all_steps_info(),
                "model_info": {
                    "provider": provider,
                    "model": model or "default",
                    "deployment": "local" if provider.lower() == "ollama" else "cloud"
                }
            }
            yield f"event: init\ndata: {json.dumps(arch_event)}\n\n"

            def progress_callback(event: dict):
                """Callback to push progress events to the queue."""
                progress_queue.put(("progress", event))

            def run_scoring():
                """Run scoring in a separate thread."""
                try:
                    result = mas_scorer.score_pdf(
                        pdf_path=temp_path,
                        sector=sector,
                        num_ideas=num_ideas,
                        idea_index=idea_index,
                        progress_callback=progress_callback
                    )
                    result_holder["result"] = result
                except Exception as e:
                    logger.error(f"Scoring error: {e}")
                    result_holder["error"] = str(e)
                finally:
                    progress_queue.put(("done", None))

            # Start scoring in background thread
            scoring_thread = Thread(target=run_scoring)
            scoring_thread.start()

            try:
                # Yield progress events as they arrive
                while True:
                    try:
                        # Check queue with a small timeout to allow async
                        await asyncio.sleep(0.1)

                        while not progress_queue.empty():
                            event_type, event_data = progress_queue.get_nowait()

                            if event_type == "progress":
                                yield f"event: progress\ndata: {json.dumps(event_data)}\n\n"
                            elif event_type == "done":
                                # Scoring complete
                                if result_holder["error"]:
                                    error_event = {
                                        "type": "error",
                                        "message": result_holder["error"]
                                    }
                                    yield f"event: error\ndata: {json.dumps(error_event)}\n\n"
                                elif result_holder["result"]:
                                    # Build final result
                                    result = result_holder["result"]

                                    # Save extraction to database for reuse
                                    try:
                                        extracted_text = result.get("extracted_text", "")
                                        if extracted_text:
                                            # Check if extraction already exists
                                            existing = db.query(Extraction).filter(
                                                Extraction.file_hash == file_hash,
                                                Extraction.model_used == model_used
                                            ).first()

                                            if not existing:
                                                new_extraction = Extraction(
                                                    file_name=file.filename,
                                                    file_hash=file_hash,
                                                    extracted_text=extracted_text,
                                                    model_used=model_used,
                                                    sector=sector,
                                                    token_count=len(extracted_text) // 4  # Rough estimate
                                                )
                                                db.add(new_extraction)
                                                db.commit()
                                                logger.info(f"Saved extraction for {file.filename} (hash: {file_hash[:8]}...)")
                                            else:
                                                logger.info(f"Extraction already exists for {file.filename}")
                                    except Exception as e:
                                        logger.error(f"Failed to save extraction: {e}")
                                        # Don't fail the whole request if extraction save fails

                                    final_result = {
                                        "idea_summary": result["idea_summary"],
                                        "source": file.filename,
                                        "sector": result["sector"],
                                        "dimension_scores": result["dimension_scores"],
                                        "overall_score": result["overall_score"],
                                        "recommendation": result["recommendation"],
                                        "recommendation_rationale": result.get("recommendation_rationale", ""),
                                        "key_strengths": result["key_strengths"],
                                        "key_concerns": result["key_concerns"],
                                        "timestamp": result["timestamp"],
                                        "model_used": result["model_used"],
                                        "processing_time_seconds": result.get("processing_time_seconds", 0),
                                        "pdf_metadata": result.get("pdf_metadata"),
                                        "generated_ideas_count": result.get("generated_ideas_count", 0),
                                        "evaluated_idea_index": result.get("evaluated_idea_index", 0)
                                    }
                                    yield f"event: result\ndata: {json.dumps(final_result)}\n\n"
                                return

                    except Exception as e:
                        logger.error(f"SSE generator error: {e}")
                        error_event = {"type": "error", "message": str(e)}
                        yield f"event: error\ndata: {json.dumps(error_event)}\n\n"
                        return
            finally:
                # Cleanup temp directory after streaming completes
                shutil.rmtree(temp_dir, ignore_errors=True)
                logger.info(f"Cleaned up temp directory: {temp_dir}")

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting up PDF streaming: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start PDF scoring: {str(e)}"
        )


@router.post("/score-extraction-stream")
async def score_extraction_stream(
    extraction_id: int = Form(..., description="ID of the extraction to score"),
    sector: str = Form(..., description="Business sector (e.g., 'mobility', 'healthcare')"),
    num_ideas: int = Form(default=3, description="Number of ideas to generate"),
    idea_index: int = Form(default=0, description="Which idea to evaluate (0-indexed)"),
    provider: str = Form(default="groq", description="LLM provider"),
    model: Optional[str] = Form(default=None, description="Model name"),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db)
):
    """
    Score a business idea from a previously extracted document with real-time progress streaming (SSE).

    This endpoint skips Agent 1 (extraction) and starts from Agent 2 (idea generation):
    - 16 total steps across 4 agents (skipping extraction)
    - Progress events sent as Server-Sent Events (SSE)
    - Final result sent when complete

    Returns:
        StreamingResponse with SSE events
    """
    # Fetch the extraction from database
    extraction = db.query(Extraction).filter(Extraction.id == extraction_id).first()
    if not extraction:
        raise HTTPException(
            status_code=404,
            detail="Extraction not found"
        )

    logger.info(f"Scoring from extraction ID {extraction_id}: {extraction.file_name} (sector: {sector}, provider: {provider})")

    # Create MAS scorer
    mas_scorer = get_mas_scorer(provider, model, False, settings)  # No checkpoints for text scoring

    async def event_generator() -> AsyncGenerator[str, None]:
        """Generate SSE events for progress and final result."""
        progress_queue: Queue = Queue()
        result_holder = {"result": None, "error": None}

        # Send architecture info first for debug panel
        arch_event = {
            "architecture": get_architecture(),
            "steps": get_all_steps_info(),
            "model_info": {
                "provider": provider,
                "model": model or "default",
                "deployment": "local" if provider.lower() == "ollama" else "cloud"
            }
        }
        yield f"event: init\ndata: {json.dumps(arch_event)}\n\n"

        def progress_callback(event: dict):
            """Callback to push progress events to the queue."""
            progress_queue.put(("progress", event))

        def run_scoring():
            """Run scoring in a separate thread."""
            try:
                result = mas_scorer.score_text(
                    extracted_text=extraction.extracted_text,
                    source_name=extraction.file_name,
                    sector=sector,
                    num_ideas=num_ideas,
                    idea_index=idea_index,
                    progress_callback=progress_callback
                )
                result_holder["result"] = result
            except Exception as e:
                logger.error(f"Scoring error: {e}")
                result_holder["error"] = str(e)
            finally:
                progress_queue.put(("done", None))

        # Start scoring in background thread
        scoring_thread = Thread(target=run_scoring)
        scoring_thread.start()

        try:
            # Yield progress events as they arrive
            while True:
                try:
                    # Check queue with a small timeout to allow async
                    await asyncio.sleep(0.1)

                    while not progress_queue.empty():
                        event_type, event_data = progress_queue.get_nowait()

                        if event_type == "progress":
                            yield f"event: progress\ndata: {json.dumps(event_data)}\n\n"
                        elif event_type == "done":
                            # Scoring complete
                            if result_holder["error"]:
                                error_event = {
                                    "type": "error",
                                    "message": result_holder["error"]
                                }
                                yield f"event: error\ndata: {json.dumps(error_event)}\n\n"
                            elif result_holder["result"]:
                                # Build final result
                                result = result_holder["result"]
                                final_result = {
                                    "idea_summary": result["idea_summary"],
                                    "source": extraction.file_name,
                                    "sector": result["sector"],
                                    "dimension_scores": result["dimension_scores"],
                                    "overall_score": result["overall_score"],
                                    "recommendation": result["recommendation"],
                                    "recommendation_rationale": result.get("recommendation_rationale", ""),
                                    "key_strengths": result["key_strengths"],
                                    "key_concerns": result["key_concerns"],
                                    "timestamp": result["timestamp"],
                                    "model_used": result["model_used"],
                                    "processing_time_seconds": result.get("processing_time_seconds", 0),
                                    "pdf_metadata": result.get("pdf_metadata"),
                                    "generated_ideas_count": result.get("generated_ideas_count", 0),
                                    "evaluated_idea_index": result.get("evaluated_idea_index", 0)
                                }
                                yield f"event: result\ndata: {json.dumps(final_result)}\n\n"
                            return

                except Exception as e:
                    logger.error(f"SSE generator error: {e}")
                    error_event = {"type": "error", "message": str(e)}
                    yield f"event: error\ndata: {json.dumps(error_event)}\n\n"
                    return
        finally:
            logger.info(f"Extraction scoring complete for ID {extraction_id}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/providers")
async def list_providers():
    """
    List available LLM providers and their models.

    Returns:
        Dict with available providers and model information
    """
    return {
        "providers": [
            {
                "name": "anthropic",
                "display_name": "Anthropic Claude",
                "default_model": "claude-sonnet-4-20250514",
                "models": ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"]
            },
            {
                "name": "openai",
                "display_name": "OpenAI GPT",
                "default_model": "gpt-4o",
                "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4"]
            },
            {
                "name": "groq",
                "display_name": "Groq (Free, Fast)",
                "default_model": "llama-3.3-70b-versatile",
                "models": ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"]
            },
            {
                "name": "ollama",
                "display_name": "Ollama (Local)",
                "default_model": "mistral",
                "models": ["mistral", "llama3", "codellama"]
            }
        ]
    }


# ==============================================================================
# URL MANAGEMENT (Backward Compatible)
# ==============================================================================

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


# ==============================================================================
# HEALTH & STATUS
# ==============================================================================

@router.get("/health")
async def health_check():
    """
    Health check endpoint.

    Returns:
        Status message
    """
    return {"status": "healthy", "service": "vb-idea-scorer", "version": "2.0.0"}


# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

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
