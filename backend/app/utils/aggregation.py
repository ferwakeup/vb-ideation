"""
Score aggregation and recommendation logic.
"""
from typing import List
from app.models.score import DimensionScore
from app.utils.prompts import SCORING_DIMENSIONS


def calculate_weighted_score(dimension_scores: List[DimensionScore]) -> float:
    """
    Calculate weighted overall score based on dimension weights.

    Args:
        dimension_scores: List of DimensionScore objects

    Returns:
        Weighted average score (0-10), rounded to 2 decimal places
    """
    total_weight = 0
    weighted_sum = 0

    for dim_score in dimension_scores:
        # Find the dimension key from the name
        dim_key = _find_dimension_key(dim_score.dimension)

        if dim_key:
            weight = SCORING_DIMENSIONS[dim_key]['weight']
            weighted_sum += dim_score.score * weight
            total_weight += weight

    return round(weighted_sum / total_weight, 2) if total_weight > 0 else 0.0


def generate_recommendation(overall_score: float, dimension_scores: List[DimensionScore]) -> str:
    """
    Generate a recommendation based on overall score and critical dimension performance.

    Critical dimensions for venture studios:
    - Rapid Prototype Validation (must be doable in 4-6 weeks)
    - Technical Feasibility (must be technically viable)
    - Market Potential (must have significant market opportunity)
    - Scalability (must be able to scale)

    Args:
        overall_score: Weighted overall score
        dimension_scores: List of DimensionScore objects

    Returns:
        Recommendation string
    """
    # Define critical dimensions
    critical_dimension_names = [
        "Affordable & Rapid Prototype Validation",
        "Technical Feasibility",
        "Market Potential",
        "Scalable Tech & Business Model"
    ]

    # Calculate average of critical dimensions
    critical_scores = [
        ds.score for ds in dimension_scores
        if ds.dimension in critical_dimension_names
    ]

    avg_critical = sum(critical_scores) / len(critical_scores) if critical_scores else 0

    # Decision matrix
    if overall_score >= 7.5 and avg_critical >= 7:
        return "Strong Pursue"
    elif overall_score >= 6.0 and avg_critical >= 5:
        return "Consider with Modifications"
    elif overall_score >= 4.5:
        return "Further Research Needed"
    else:
        return "Pass"


def _find_dimension_key(dimension_name: str) -> str:
    """
    Find the dimension key from the dimension name.

    Args:
        dimension_name: The human-readable dimension name

    Returns:
        The dimension key, or None if not found
    """
    for key, value in SCORING_DIMENSIONS.items():
        if value['name'] == dimension_name:
            return key
    return None
