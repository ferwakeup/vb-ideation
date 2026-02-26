"""
Configuration management for the application.
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # AI Provider API Keys
    openai_api_key: str = ""
    google_api_key: str = ""
    anthropic_api_key: str = ""
    groq_api_key: str = ""

    # Default provider and model settings
    default_provider: str = "anthropic"  # ollama, groq, anthropic, openai, google

    # Provider-specific model defaults
    ollama_model: str = "mistral"
    ollama_base_url: str = "http://localhost:11434"
    groq_model: str = "llama-3.3-70b-versatile"
    anthropic_model: str = "claude-sonnet-4-20250514"
    openai_model: str = "gpt-4o"
    google_model: str = "gemini-2.0-flash"

    # URL configuration (backward compatibility)
    urls_config_path: str = "config/urls.json"

    # Checkpoint configuration
    checkpoint_dir: str = "checkpoints"
    use_checkpoints: bool = True

    # Server settings
    environment: str = "development"
    debug: bool = True

    # JWT settings
    jwt_secret_key: str = "your-secret-key-change-in-production"

    # Email settings
    resend_api_key: str = ""  # Resend API key (preferred)
    resend_from_email: str = ""  # Resend from address (takes precedence over email_from)
    smtp_host: str = ""  # SMTP server host
    smtp_port: int = 587  # SMTP server port
    smtp_username: str = ""  # SMTP username
    smtp_password: str = ""  # SMTP password
    smtp_tls: bool = True  # Use TLS
    email_from: str = "VB Ideation <noreply@moven.pro>"  # Default from address
    frontend_url: str = "https://scorer.moven.pro"  # Frontend URL for verification links

    @property
    def sender_email(self) -> str:
        """Get the email sender address, preferring resend_from_email if set."""
        return self.resend_from_email or self.email_from

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Returns:
        Settings object with configuration
    """
    return Settings()
