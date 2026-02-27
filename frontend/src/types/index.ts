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

export interface ModelInfo {
  provider: string;
  model: string;
  deployment: 'local' | 'cloud';
}

export interface TimingInfo {
  step_elapsed_seconds: number;
  total_elapsed_seconds: number;
  step_start_time?: number;
  all_step_durations: Record<string, number>;
}

export interface ProgressEvent {
  step: number;
  total_steps: number;
  agent: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'skipped';
  inputs?: string[];
  outputs?: string[];
  model_info?: ModelInfo;
  timing?: TimingInfo;
}

export interface AgentDefinition {
  id: number;
  name: string;
  short_name: string;
  description: string;
  steps: number[];
  color: string;
  inputs: string[];
  outputs: string[];
  llm_calls: number;
  sub_agents?: string[];
}

export interface FlowConnection {
  from: string | number;
  to: string | number;
  data: string;
}

export interface AgentArchitecture {
  agents: AgentDefinition[];
  flow: FlowConnection[];
  total_llm_calls: number;
  pipeline_description: string;
}

export interface StepInfo {
  step: number;
  agent: string;
  title: string;
  description: string;
  inputs: string[];
  outputs: string[];
}

export interface InitEvent {
  architecture: AgentArchitecture;
  steps: StepInfo[];
  model_info: ModelInfo;
}

export interface PDFScoringRequest {
  file: File;
  sector: string;
  num_ideas?: number;
  idea_index?: number;
  provider?: string;
  model?: string;
  use_checkpoints?: boolean;
}

export interface ExtractionScoringRequest {
  extraction_id: number;
  sector: string;
  num_ideas?: number;
  idea_index?: number;
  provider?: string;
  model?: string;
}

export interface PDFScoringResult {
  idea_summary: string;
  source: string;
  sector: string;
  dimension_scores: DimensionScore[];
  overall_score: number;
  recommendation: string;
  recommendation_rationale: string;
  key_strengths: string[];
  key_concerns: string[];
  timestamp: string;
  model_used: string;
  processing_time_seconds: number;
  pdf_metadata?: Record<string, unknown>;
  generated_ideas_count: number;
  evaluated_idea_index: number;
}

// Authentication types
export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserStatusUpdate {
  is_active?: boolean;
  is_verified?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
  requires_verification: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  is_verified: boolean;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Extraction types
export interface ExtractionCreate {
  file_name: string;
  file_hash: string;
  extracted_text: string;
  model_used: string;
  token_count?: number;
  sector?: string;
}

export interface Extraction {
  id: number;
  user_id: number;
  file_name: string;
  file_hash: string;
  extracted_text: string;
  model_used: string;
  token_count?: number;
  sector?: string;
  created_at: string;
  user_full_name?: string;
  user_email?: string;
  // Compression stats
  original_size: number;
  compressed_size: number;
  compression_ratio: number;
  space_saved_percent: number;
}

export interface ExtractionListItem {
  id: number;
  user_id: number;
  file_name: string;
  file_hash: string;
  model_used: string;
  token_count?: number;
  sector?: string;
  created_at: string;
  user_full_name?: string;
  user_email?: string;
  text_preview?: string;
  // Compression stats
  original_size: number;
  compressed_size: number;
  space_saved_percent: number;
}

export interface ExtractionCheck {
  file_hash: string;
  model_used: string;
}

export interface ExtractionCheckResponse {
  exists: boolean;
  extraction_id?: number;
  file_name?: string;
  created_at?: string;
}

export interface ExtractionStats {
  total_extractions: number;
  total_original_bytes: number;
  total_compressed_bytes: number;
  total_original_mb: number;
  total_compressed_mb: number;
  overall_compression_ratio: number;
  overall_space_saved_percent: number;
  average_original_kb: number;
  average_compressed_kb: number;
}
