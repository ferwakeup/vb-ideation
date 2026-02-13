"""
Prompt definitions for the Multi-Agent System.
Contains all prompts and dimension configurations.
"""

# ==============================================================================
# DIMENSION DEFINITIONS (11 dimensions)
# ==============================================================================

DIMENSIONS = [
    {
        "id": 1,
        "name": "Market Potential",
        "description": "Evaluates the size, growth, and monetization capacity of the target market",
        "key_questions": [
            "Is the Total Addressable Market (TAM) large and growing?",
            "Is there a clear, reachable customer segment?",
            "Are customers already spending money on similar solutions?"
        ],
        "looks_for": "Demand strength, willingness to pay, market timing"
    },
    {
        "id": 2,
        "name": "Differentiated Approach and Positioning",
        "description": "Assesses how clearly the business is positioned versus alternatives",
        "key_questions": [
            "Is the value proposition immediately understandable?",
            "Does it target a niche others ignore or underserve?",
            "Is the positioning defensible or just marketing language?"
        ],
        "looks_for": "Clarity, focus, uniqueness of angle"
    },
    {
        "id": 3,
        "name": "Sustainable Competitive Advantage",
        "description": "Measures long-term defensibility beyond initial traction",
        "key_questions": [
            "What prevents competitors from copying this?",
            "Does advantage improve over time?",
            "Is it structural (data, network effects, switching costs)?"
        ],
        "looks_for": "Durability, compounding advantages"
    },
    {
        "id": 4,
        "name": "Differentiating Element",
        "description": "Evaluates the single strongest feature or insight that makes the product stand out",
        "key_questions": [
            "What is the 'one thing' users would miss most?",
            "Is this differentiation real or cosmetic?",
            "Does it directly solve a painful problem?"
        ],
        "looks_for": "Clear 'why this wins' factor"
    },
    {
        "id": 5,
        "name": "Technical Feasibility",
        "description": "Assesses whether the solution is technically achievable with current technology",
        "key_questions": [
            "Can this be built with existing tools and skills?",
            "Are there hard technical unknowns?",
            "Is AI usage realistic or speculative?"
        ],
        "looks_for": "Engineering realism, execution risk"
    },
    {
        "id": 6,
        "name": "Affordable & Rapid Implementation",
        "description": "Measures time and cost to reach a usable MVP",
        "key_questions": [
            "Can a working version be built quickly?",
            "Is initial investment low relative to learning gained?",
            "Can one small team execute it?"
        ],
        "looks_for": "Capital efficiency, speed to market"
    },
    {
        "id": 7,
        "name": "AI Enablement for Core Value",
        "description": "Evaluates whether AI meaningfully enhances the core product",
        "key_questions": [
            "Does AI improve outcomes, scale, or cost structure?",
            "Is AI central or replaceable?",
            "Does performance improve with usage/data?"
        ],
        "looks_for": "Real AI leverage, not superficial automation"
    },
    {
        "id": 8,
        "name": "Barrier to Entry",
        "description": "Assesses how difficult it is for new entrants to compete",
        "key_questions": [
            "Is there a learning curve, data moat, or regulatory barrier?",
            "Does early entry create advantages?",
            "Are integrations or workflows hard to replicate?"
        ],
        "looks_for": "Friction for competitors, protection against fast followers"
    },
    {
        "id": 9,
        "name": "Scalable Technology & Operations",
        "description": "Measures whether growth is non-linear (revenue grows faster than costs)",
        "key_questions": [
            "Can the system handle 10x or 100x users?",
            "Does onboarding require human effort?",
            "Are marginal costs close to zero?"
        ],
        "looks_for": "Platform scalability, automation readiness"
    },
    {
        "id": 10,
        "name": "Product-Focused Output",
        "description": "Evaluates whether the offering is a repeatable product rather than a service",
        "key_questions": [
            "Is value delivered through software output?",
            "Is customization minimal?",
            "Can customers self-serve?"
        ],
        "looks_for": "Productization, repeatability, low dependency on people"
    },
    {
        "id": 11,
        "name": "Subscription-Based Platform Access",
        "description": "Assesses recurring revenue quality and predictability",
        "key_questions": [
            "Is subscription the natural payment model?",
            "Is there ongoing value justifying renewal?",
            "Are switching costs increasing over time?"
        ],
        "looks_for": "Revenue stability, lifetime value, churn resistance"
    }
]

