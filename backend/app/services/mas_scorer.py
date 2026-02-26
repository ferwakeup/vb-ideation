"""
Multi-Agent System Scorer.
Main orchestrator that runs the 5-agent pipeline for business idea evaluation.
"""
from typing import Dict, Optional, List, Callable
from datetime import datetime
import logging

from app.services.llm_factory import LLMFactory
from app.services.checkpoint import CheckpointManager
from app.services.pdf_loader import PDFLoader, load_pdf
from app.services.agents import (
    Agent1Extraction,
    Agent2Ideas,
    Agent3Dimensions,
    Agent4Synthesis,
    Agent5Consolidation
)
from app.services.agents.progress import ProgressReporter

logger = logging.getLogger(__name__)


class MASScorer:
    """
    Multi-Agent System Scorer.

    Orchestrates the 5-agent pipeline:
    1. Agent 1: PDF content extraction
    2. Agent 2: Business idea generation
    3. Agent 3: 11-dimension evaluation
    4. Agent 4: Synthesis (summary, strengths, concerns)
    5. Agent 5: Final consolidation and report
    """

    def __init__(
        self,
        provider: str = "anthropic",
        model: Optional[str] = None,
        openai_api_key: Optional[str] = None,
        anthropic_api_key: Optional[str] = None,
        groq_api_key: Optional[str] = None,
        use_checkpoints: bool = True,
        checkpoint_dir: Optional[str] = None
    ):
        """
        Initialize MAS Scorer.

        Args:
            provider: LLM provider (ollama, groq, anthropic, openai)
            model: Model name (optional, uses provider default)
            openai_api_key: OpenAI API key
            anthropic_api_key: Anthropic API key
            groq_api_key: Groq API key
            use_checkpoints: Whether to use checkpoint system
            checkpoint_dir: Directory for checkpoints
        """
        self.provider = provider
        self.model = model
        self.use_checkpoints = use_checkpoints
        self.checkpoint_dir = checkpoint_dir

        # Create LLM factory
        self.llm_factory = LLMFactory(
            provider=provider,
            model=model,
            openai_api_key=openai_api_key,
            anthropic_api_key=anthropic_api_key,
            groq_api_key=groq_api_key
        )

        self.pdf_loader = PDFLoader(provider=provider)

        logger.info(f"MAS Scorer initialized with {provider} provider")

    def score_pdf(
        self,
        pdf_path: str,
        sector: str,
        num_ideas: int = 3,
        idea_index: int = 0,
        progress_callback: Optional[Callable[[Dict], None]] = None
    ) -> Dict:
        """
        Score a business idea from a PDF document.

        Args:
            pdf_path: Path to the PDF file
            sector: Business sector for analysis
            num_ideas: Number of ideas to generate (default: 3)
            idea_index: Which generated idea to evaluate (default: 0 = first)
            progress_callback: Optional callback for progress updates

        Returns:
            Complete scoring result dict
        """
        # Initialize progress reporter with model info
        progress = ProgressReporter(
            callback=progress_callback,
            provider=self.provider,
            model=self.llm_factory.model
        )
        start_time = datetime.now()
        logger.info(f"Starting MAS scoring for {pdf_path} (sector: {sector})")

        # Initialize checkpoint manager
        checkpoint_manager = None
        if self.use_checkpoints:
            checkpoint_manager = CheckpointManager(
                pdf_path=pdf_path,
                sector=sector,
                provider=self.provider,
                model=self.llm_factory.model,
                checkpoint_dir=self.checkpoint_dir
            )

            # Log checkpoint status
            status = checkpoint_manager.get_status()
            if status["is_new_analysis"]:
                logger.info("New analysis - no existing checkpoints")
            else:
                logger.info(f"Continuing analysis - {status['total_checkpoints']} existing checkpoints")

        # Load PDF
        logger.info("Loading PDF document...")
        document_content, pdf_metadata = load_pdf(pdf_path)

        # ==== AGENT 1: Extraction ====
        logger.info("Running Agent 1: Content Extraction")
        progress.start_extraction()
        agent1 = Agent1Extraction(self.llm_factory, checkpoint_manager)
        extraction_result = agent1.extract(document_content, sector)
        progress.complete_extraction()

        # ==== AGENT 2: Idea Generation ====
        logger.info("Running Agent 2: Idea Generation")
        progress.start_idea_generation()
        agent2 = Agent2Ideas(self.llm_factory, checkpoint_manager)
        ideas_result = agent2.generate(
            extraction_result["raw_output"],
            sector,
            num_ideas
        )
        progress.complete_idea_generation()

        # Parse ideas and select one for evaluation
        parsed_ideas = Agent2Ideas.parse_ideas(ideas_result["raw_output"])
        if not parsed_ideas:
            raise ValueError("No business ideas were generated")

        selected_idea = parsed_ideas[min(idea_index, len(parsed_ideas) - 1)]
        logger.info(f"Selected idea {idea_index + 1} of {len(parsed_ideas)} for evaluation")

        # ==== AGENT 3: Dimensional Evaluation ====
        logger.info("Running Agent 3: Dimensional Evaluation (11 dimensions)")
        agent3 = Agent3Dimensions(self.llm_factory, checkpoint_manager)
        evaluations = agent3.evaluate_all(
            selected_idea,
            extraction_result["raw_output"],
            sector,
            progress_callback=lambda dim_idx: (
                progress.start_dimension(dim_idx) if dim_idx >= 0
                else progress.complete_dimension(-dim_idx - 1)
            )
        )

        # ==== AGENT 4: Synthesis ====
        logger.info("Running Agent 4: Synthesis Sub-agents")
        agent4 = Agent4Synthesis(self.llm_factory, checkpoint_manager)

        # Agent 4.1: Generate summary
        progress.start_synthesis_summary()
        summary = agent4.generate_summary(selected_idea, evaluations)
        progress.complete_synthesis_summary()

        # Agent 4.2: Identify strengths
        progress.start_synthesis_strengths()
        strengths = agent4.identify_strengths(summary, evaluations)
        progress.complete_synthesis_strengths()

        # Agent 4.3: Identify concerns
        progress.start_synthesis_concerns()
        concerns = agent4.identify_concerns(summary, evaluations)
        progress.complete_synthesis_concerns()

        synthesis_result = {
            "summary": summary,
            "strengths": strengths,
            "concerns": concerns
        }

        # ==== AGENT 5: Final Consolidation ====
        logger.info("Running Agent 5: Final Consolidation")
        progress.start_consolidation()
        agent5 = Agent5Consolidation(self.llm_factory, checkpoint_manager)
        final_report = agent5.consolidate(
            synthesis_result["summary"],
            synthesis_result["strengths"],
            synthesis_result["concerns"],
            evaluations
        )
        progress.complete_consolidation()

        # Calculate elapsed time
        elapsed = (datetime.now() - start_time).total_seconds()

        # Build final result
        result = {
            "idea_summary": final_report["business_idea_summary"],
            "source": pdf_path,
            "sector": sector,
            "dimension_scores": [
                {
                    "dimension": ds["dimension"],
                    "score": ds["score"] or 0,
                    "reasoning": ds.get("reasoning", ""),
                    "confidence": 0.8  # Default confidence
                }
                for ds in final_report["dimensional_scores"]
            ],
            "overall_score": final_report["overall_score"],
            "recommendation": self._format_recommendation(final_report["recommendation"]),
            "recommendation_rationale": final_report.get("recommendation_rationale", ""),
            "key_strengths": final_report["key_strengths"],
            "key_concerns": final_report["key_concerns"],
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "model_used": f"{self.provider}/{self.llm_factory.model}",
            "processing_time_seconds": round(elapsed, 2),
            "pdf_metadata": pdf_metadata,
            "generated_ideas_count": len(parsed_ideas),
            "evaluated_idea_index": idea_index,
            # Include extracted text for saving to database
            "extracted_text": extraction_result["raw_output"]
        }

        logger.info(
            f"MAS scoring complete. Overall score: {final_report['overall_score']}/10, "
            f"Recommendation: {final_report['recommendation']}, "
            f"Time: {elapsed:.1f}s"
        )

        return result

    def score_text(
        self,
        extracted_text: str,
        source_name: str,
        sector: str,
        num_ideas: int = 3,
        idea_index: int = 0,
        progress_callback: Optional[Callable[[Dict], None]] = None
    ) -> Dict:
        """
        Score a business idea from pre-extracted text.
        Skips Agent 1 (extraction) and starts from Agent 2.

        Args:
            extracted_text: Pre-extracted text content
            source_name: Name of the source document
            sector: Business sector for analysis
            num_ideas: Number of ideas to generate (default: 3)
            idea_index: Which generated idea to evaluate (default: 0 = first)
            progress_callback: Optional callback for progress updates

        Returns:
            Complete scoring result dict
        """
        # Initialize progress reporter with model info
        progress = ProgressReporter(
            callback=progress_callback,
            provider=self.provider,
            model=self.llm_factory.model
        )
        start_time = datetime.now()
        logger.info(f"Starting MAS scoring from pre-extracted text (sector: {sector})")

        # No checkpoints for text scoring (already have extraction)
        checkpoint_manager = None

        # ==== SKIP AGENT 1 - Use pre-extracted text directly ====
        # Mark extraction as already complete
        progress.start_extraction()
        progress.complete_extraction()

        # ==== AGENT 2: Idea Generation ====
        logger.info("Running Agent 2: Idea Generation")
        progress.start_idea_generation()
        agent2 = Agent2Ideas(self.llm_factory, checkpoint_manager)
        ideas_result = agent2.generate(
            extracted_text,
            sector,
            num_ideas
        )
        progress.complete_idea_generation()

        # Parse ideas and select one for evaluation
        parsed_ideas = Agent2Ideas.parse_ideas(ideas_result["raw_output"])
        if not parsed_ideas:
            raise ValueError("No business ideas were generated")

        selected_idea = parsed_ideas[min(idea_index, len(parsed_ideas) - 1)]
        logger.info(f"Selected idea {idea_index + 1} of {len(parsed_ideas)} for evaluation")

        # ==== AGENT 3: Dimensional Evaluation ====
        logger.info("Running Agent 3: Dimensional Evaluation (11 dimensions)")
        agent3 = Agent3Dimensions(self.llm_factory, checkpoint_manager)
        evaluations = agent3.evaluate_all(
            selected_idea,
            extracted_text,
            sector,
            progress_callback=lambda dim_idx: (
                progress.start_dimension(dim_idx) if dim_idx >= 0
                else progress.complete_dimension(-dim_idx - 1)
            )
        )

        # ==== AGENT 4: Synthesis ====
        logger.info("Running Agent 4: Synthesis Sub-agents")
        agent4 = Agent4Synthesis(self.llm_factory, checkpoint_manager)

        # Agent 4.1: Generate summary
        progress.start_synthesis_summary()
        summary = agent4.generate_summary(selected_idea, evaluations)
        progress.complete_synthesis_summary()

        # Agent 4.2: Identify strengths
        progress.start_synthesis_strengths()
        strengths = agent4.identify_strengths(summary, evaluations)
        progress.complete_synthesis_strengths()

        # Agent 4.3: Identify concerns
        progress.start_synthesis_concerns()
        concerns = agent4.identify_concerns(summary, evaluations)
        progress.complete_synthesis_concerns()

        synthesis_result = {
            "summary": summary,
            "strengths": strengths,
            "concerns": concerns
        }

        # ==== AGENT 5: Final Consolidation ====
        logger.info("Running Agent 5: Final Consolidation")
        progress.start_consolidation()
        agent5 = Agent5Consolidation(self.llm_factory, checkpoint_manager)
        final_report = agent5.consolidate(
            synthesis_result["summary"],
            synthesis_result["strengths"],
            synthesis_result["concerns"],
            evaluations
        )
        progress.complete_consolidation()

        # Calculate elapsed time
        elapsed = (datetime.now() - start_time).total_seconds()

        # Build final result
        result = {
            "idea_summary": final_report["business_idea_summary"],
            "source": source_name,
            "sector": sector,
            "dimension_scores": [
                {
                    "dimension": ds["dimension"],
                    "score": ds["score"] or 0,
                    "reasoning": ds.get("reasoning", ""),
                    "confidence": 0.8  # Default confidence
                }
                for ds in final_report["dimensional_scores"]
            ],
            "overall_score": final_report["overall_score"],
            "recommendation": self._format_recommendation(final_report["recommendation"]),
            "recommendation_rationale": final_report.get("recommendation_rationale", ""),
            "key_strengths": final_report["key_strengths"],
            "key_concerns": final_report["key_concerns"],
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "model_used": f"{self.provider}/{self.llm_factory.model}",
            "processing_time_seconds": round(elapsed, 2),
            "pdf_metadata": None,
            "generated_ideas_count": len(parsed_ideas),
            "evaluated_idea_index": idea_index
        }

        logger.info(
            f"MAS scoring (from text) complete. Overall score: {final_report['overall_score']}/10, "
            f"Recommendation: {final_report['recommendation']}, "
            f"Time: {elapsed:.1f}s"
        )

        return result

    def _format_recommendation(self, recommendation: str) -> str:
        """Format recommendation for display."""
        mapping = {
            "STRONG_PROCEED": "Strong Pursue",
            "CONDITIONAL_PROCEED": "Consider with Conditions",
            "REQUIRES_REFINEMENT": "Further Research Needed",
            "REJECT": "Pass"
        }
        return mapping.get(recommendation, recommendation)

    def get_checkpoint_status(self, pdf_path: str, sector: str) -> Dict:
        """
        Get checkpoint status for a PDF/sector combination.

        Args:
            pdf_path: Path to PDF
            sector: Sector name

        Returns:
            Checkpoint status dict
        """
        checkpoint_manager = CheckpointManager(
            pdf_path=pdf_path,
            sector=sector,
            provider=self.provider,
            model=self.llm_factory.model,
            checkpoint_dir=self.checkpoint_dir,
            use_checkpoints=True
        )
        return checkpoint_manager.get_status()

    def clear_checkpoints(self, pdf_path: str, sector: str) -> int:
        """
        Clear all checkpoints for a PDF/sector combination.

        Args:
            pdf_path: Path to PDF
            sector: Sector name

        Returns:
            Number of deleted checkpoints
        """
        checkpoint_manager = CheckpointManager(
            pdf_path=pdf_path,
            sector=sector,
            provider=self.provider,
            model=self.llm_factory.model,
            checkpoint_dir=self.checkpoint_dir,
            use_checkpoints=True
        )
        return checkpoint_manager.clear_all_checkpoints()
