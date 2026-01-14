"""
Scoring dimensions and prompt templates for venture idea evaluation.
"""

# Define all 11 scoring dimensions with weights and criteria
SCORING_DIMENSIONS = {
    "market_potential": {
        "name": "Market Potential",
        "criteria": "Evaluate international market viability, addressable market size, growth trajectory, and geographic expansion opportunities. Consider both current market size and future growth potential.",
        "weight": 1.2
    },
    "differentiated_approach": {
        "name": "Differentiated Approach and Positioning",
        "criteria": "Assess the uniqueness of the approach compared to existing solutions. Evaluate how clearly differentiated the positioning is in the market and whether it addresses gaps that competitors miss.",
        "weight": 1.0
    },
    "competitive_advantage": {
        "name": "Sustainable Competitive Advantage",
        "criteria": "Evaluate whether the competitive advantage can be maintained for 2-3 years. Consider barriers to imitation, network effects, proprietary technology, brand strength, and switching costs.",
        "weight": 1.3
    },
    "differentiating_element": {
        "name": "Differentiating Element",
        "criteria": "Identify the core unique element that truly sets this idea apart. This should be a specific, tangible feature, approach, or capability that is difficult to replicate.",
        "weight": 1.1
    },
    "technical_feasibility": {
        "name": "Technical Feasibility",
        "criteria": "Assess the technical viability and implementation complexity. Consider whether the required technology exists, is mature enough, and can be implemented with available resources and expertise.",
        "weight": 1.0
    },
    "rapid_prototype": {
        "name": "Affordable & Rapid Prototype Validation",
        "criteria": "Can this idea be prototyped and validated in 4-6 weeks with reasonable cost? Evaluate the complexity of building an MVP, resource requirements, and ability to test core assumptions quickly.",
        "weight": 1.4
    },
    "ai_enablement": {
        "name": "AI Enablement for Venture Studio",
        "criteria": "Evaluate how AI and machine learning can be leveraged in building, scaling, and improving the product. Consider AI's role in automation, personalization, optimization, or creating defensible moats.",
        "weight": 1.2
    },
    "barrier_to_entry": {
        "name": "Barrier to Entry for Competitors",
        "criteria": "Assess the difficulty for competitors to replicate this idea. Consider technical complexity, required expertise, data advantages, regulatory hurdles, capital requirements, and time to market.",
        "weight": 1.1
    },
    "scalability": {
        "name": "Scalable Tech & Business Model",
        "criteria": "Evaluate the scalability of both the technology platform and business model. Can it grow revenue without proportional increases in costs? Consider infrastructure scalability, operational leverage, and unit economics.",
        "weight": 1.3
    },
    "product_focused": {
        "name": "Product-Focused Output",
        "criteria": "Determine if this is primarily a product business versus a service business. Products should be repeatable, standardized, and deliverable without linear increases in human resources.",
        "weight": 0.9
    },
    "subscription_model": {
        "name": "Subscription-Based Platform Access",
        "criteria": "Evaluate the potential for recurring revenue through subscription-based access. Consider the natural fit for subscriptions, customer retention potential, and predictable revenue streams.",
        "weight": 1.0
    }
}


def build_idea_summary_prompt(content: str) -> str:
    """Build prompt for extracting idea summary from content."""
    # Truncate content to fit context window (leave room for response)
    max_content_length = 6000
    truncated_content = content[:max_content_length] if len(content) > max_content_length else content

    return f"""Analyze the following content and extract the core business idea in 2-3 concise sentences.

Focus on:
1. What problem is being solved
2. Who is the target customer/market
3. What is the proposed solution/approach

Content:
{truncated_content}

Return your response in valid JSON format:
{{
    "summary": "The core business idea in 2-3 sentences"
}}
"""


def build_dimension_prompt(content: str, dimension_key: str) -> str:
    """Build prompt for scoring a specific dimension."""
    if dimension_key not in SCORING_DIMENSIONS:
        raise ValueError(f"Unknown dimension: {dimension_key}")

    dim = SCORING_DIMENSIONS[dimension_key]

    # Truncate content to fit context window
    max_content_length = 4000
    truncated_content = content[:max_content_length] if len(content) > max_content_length else content

    return f"""Analyze the following business idea content and provide a score for: **{dim['name']}**

**Evaluation Criteria:**
{dim['criteria']}

**Scoring Scale (0-10):**
- 0-3: Poor - Major concerns that likely make this non-viable
- 4-6: Average - Some concerns but potentially addressable
- 7-8: Good - Minor concerns, generally strong
- 9-10: Excellent - Outstanding with no significant concerns

**Business Idea Content:**
{truncated_content}

**Instructions:**
Provide an objective, data-driven assessment. Be specific in your reasoning and cite evidence from the content when possible.

Return your response in valid JSON format:
{{
    "score": <integer from 0-10>,
    "reasoning": "<2-4 sentences explaining your score with specific evidence>",
    "confidence": <float from 0-1 indicating how confident you are in this assessment>
}}
"""


def build_insights_prompt(dimension_scores: list) -> str:
    """Build prompt for extracting key insights from all dimension scores."""
    scores_text = "\n".join([
        f"- {score['dimension']}: {score['score']}/10 - {score['reasoning']}"
        for score in dimension_scores
    ])

    return f"""Based on the following dimension scores for a business idea, identify the key insights:

**Dimension Scores:**
{scores_text}

**Instructions:**
1. Identify the top 3 strengths that make this idea most compelling for a venture studio
2. Identify the top 3 concerns that could prevent success or require mitigation

Be specific and actionable. Focus on the most critical factors that would influence a go/no-go decision.

Return your response in valid JSON format:
{{
    "strengths": [
        "First key strength with specific detail",
        "Second key strength with specific detail",
        "Third key strength with specific detail"
    ],
    "concerns": [
        "First key concern with specific detail",
        "Second key concern with specific detail",
        "Third key concern with specific detail"
    ]
}}
"""


# System prompts for different analysis stages
SYSTEM_PROMPT_IDEA_EXTRACTION = """You are a business analyst expert at identifying and articulating core business ideas. You extract the essence of business concepts from various sources and present them clearly and concisely."""

SYSTEM_PROMPT_DIMENSION_SCORING = """You are a venture capital analyst with deep expertise in evaluating startup and business ideas. You provide objective, data-driven assessments based on established venture capital frameworks. You are thorough, analytical, and cite specific evidence when available."""

SYSTEM_PROMPT_INSIGHTS = """You are a strategic advisor who synthesizes complex analyses into actionable insights. You identify the most critical factors that influence investment decisions and present them clearly for executive decision-making."""
