/**
 * TypeScript type definitions for the VB Idea Scorer
 */

export interface DimensionScore {
  dimension: string;
  score: number;
  reasoning: string;
  confidence: number;
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
}

export interface ScoringRequest {
  urls?: string[];
  url_source?: 'config';
}

export interface URLsResponse {
  urls: string[];
}
