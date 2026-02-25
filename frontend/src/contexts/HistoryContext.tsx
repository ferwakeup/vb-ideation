/**
 * History Context
 * Manages the history of analyzed documents with localStorage persistence
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { PDFScoringResult, DimensionScore, User } from '../types/index';

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
  addEntry: (result: PDFScoringResult, user?: User | null) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
  getEntry: (id: string) => HistoryEntry | undefined;
}

const HistoryContext = createContext<HistoryContextType | null>(null);

const STORAGE_KEY = 'vb-ideation-history';

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Failed to load history from localStorage:', error);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history to localStorage:', error);
    }
  }, [history]);

  const addEntry = useCallback((result: PDFScoringResult, user?: User | null) => {
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: result.timestamp,
      fileName: result.source,
      sector: result.sector,
      overallScore: result.overall_score,
      recommendation: result.recommendation,
      dimensionScores: result.dimension_scores,
      modelUsed: result.model_used,
      processingTime: result.processing_time_seconds,
      ideaSummary: result.idea_summary,
      keyStrengths: result.key_strengths,
      keyConcerns: result.key_concerns,
      user: user ? {
        fullName: user.full_name,
        email: user.email,
      } : undefined,
    };

    setHistory(prev => [entry, ...prev]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory(prev => prev.filter(entry => entry.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const getEntry = useCallback((id: string) => {
    return history.find(entry => entry.id === id);
  }, [history]);

  return (
    <HistoryContext.Provider value={{ history, addEntry, removeEntry, clearHistory, getEntry }}>
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