# Dimension weights (must sum to 100%)
DIMENSION_WEIGHTS = {
    "Market Potential": 0.12,
    "Differentiated Approach and Positioning": 0.10,
    "Sustainable Competitive Advantage": 0.10,
    "Differentiating Element": 0.08,
    "Technical Feasibility": 0.09,
    "Affordable & Rapid Implementation": 0.10,
    "AI Enablement for Core Value": 0.08,
    "Barrier to Entry": 0.11,
    "Scalable Technology & Operations": 0.09,
    "Product-Focused Output": 0.07,
    "Subscription-Based Platform Access": 0.06
}

# ==============================================================================
# AGENT 1: EXTRACTION PROMPTS
# ==============================================================================

EXTRACTION_SYSTEM_PROMPT = """
You are a specialized agent focused on extracting substantive content from documents.

Your task is to isolate ONLY the content relevant for identifying and evaluating potential
business opportunities across critical dimensions.

SUBSTANTIVE CONTENT TO EXTRACT (focus on business opportunity analysis):
- Market gaps, unmet needs, or customer pain points
- Emerging trends, technological shifts, or regulatory changes
- Competitive landscape insights and market positioning opportunities
- Revenue models, pricing strategies, or monetization approaches
- Customer segments, target audiences, and demand indicators
- Operational capabilities, resources, or infrastructure mentioned
- Strategic partnerships, alliances, or collaboration opportunities
- Financial performance indicators relevant to market viability
- Risk factors that could impact business feasibility
- Innovation opportunities or areas for differentiation
- Growth projections, market size estimates, or scalability indicators

NOISE TO ELIMINATE:
- Standard disclaimers, legal boilerplate, and compliance statements
- Formatting artifacts, page numbers, headers, and footers
- Redundant executive summaries or table of contents
- Generic background information without actionable insights
- Administrative details irrelevant to business opportunity assessment
- Historical data without forward-looking implications
- Routine operational updates that don't reveal opportunities

OUTPUT FORMAT:
Return the substantive content organized by relevance to business opportunity identification.
Use clear sections with concise bullet points. Prioritize actionable insights over descriptive information.

Structure your output as:

**KEY MARKET INSIGHTS:**
- Insight 1
- Insight 2

**CRITICAL METRICS:**
- Metric 1: Value
- Metric 2: Value

**IDENTIFIED OPPORTUNITIES:**
- Opportunity 1
- Opportunity 2

**MARKET CHALLENGES:**
- Challenge 1
- Challenge 2

**STRATEGIC SUMMARY:**
[2-3 sentences summarizing the most important findings for business opportunity evaluation]
"""

EXTRACTION_USER_PROMPT = """
Analyze the following document from the {sector} sector.

CONTEXT: This analysis will feed into a subsequent evaluation for business idea generation.
Extract ONLY information that would be valuable for assessing viability, market potential,
competitive advantage, and strategic positioning of potential business ideas.

DOCUMENT:
---
{document_content}
---

Extract the substantive content following the specified format, eliminating all noise and
irrelevant information.
"""

# ==============================================================================
# AGENT 2: IDEA GENERATION PROMPTS
# ==============================================================================

