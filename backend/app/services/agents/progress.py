"""
Progress tracking definitions for the Multi-Agent System.
Defines all 17 steps in the scoring pipeline.
"""
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import time


class ProgressStatus(str, Enum):
    """Status values for progress events."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class ProgressStep:
    """Definition of a single progress step."""
    step: int
    agent: str
    title: str
    description: str
    # Input/output descriptions for flow diagram
    inputs: List[str] = field(default_factory=list)
    outputs: List[str] = field(default_factory=list)

    def to_event(
        self,
        status: ProgressStatus = ProgressStatus.RUNNING,
        model_info: Optional[Dict] = None,
        timing: Optional[Dict] = None
    ) -> Dict:
        """Convert to progress event dict with optional model and timing info."""
        event = {
            "step": self.step,
            "total_steps": TOTAL_STEPS,
            "agent": self.agent,
            "title": self.title,
            "description": self.description,
            "status": status.value,
            "inputs": self.inputs,
            "outputs": self.outputs
        }
        if model_info:
            event["model_info"] = model_info
        if timing:
            event["timing"] = timing
        return event


# Total number of steps in the pipeline
TOTAL_STEPS = 17

# All progress steps in order with input/output descriptions
PROGRESS_STEPS: List[ProgressStep] = [
    # Agent 1: Content Extraction (1 step)
    ProgressStep(
        step=1,
        agent="Agent 1",
        title="Content Extraction",
        description="Extracting key market insights from the document",
        inputs=["PDF Document", "Sector"],
        outputs=["Market Context", "Key Insights"]
    ),

    # Agent 2: Idea Generation (1 step)
    ProgressStep(
        step=2,
        agent="Agent 2",
        title="Idea Generation",
        description="Generating viable business ideas from market data",
        inputs=["Market Context", "Sector"],
        outputs=["Business Ideas (3)"]
    ),

    # Agent 3: Dimensional Evaluation (11 steps, one per dimension)
    ProgressStep(
        step=3,
        agent="Agent 3",
        title="Market Potential",
        description="Evaluating market size, growth, and monetization capacity",
        inputs=["Selected Idea", "Market Context"],
        outputs=["Score", "Analysis"]
    ),
    ProgressStep(
        step=4,
        agent="Agent 3",
        title="Differentiated Approach",
        description="Assessing value proposition clarity and positioning",
        inputs=["Selected Idea", "Market Context"],
        outputs=["Score", "Analysis"]
    ),
    ProgressStep(
        step=5,
        agent="Agent 3",
        title="Competitive Advantage",
        description="Measuring long-term defensibility and sustainability",
        inputs=["Selected Idea", "Market Context"],
        outputs=["Score", "Analysis"]
    ),
    ProgressStep(
        step=6,
        agent="Agent 3",
        title="Differentiating Element",
        description="Identifying the core feature that makes the product stand out",
        inputs=["Selected Idea", "Market Context"],
        outputs=["Score", "Analysis"]
    ),
    ProgressStep(
        step=7,
        agent="Agent 3",
        title="Technical Feasibility",
        description="Assessing if the solution is technically achievable",
        inputs=["Selected Idea", "Market Context"],
        outputs=["Score", "Analysis"]
    ),
    ProgressStep(
        step=8,
        agent="Agent 3",
        title="Rapid Implementation",
        description="Evaluating time and cost to reach a usable MVP",
        inputs=["Selected Idea", "Market Context"],
        outputs=["Score", "Analysis"]
    ),
    ProgressStep(
        step=9,
        agent="Agent 3",
        title="AI Enablement",
        description="Evaluating how AI enhances the core product value",
        inputs=["Selected Idea", "Market Context"],
        outputs=["Score", "Analysis"]
    ),
    ProgressStep(
        step=10,
        agent="Agent 3",
        title="Barrier to Entry",
        description="Assessing difficulty for new entrants to compete",
        inputs=["Selected Idea", "Market Context"],
        outputs=["Score", "Analysis"]
    ),
    ProgressStep(
        step=11,
        agent="Agent 3",
        title="Scalability",
        description="Measuring if growth is non-linear and sustainable",
        inputs=["Selected Idea", "Market Context"],
        outputs=["Score", "Analysis"]
    ),
    ProgressStep(
        step=12,
        agent="Agent 3",
        title="Product Focus",
        description="Evaluating if offering is a repeatable product",
        inputs=["Selected Idea", "Market Context"],
        outputs=["Score", "Analysis"]
    ),
    ProgressStep(
        step=13,
        agent="Agent 3",
        title="Subscription Model",
        description="Assessing recurring revenue quality and predictability",
        inputs=["Selected Idea", "Market Context"],
        outputs=["Score", "Analysis"]
    ),

    # Agent 4: Synthesis (3 steps)
    ProgressStep(
        step=14,
        agent="Agent 4",
        title="Creating Summary",
        description="Synthesizing business idea overview from evaluations",
        inputs=["All 11 Evaluations", "Selected Idea"],
        outputs=["Business Summary"]
    ),
    ProgressStep(
        step=15,
        agent="Agent 4",
        title="Identifying Strengths",
        description="Analyzing top performing dimensions and strengths",
        inputs=["Business Summary", "Top Evaluations"],
        outputs=["Key Strengths (3)"]
    ),
    ProgressStep(
        step=16,
        agent="Agent 4",
        title="Identifying Concerns",
        description="Analyzing potential risks and areas of concern",
        inputs=["Business Summary", "Low Evaluations"],
        outputs=["Key Concerns (3)"]
    ),

    # Agent 5: Final Consolidation (1 step)
    ProgressStep(
        step=17,
        agent="Agent 5",
        title="Final Consolidation",
        description="Preparing final report and recommendations",
        inputs=["Summary", "Strengths", "Concerns", "All Scores"],
        outputs=["Final Report", "Recommendation"]
    ),
]


def get_step(step_number: int) -> Optional[ProgressStep]:
    """Get a progress step by its number (1-indexed)."""
    if 1 <= step_number <= len(PROGRESS_STEPS):
        return PROGRESS_STEPS[step_number - 1]
    return None


def get_dimension_step(dimension_index: int) -> Optional[ProgressStep]:
    """
    Get the progress step for a dimension evaluation.

    Args:
        dimension_index: 0-indexed dimension number (0-10)

    Returns:
        ProgressStep for the dimension, or None if invalid
    """
    # Dimensions start at step 3 (after extraction and idea generation)
    step_number = 3 + dimension_index
    return get_step(step_number)


class ProgressReporter:
    """Helper class to report progress events with timing and model info."""

    def __init__(
        self,
        callback: Optional[Callable[[Dict], None]] = None,
        provider: str = "unknown",
        model: str = "unknown"
    ):
        """
        Initialize progress reporter.

        Args:
            callback: Optional callback function to receive progress events
            provider: LLM provider name
            model: Model name
        """
        self.callback = callback
        self.current_step = 0
        self.provider = provider
        self.model = model

        # Timing tracking
        self.step_start_times: Dict[int, float] = {}
        self.step_durations: Dict[int, float] = {}
        self.total_start_time: Optional[float] = None

    def _get_model_info(self) -> Dict:
        """Get model info dict."""
        # Determine if local or cloud based on provider
        is_local = self.provider.lower() in ["ollama", "local", "llama.cpp"]
        return {
            "provider": self.provider,
            "model": self.model,
            "deployment": "local" if is_local else "cloud"
        }

    def _get_timing_info(self, step_number: int) -> Dict:
        """Get timing info for a step."""
        elapsed = 0.0
        if step_number in self.step_start_times:
            if step_number in self.step_durations:
                elapsed = self.step_durations[step_number]
            else:
                elapsed = time.time() - self.step_start_times[step_number]

        total_elapsed = 0.0
        if self.total_start_time:
            total_elapsed = time.time() - self.total_start_time

        return {
            "step_elapsed_seconds": round(elapsed, 2),
            "total_elapsed_seconds": round(total_elapsed, 2),
            "step_start_time": self.step_start_times.get(step_number),
            "all_step_durations": {
                str(k): round(v, 2) for k, v in self.step_durations.items()
            }
        }

    def report(
        self,
        step_number: int,
        status: ProgressStatus = ProgressStatus.RUNNING
    ):
        """
        Report progress for a given step.

        Args:
            step_number: Step number (1-17)
            status: Current status of the step
        """
        if self.callback is None:
            return

        step = get_step(step_number)
        if step:
            self.current_step = step_number
            event = step.to_event(
                status=status,
                model_info=self._get_model_info(),
                timing=self._get_timing_info(step_number)
            )
            self.callback(event)

    def start_step(self, step_number: int):
        """Mark a step as starting (running)."""
        if self.total_start_time is None:
            self.total_start_time = time.time()
        self.step_start_times[step_number] = time.time()
        self.report(step_number, ProgressStatus.RUNNING)

    def complete_step(self, step_number: int):
        """Mark a step as completed."""
        if step_number in self.step_start_times:
            self.step_durations[step_number] = time.time() - self.step_start_times[step_number]
        self.report(step_number, ProgressStatus.COMPLETED)

    def error_step(self, step_number: int):
        """Mark a step as having an error."""
        if step_number in self.step_start_times:
            self.step_durations[step_number] = time.time() - self.step_start_times[step_number]
        self.report(step_number, ProgressStatus.ERROR)

    # Convenience methods for specific agents
    def start_extraction(self):
        """Start Agent 1: Content Extraction."""
        self.start_step(1)

    def complete_extraction(self):
        """Complete Agent 1: Content Extraction."""
        self.complete_step(1)

    def start_idea_generation(self):
        """Start Agent 2: Idea Generation."""
        self.start_step(2)

    def complete_idea_generation(self):
        """Complete Agent 2: Idea Generation."""
        self.complete_step(2)

    def start_dimension(self, dimension_index: int):
        """Start evaluating a dimension (0-indexed)."""
        self.start_step(3 + dimension_index)

    def complete_dimension(self, dimension_index: int):
        """Complete evaluating a dimension (0-indexed)."""
        self.complete_step(3 + dimension_index)

    def start_synthesis_summary(self):
        """Start Agent 4.1: Summary."""
        self.start_step(14)

    def complete_synthesis_summary(self):
        """Complete Agent 4.1: Summary."""
        self.complete_step(14)

    def start_synthesis_strengths(self):
        """Start Agent 4.2: Strengths."""
        self.start_step(15)

    def complete_synthesis_strengths(self):
        """Complete Agent 4.2: Strengths."""
        self.complete_step(15)

    def start_synthesis_concerns(self):
        """Start Agent 4.3: Concerns."""
        self.start_step(16)

    def complete_synthesis_concerns(self):
        """Complete Agent 4.3: Concerns."""
        self.complete_step(16)

    def start_consolidation(self):
        """Start Agent 5: Final Consolidation."""
        self.start_step(17)

    def complete_consolidation(self):
        """Complete Agent 5: Final Consolidation."""
        self.complete_step(17)


# Agent Architecture Definition for Debug Panel
AGENT_ARCHITECTURE = {
    "agents": [
        {
            "id": 1,
            "name": "Agent 1: Content Extraction",
            "short_name": "Extraction",
            "description": "Extracts key market insights, trends, and data from PDF documents",
            "steps": [1],
            "color": "#3B82F6",  # blue
            "inputs": ["PDF Document", "Sector Context"],
            "outputs": ["Market Context", "Key Insights", "Trends"],
            "llm_calls": 1
        },
        {
            "id": 2,
            "name": "Agent 2: Idea Generation",
            "short_name": "Ideation",
            "description": "Generates viable business ideas based on extracted market data",
            "steps": [2],
            "color": "#8B5CF6",  # purple
            "inputs": ["Market Context", "Sector"],
            "outputs": ["Business Ideas (3)", "Selected Idea"],
            "llm_calls": 1
        },
        {
            "id": 3,
            "name": "Agent 3: Dimensional Evaluation",
            "short_name": "Evaluation",
            "description": "Evaluates business idea across 11 specialized dimensions",
            "steps": list(range(3, 14)),  # Steps 3-13
            "color": "#10B981",  # green
            "inputs": ["Selected Idea", "Market Context"],
            "outputs": ["11 Dimension Scores", "Detailed Analysis"],
            "llm_calls": 11,
            "sub_agents": [
                "3.1 Market Potential",
                "3.2 Differentiated Approach",
                "3.3 Competitive Advantage",
                "3.4 Differentiating Element",
                "3.5 Technical Feasibility",
                "3.6 Rapid Implementation",
                "3.7 AI Enablement",
                "3.8 Barrier to Entry",
                "3.9 Scalability",
                "3.10 Product Focus",
                "3.11 Subscription Model"
            ]
        },
        {
            "id": 4,
            "name": "Agent 4: Synthesis",
            "short_name": "Synthesis",
            "description": "Synthesizes evaluations into summary, strengths, and concerns",
            "steps": [14, 15, 16],
            "color": "#F59E0B",  # amber
            "inputs": ["All Evaluations", "Selected Idea"],
            "outputs": ["Business Summary", "Key Strengths (3)", "Key Concerns (3)"],
            "llm_calls": 3,
            "sub_agents": [
                "4.1 Summary Generation",
                "4.2 Strengths Identification",
                "4.3 Concerns Identification"
            ]
        },
        {
            "id": 5,
            "name": "Agent 5: Final Consolidation",
            "short_name": "Consolidation",
            "description": "Consolidates all analysis into final report with recommendation",
            "steps": [17],
            "color": "#EF4444",  # red
            "inputs": ["Summary", "Strengths", "Concerns", "All Scores"],
            "outputs": ["Final Report", "Overall Score", "Recommendation"],
            "llm_calls": 1
        }
    ],
    "flow": [
        {"from": "input", "to": 1, "data": "PDF + Sector"},
        {"from": 1, "to": 2, "data": "Market Context"},
        {"from": 2, "to": 3, "data": "Selected Idea"},
        {"from": 3, "to": 4, "data": "11 Evaluations"},
        {"from": 4, "to": 5, "data": "Synthesis Results"},
        {"from": 5, "to": "output", "data": "Final Report"}
    ],
    "total_llm_calls": 17,
    "pipeline_description": "Multi-Agent System for Business Idea Evaluation"
}


def get_architecture() -> Dict:
    """Get the agent architecture definition."""
    return AGENT_ARCHITECTURE


def get_all_steps_info() -> List[Dict]:
    """Get info for all steps including inputs/outputs."""
    return [
        {
            "step": s.step,
            "agent": s.agent,
            "title": s.title,
            "description": s.description,
            "inputs": s.inputs,
            "outputs": s.outputs
        }
        for s in PROGRESS_STEPS
    ]
