"""
Main FastAPI application entry point.
Multi-Agent System for Business Idea Evaluation.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import scoring, auth, admin, extractions
from app.config import get_settings
from app.database import engine, Base, run_migrations, init_admin_user
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Get settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="VB Idea Scorer API",
    description="""
    AI-powered venture builder idea scoring system with Multi-Agent architecture.

    ## Features
    - **Multi-Provider Support**: OpenAI, Anthropic Claude, Groq, and Ollama
    - **PDF Analysis**: Extract insights and generate business ideas from PDF documents
    - **5-Agent Pipeline**: Extraction, Idea Generation, 11-Dimension Evaluation, Synthesis, Consolidation
    - **Checkpoint System**: Resume interrupted processing
    - **URL-based Scoring**: Backward compatible with URL input

    ## Endpoints
    - `POST /api/v1/score-pdf`: Score ideas from PDF using multi-agent system
    - `POST /api/v1/score`: Score ideas from URLs (backward compatible)
    - `GET /api/v1/providers`: List available LLM providers
    """,
    version="2.0.0",
    debug=settings.debug
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite default dev server
        "http://localhost:3000",  # Alternative React dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://scorer.moven.pro",
        "http://scorer.moven.pro", # Production domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(scoring.router, prefix="/api/v1", tags=["scoring"])
app.include_router(auth.router, prefix="/api/v1", tags=["authentication"])
app.include_router(admin.router, prefix="/api/v1", tags=["admin"])
app.include_router(extractions.router, prefix="/api/v1", tags=["extractions"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "VB Idea Scorer API - Multi-Agent System",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
        "endpoints": {
            "score_pdf": "POST /api/v1/score-pdf",
            "score_url": "POST /api/v1/score",
            "providers": "GET /api/v1/providers"
        }
    }


@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    logger.info("Starting startup_event...")

    # Import models to ensure they are registered with SQLAlchemy
    logger.info("Importing models...")
    from app.models import user, extraction  # noqa: F401
    logger.info("Models imported")

    # Run migrations to add any missing columns
    logger.info("Running migrations...")
    run_migrations()
    logger.info("Database migrations completed")

    # Create database tables (for new installations)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")

    # Initialize admin user
    init_admin_user()
    logger.info("Admin user initialized")

    logger.info("=" * 60)
    logger.info("Starting VB Idea Scorer API v2.0.0 (Multi-Agent System)")
    logger.info("=" * 60)
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Default Provider: {settings.default_provider}")
    logger.info(f"Checkpoints Enabled: {settings.use_checkpoints}")
    logger.info(f"Checkpoint Directory: {settings.checkpoint_dir}")
    logger.info("-" * 60)
    logger.info("API Keys configured:")
    logger.info(f"  - OpenAI: {'Yes' if settings.openai_api_key else 'No'}")
    logger.info(f"  - Anthropic: {'Yes' if settings.anthropic_api_key else 'No'}")
    logger.info(f"  - Groq: {'Yes' if settings.groq_api_key else 'No'}")
    logger.info(f"  - Google: {'Yes' if settings.google_api_key else 'No'}")
    logger.info("-" * 60)
    logger.info("Available endpoints:")
    logger.info("  - POST /api/v1/score-pdf (PDF multi-agent scoring)")
    logger.info("  - POST /api/v1/score (URL-based scoring)")
    logger.info("  - GET /api/v1/providers (list providers)")
    logger.info("  - GET /api/v1/health (health check)")
    logger.info("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    logger.info("Shutting down VB Idea Scorer API")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