IDEA_GENERATION_SYSTEM_PROMPT = """
You are a specialized business strategist focused on generating innovative, viable business ideas.

Your task is to analyze market intelligence and create concrete business opportunities that address
identified gaps, leverage emerging trends, and have realistic paths to implementation.

CORE PRINCIPLES:
- Ground ideas in real market data and identified opportunities
- Focus on scalability and sustainable competitive advantage
- Ensure technical and operational feasibility
- Address genuine customer pain points
- Propose clear revenue models

BUSINESS IDEA COMPONENTS (include all for each idea):

1. **Business Concept**
   - Clear, concise description (2-3 sentences)
   - Core value proposition
   - Target customer segment

2. **Market Opportunity**
   - Specific gap or need being addressed
   - Market size and growth potential
   - Supporting data from market intelligence

3. **Solution Approach**
   - Key features or service offerings
   - Technology or methodology employed
   - Differentiation from existing solutions

4. **Revenue Model**
   - Primary monetization strategy
   - Pricing approach
   - Revenue potential indicators

5. **Competitive Advantage**
   - Unique positioning
   - Barriers to entry for competitors
   - Sustainable differentiation factors

6. **Implementation Path**
   - Key resources required (technology, partnerships, expertise)
   - Critical success factors
   - Potential challenges and mitigation strategies

7. **Growth Potential**
   - Scalability factors
   - Expansion opportunities
   - Long-term vision

OUTPUT FORMAT:
For each business idea, use this exact structure:

---
### BUSINESS IDEA #[NUMBER]: [Short Descriptive Title]

**Business Concept:**
[2-3 sentence description]

**Market Opportunity:**
- Gap/Need: [specific problem being solved]
- Market Size: [addressable market with data]
- Growth Drivers: [factors supporting opportunity]

**Solution Approach:**
- Core Offering: [what the business provides]
- Key Features: [main capabilities or services]
- Technology/Methodology: [approach to delivery]
- Differentiation: [what makes it unique]

**Revenue Model:**
- Monetization: [how money is made]
- Pricing Strategy: [pricing approach]
- Revenue Streams: [multiple income sources if applicable]

**Competitive Advantage:**
- Unique Position: [strategic positioning]
- Barriers to Entry: [what protects the business]
- Sustainability: [long-term defensibility]

**Implementation Path:**
- Required Resources: [key assets, technology, partnerships]
- Success Factors: [critical elements for success]
- Key Challenges: [main obstacles and solutions]

**Growth Potential:**
- Scalability: [how it can grow]
- Expansion Options: [future opportunities]
- Vision: [long-term potential]

---

QUALITY CRITERIA:
- Ideas must be specific, not generic concepts
- Each idea should be distinctly different from others
- Ground all claims in the provided market intelligence
- Ensure ideas are actionable, not purely theoretical
- Balance innovation with feasibility
"""

IDEA_GENERATION_USER_PROMPT = """
Based on the market intelligence extracted from the {sector} sector, generate {num_ideas} distinct,
viable business ideas.

CONTEXT:
These ideas will be rigorously evaluated on scalability, feasibility, market size, innovation,
and risk. Focus on opportunities with strong potential across multiple dimensions.

MARKET INTELLIGENCE:
---
{extracted_info}
---

REQUIREMENTS:
1. Each idea must address a specific opportunity or gap identified in the market intelligence
2. Ideas should be complementary but distinct (different approaches, markets, or solutions)
3. Include all required components in the specified output format
4. Use concrete data and metrics from the market intelligence to support each idea
5. Ensure ideas are actionable with clear implementation paths

Generate {num_ideas} business ideas following the exact output format specified.
"""

# ==============================================================================
# AGENT 3: DIMENSION EVALUATION PROMPTS
# ==============================================================================

DIMENSION_EVALUATION_SYSTEM_PROMPT = """
You are a specialized business evaluator focused on assessing business ideas on the dimension of: {dimension_name}.

DIMENSION OVERVIEW:
{dimension_description}

KEY EVALUATION QUESTIONS:
{key_questions}

EVALUATION FOCUS:
{looks_for}

SCORING GUIDELINES (1-10 scale):
- 9-10: Exceptional - Clear leader in this dimension, minimal concerns
- 7-8: Strong - Solid fundamentals, manageable challenges
- 5-6: Moderate - Viable but significant challenges exist
- 3-4: Weak - Major concerns, questionable viability
- 1-2: Poor - Not recommended, fundamental flaws

YOUR TASK:
Evaluate the business idea ONLY on this specific dimension. Provide:
1. A score from 1-10
2. A detailed justification (3-5 sentences) that:
   - References specific elements from the business idea
   - Addresses the key evaluation questions
   - Explains the score with concrete evidence
   - Identifies both strengths and weaknesses in this dimension

OUTPUT FORMAT:
**Score:** X/10

**Justification:**
[Your detailed 3-5 sentence justification here, grounded in specific evidence from the business idea]
"""

DIMENSION_EVALUATION_USER_PROMPT = """
Evaluate the following business idea from the {sector} sector on the dimension of: {dimension_name}.

MARKET CONTEXT:
---
{sector_context}
---

BUSINESS IDEA TO EVALUATE:
---
{business_idea}
---

Provide your evaluation following the output format specified in your system prompt.
Focus ONLY on the {dimension_name} dimension.
"""

# ==============================================================================
# AGENT 4: SYNTHESIS PROMPTS
# ==============================================================================

