export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

export interface DimensionScore {
  dimension: string;
  score: number;
  reasoning: string;
  confidence: number;
  token_usage?: TokenUsage;
}

export interface IdeaScore {
  idea_summary: string;
  url_source: string;
  dimension_scores: DimensionScore[];
  overall_score: number;
  recommendation: string;
  key_strengths: string[];
  key_concerns: string[];
  timestamp: string;
  model_used: string;
  total_tokens: number;
  total_cost_usd: number;
}

export interface ScoringRequest {
  urls?: string[];
  url_source?: 'config';
  model?: string;
}

export interface URLsResponse {
  urls: string[];
}
