/**
 * Supabase Client Configuration
 * Initializes the Supabase client for authentication and database access
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database types for TypeScript (will be expanded as we add more tables)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          is_active: boolean;
          is_verified: boolean;
          is_admin: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          is_active?: boolean;
          is_verified?: boolean;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          is_active?: boolean;
          is_verified?: boolean;
          is_admin?: boolean;
          updated_at?: string | null;
        };
      };
      extractions: {
        Row: {
          id: number;
          user_id: string | null;
          file_name: string;
          file_hash: string;
          extracted_text: string;
          model_used: string;
          token_count: number | null;
          sector: string | null;
          created_at: string;
          original_size: number;
          compressed_size: number;
        };
        Insert: {
          id?: number;
          user_id?: string | null;
          file_name: string;
          file_hash: string;
          extracted_text: string;
          model_used: string;
          token_count?: number | null;
          sector?: string | null;
          created_at?: string;
          original_size: number;
          compressed_size: number;
        };
        Update: {
          user_id?: string | null;
          file_name?: string;
          file_hash?: string;
          extracted_text?: string;
          model_used?: string;
          token_count?: number | null;
          sector?: string | null;
          original_size?: number;
          compressed_size?: number;
        };
      };
      analyses: {
        Row: {
          id: number;
          user_id: string | null;
          file_name: string;
          sector: string;
          idea_summary: string;
          overall_score: number;
          recommendation: string;
          recommendation_rationale: string | null;
          dimension_scores: Record<string, unknown>[];
          key_strengths: string[];
          key_concerns: string[];
          model_used: string;
          processing_time_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string | null;
          file_name: string;
          sector: string;
          idea_summary: string;
          overall_score: number;
          recommendation: string;
          recommendation_rationale?: string | null;
          dimension_scores: Record<string, unknown>[];
          key_strengths: string[];
          key_concerns: string[];
          model_used: string;
          processing_time_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          file_name?: string;
          sector?: string;
          idea_summary?: string;
          overall_score?: number;
          recommendation?: string;
          recommendation_rationale?: string | null;
          dimension_scores?: Record<string, unknown>[];
          key_strengths?: string[];
          key_concerns?: string[];
          model_used?: string;
          processing_time_seconds?: number | null;
        };
      };
    };
  };
};