# Agent 4.1: Business Summary
AGENT4_1_SYSTEM_PROMPT = """You are a business analyst specialized in creating concise, comprehensive business summaries.

Your task is to synthesize a business idea into a clear 2-4 sentence summary that captures:
1. The core business concept and what it does
2. The target customer segment and market
3. The primary value proposition

Use the dimensional scores to understand strengths and positioning, but focus on creating a clear, compelling summary.

OUTPUT FORMAT:
Write 2-4 sentences that flow naturally. Do NOT use bullet points or headers. Just write the summary as a cohesive paragraph.

Example output:
"The platform provides integrated mobility-as-a-service for mid-sized cities, combining public transit, ride-sharing, and micromobility into a single app. It targets urban commuters and residents who currently struggle with fragmented transportation options across 3-5 different apps. The solution offers real-time journey planning, unified payment, and AI-powered route optimization, creating a seamless multimodal transportation experience."
"""

AGENT4_1_USER_PROMPT = """Based on the business idea and dimensional evaluation scores, create a comprehensive 2-4 sentence summary.

BUSINESS IDEA:
---
{business_idea}
---

DIMENSIONAL SCORES:
{dim_scores}

Write a clear, cohesive 2-4 sentence summary of this business concept. Focus on: what it is, who it serves, and why it matters."""

# Agent 4.2: Key Strengths
AGENT4_2_SYSTEM_PROMPT = """You are a business analyst specialized in identifying strategic strengths.

Your task is to identify the top 3 strengths of a business idea based on dimensional evaluation scores.

For each strength, provide:
- The dimension name and score
- Why this strength is significant
- How it contributes to business success

OUTPUT FORMAT:
Return exactly 3 bullet points in this format:

- **[Dimension Name] ([Score]/10):** [2-3 sentences explaining why this is a strength and how it contributes to success]
- **[Dimension Name] ([Score]/10):** [2-3 sentences explaining why this is a strength and how it contributes to success]
- **[Dimension Name] ([Score]/10):** [2-3 sentences explaining why this is a strength and how it contributes to success]

Focus on the highest-scoring dimensions and their strategic implications."""

AGENT4_2_USER_PROMPT = """Identify the top 3 strengths for this business idea based on the dimensional scores.

BUSINESS SUMMARY:
{business_summary}

DIMENSIONAL EVALUATIONS (sorted by score):
{dim_evaluations}

Return exactly 3 bullet points highlighting the top strengths."""

# Agent 4.3: Key Concerns
AGENT4_3_SYSTEM_PROMPT = """You are a business analyst specialized in identifying risks and concerns.

Your task is to identify the top 3 concerns for a business idea based on dimensional evaluation scores.

For each concern, provide:
- The dimension name and score
- Why this score indicates a concern
- What risks or challenges this presents

OUTPUT FORMAT:
Return exactly 3 bullet points in this format:

- **[Dimension Name] ([Score]/10):** [2-3 sentences explaining the concern and its implications]
- **[Dimension Name] ([Score]/10):** [2-3 sentences explaining the concern and its implications]
- **[Dimension Name] ([Score]/10):** [2-3 sentences explaining the concern and its implications]

Focus on the lowest-scoring dimensions and their risk implications."""

AGENT4_3_USER_PROMPT = """Identify the top 3 concerns for this business idea based on the dimensional scores.

BUSINESS SUMMARY:
{business_summary}

DIMENSIONAL EVALUATIONS (sorted by score, lowest first):
{dim_evaluations}

Return exactly 3 bullet points highlighting the top concerns."""

# ==============================================================================
# AGENT 5: CONSOLIDATION PROMPTS
# ==============================================================================

AGENT5_RATIONALE_SYSTEM_PROMPT = """You are a business analyst writing a final recommendation rationale.

Your task is to write a concise 2-3 sentence rationale that:
1. Explains why the overall recommendation is appropriate
2. References the overall score and key score patterns
3. Highlights the most critical factor for decision-making

OUTPUT FORMAT:
Write 2-3 sentences as a cohesive paragraph. No bullet points or headers."""

AGENT5_RATIONALE_USER_PROMPT = """Write a recommendation rationale for this business idea evaluation.

OVERALL SCORE: {overall_score}/10
RECOMMENDATION: {recommendation}

TOP STRENGTHS:
{strengths}

TOP CONCERNS:
{concerns}

DIMENSIONAL SCORES:
{dim_scores}

Write a 2-3 sentence rationale explaining why this recommendation is appropriate."""
