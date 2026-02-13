"""
LLM Factory - Multi-provider LLM creation service.
Supports Ollama, Groq, Anthropic, and OpenAI.
"""
from langchain_ollama import ChatOllama
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from langchain_core.language_models.chat_models import BaseChatModel
from typing import Optional
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)


class LLMFactory:
    """Factory for creating LLM instances based on provider configuration."""

    def __init__(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        openai_api_key: Optional[str] = None,
        anthropic_api_key: Optional[str] = None,
        groq_api_key: Optional[str] = None,
        ollama_base_url: Optional[str] = None,
    ):
        """
        Initialize LLM factory.

        Args:
            provider: LLM provider (ollama, groq, anthropic, openai)
            model: Model name (optional, uses provider default if not specified)
            openai_api_key: OpenAI API key
            anthropic_api_key: Anthropic API key
            groq_api_key: Groq API key
            ollama_base_url: Ollama server URL
        """
        settings = get_settings()

        self.provider = (provider or settings.default_provider).lower()
        self.openai_api_key = openai_api_key or settings.openai_api_key
        self.anthropic_api_key = anthropic_api_key or settings.anthropic_api_key
        self.groq_api_key = groq_api_key or settings.groq_api_key
        self.ollama_base_url = ollama_base_url or settings.ollama_base_url

        # Set model based on provider
        if model:
            self.model = model
        else:
            if self.provider == "ollama":
                self.model = settings.ollama_model
            elif self.provider == "groq":
                self.model = settings.groq_model
            elif self.provider == "anthropic":
                self.model = settings.anthropic_model
            elif self.provider == "openai":
                self.model = settings.openai_model
            else:
                self.model = "gpt-4o"

        logger.info(f"LLM Factory initialized with {self.provider} provider, model: {self.model}")

    def create_llm(self, temperature: float = 0.5) -> BaseChatModel:
        """
        Create an LLM instance based on provider configuration.

        Args:
            temperature: Temperature setting for the LLM (0.0-1.0)
                        Lower = more focused, Higher = more creative

        Returns:
            LLM instance (ChatOllama, ChatGroq, ChatAnthropic, or ChatOpenAI)

        Raises:
            ValueError: If provider is not supported or configuration is invalid
        """
        if self.provider == "ollama":
            return ChatOllama(
                model=self.model,
                base_url=self.ollama_base_url,
                temperature=temperature,
                keep_alive="10m"
            )

        elif self.provider == "groq":
            if not self.groq_api_key:
                raise ValueError(
                    "Groq API key not set. Set GROQ_API_KEY environment variable. "
                    "Get free API key at: https://console.groq.com"
                )
            return ChatGroq(
                model=self.model,
                api_key=self.groq_api_key,
                temperature=temperature
            )

        elif self.provider == "anthropic":
            if not self.anthropic_api_key:
                raise ValueError(
                    "Anthropic API key not set. Set ANTHROPIC_API_KEY environment variable."
                )
            return ChatAnthropic(
                model=self.model,
                api_key=self.anthropic_api_key,
                temperature=temperature
            )

        elif self.provider == "openai":
            if not self.openai_api_key:
                raise ValueError(
                    "OpenAI API key not set. Set OPENAI_API_KEY environment variable."
                )
            return ChatOpenAI(
                model=self.model,
                api_key=self.openai_api_key,
                temperature=temperature
            )

        else:
            raise ValueError(
                f"Unsupported provider: {self.provider}. "
                f"Choose from: 'ollama', 'groq', 'anthropic', or 'openai'"
            )

    def get_provider_info(self) -> dict:
        """Get information about the current provider and model."""
        return {
            "provider": self.provider,
            "model": self.model
        }
