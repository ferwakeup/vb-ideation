"""
Main FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import scoring
from app.config import get_settings
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
    description="AI-powered venture builder idea scoring system using OpenAI GPT-4o",
    version="1.0.0",
    debug=settings.debug
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite default dev server
        "http://localhost:3000",  # Alternative React dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(scoring.router, prefix="/api/v1", tags=["scoring"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "VB Idea Scorer API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health"
    }


@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    logger.info("Starting VB Idea Scorer API")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"OpenAI API Key configured: {'Yes' if settings.openai_api_key else 'No'}")
    logger.info(f"Google API Key configured: {'Yes' if settings.google_api_key else 'No'}")


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
