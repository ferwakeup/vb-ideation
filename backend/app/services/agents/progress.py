"""
Progress tracking definitions for the Multi-Agent System.
Defines all 17 steps in the scoring pipeline.
"""
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum


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

    def to_event(self, status: ProgressStatus = ProgressStatus.RUNNING) -> Dict:
        """Convert to progress event dict."""
        return {
            "step": self.step,
            "total_steps": TOTAL_STEPS,
            "agent": self.agent,
            "title": self.title,
            "description": self.description,
            "status": status.value
        }


# Total number of steps in the pipeline
TOTAL_STEPS = 17

# All progress steps in order
PROGRESS_STEPS: List[ProgressStep] = [
    # Agent 1: Content Extraction (1 step)
    ProgressStep(
        step=1,
        agent="Agent 1",
        title="Content Extraction",
        description="Extracting key market insights from the document"
    ),

    # Agent 2: Idea Generation (1 step)
    ProgressStep(
        step=2,
        agent="Agent 2",
        title="Idea Generation",
        description="Generating viable business ideas from market data"
    ),

    # Agent 3: Dimensional Evaluation (11 steps, one per dimension)
    ProgressStep(
        step=3,
        agent="Agent 3",
        title="Market Potential",
        description="Evaluating market size, growth, and monetization capacity"
    ),
    ProgressStep(
        step=4,
        agent="Agent 3",
        title="Differentiated Approach",
        description="Assessing value proposition clarity and positioning"
    ),
    ProgressStep(
        step=5,
        agent="Agent 3",
        title="Competitive Advantage",
        description="Measuring long-term defensibility and sustainability"
    ),
    ProgressStep(
        step=6,
        agent="Agent 3",
        title="Differentiating Element",
        description="Identifying the core feature that makes the product stand out"
    ),
    ProgressStep(
        step=7,
        agent="Agent 3",
        title="Technical Feasibility",
        description="Assessing if the solution is technically achievable"
    ),
    ProgressStep(
        step=8,
        agent="Agent 3",
        title="Rapid Implementation",
        description="Evaluating time and cost to reach a usable MVP"
    ),
    ProgressStep(
        step=9,
        agent="Agent 3",
        title="AI Enablement",
        description="Evaluating how AI enhances the core product value"
    ),
    ProgressStep(
        step=10,
        agent="Agent 3",
        title="Barrier to Entry",
        description="Assessing difficulty for new entrants to compete"
    ),
    ProgressStep(
        step=11,
        agent="Agent 3",
        title="Scalability",
        description="Measuring if growth is non-linear and sustainable"
    ),
    ProgressStep(
        step=12,
        agent="Agent 3",
        title="Product Focus",
        description="Evaluating if offering is a repeatable product"
    ),
    ProgressStep(
        step=13,
        agent="Agent 3",
        title="Subscription Model",
        description="Assessing recurring revenue quality and predictability"
    ),

    # Agent 4: Synthesis (3 steps)
    ProgressStep(
        step=14,
        agent="Agent 4",
        title="Creating Summary",
        description="Synthesizing business idea overview from evaluations"
    ),
    ProgressStep(
        step=15,
        agent="Agent 4",
        title="Identifying Strengths",
        description="Analyzing top performing dimensions and strengths"
    ),
    ProgressStep(
        step=16,
        agent="Agent 4",
        title="Identifying Concerns",
        description="Analyzing potential risks and areas of concern"
    ),

    # Agent 5: Final Consolidation (1 step)
    ProgressStep(
        step=17,
        agent="Agent 5",
        title="Final Consolidation",
        description="Preparing final report and recommendations"
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
    """Helper class to report progress events."""

    def __init__(self, callback: Optional[Callable[[Dict], None]] = None):
        """
        Initialize progress reporter.

        Args:
            callback: Optional callback function to receive progress events
        """
        self.callback = callback
        self.current_step = 0

    def report(self, step_number: int, status: ProgressStatus = ProgressStatus.RUNNING):
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
            event = step.to_event(status)
            self.callback(event)

    def start_step(self, step_number: int):
        """Mark a step as starting (running)."""
        self.report(step_number, ProgressStatus.RUNNING)

    def complete_step(self, step_number: int):
        """Mark a step as completed."""
        self.report(step_number, ProgressStatus.COMPLETED)

    def error_step(self, step_number: int):
        """Mark a step as having an error."""
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
