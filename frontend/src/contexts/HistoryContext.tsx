/**
 * History Context
 * Manages the history of analyzed documents with database persistence
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import type { PDFScoringResult, DimensionScore, User, Analysis } from '../types/index';

export interface HistoryEntryUser {
  fullName: string;
  email: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  fileName: string;
  sector: string;
  overallScore: number;
  recommendation: string;
  dimensionScores: DimensionScore[];
  modelUsed: string;
  processingTime: number;
  ideaSummary: string;
  keyStrengths: string[];
  keyConcerns: string[];
  user?: HistoryEntryUser;
}

interface HistoryContextType {
  history: HistoryEntry[];
  isLoading: boolean;
  addEntry: (result: PDFScoringResult, user?: User | null) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
  getEntry: (id: string) => HistoryEntry | undefined;
  refreshHistory: () => Promise<void>;
}

const HistoryContext = createContext<HistoryContextType | null>(null);

// Convert API Analysis to HistoryEntry
function analysisToHistoryEntry(analysis: Analysis): HistoryEntry {
  return {
    id: String(analysis.id),
    timestamp: analysis.created_at,
    fileName: analysis.file_name,
    sector: analysis.sector,
    overallScore: analysis.overall_score,
    recommendation: analysis.recommendation,
    dimensionScores: analysis.dimension_scores,
    modelUsed: analysis.model_used,
    processingTime: analysis.processing_time_seconds || 0,
    ideaSummary: analysis.idea_summary,
    keyStrengths: analysis.key_strengths,
    keyConcerns: analysis.key_concerns,
    user: analysis.user_full_name ? {
      fullName: analysis.user_full_name,
      email: analysis.user_email || '',
    } : undefined,
  };
}

export function HistoryProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load history from API when authenticated
  const refreshHistory = useCallback(async () => {
    if (!token) {
      setHistory([]);
      return;
    }

    setIsLoading(true);
    try {
      const analyses = await api.getAnalyses(token);
      setHistory(analyses.map(analysisToHistoryEntry));
    } catch (error) {
      console.error('Failed to load history from API:', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Load history when auth changes
  useEffect(() => {
    if (isAuthenticated && token) {
      refreshHistory();
    } else {
      setHistory([]);
    }
  }, [isAuthenticated, token, refreshHistory]);

  const addEntry = useCallback(async (result: PDFScoringResult, _user?: User | null) => {
    if (!token) {
      console.warn('Cannot save analysis: not authenticated');
      return;
    }

    try {
      const analysis = await api.createAnalysis(token, {
        file_name: result.source,
        sector: result.sector,
        idea_summary: result.idea_summary,
        overall_score: result.overall_score,
        recommendation: result.recommendation,
        recommendation_rationale: result.recommendation_rationale,
        dimension_scores: result.dimension_scores,
        key_strengths: result.key_strengths,
        key_concerns: result.key_concerns,
        model_used: result.model_used,
        processing_time_seconds: result.processing_time_seconds,
      });

      // Add to local state
      const entry = analysisToHistoryEntry(analysis);
      setHistory(prev => [entry, ...prev]);
    } catch (error) {
      console.error('Failed to save analysis to API:', error);
    }
  }, [token]);

  const removeEntry = useCallback(async (id: string) => {
    if (!token) return;

    try {
      await api.deleteAnalysis(token, parseInt(id));
      setHistory(prev => prev.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Failed to delete analysis:', error);
    }
  }, [token]);

  const clearHistory = useCallback(async () => {
    if (!token) return;

    try {
      await api.clearAnalyses(token);
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }, [token]);

  const getEntry = useCallback((id: string) => {
    return history.find(entry => entry.id === id);
  }, [history]);

  return (
    <HistoryContext.Provider value={{ history, isLoading, addEntry, removeEntry, clearHistory, getEntry, refreshHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
}
