/**
 * Analysis Context
 * Global state management for PDF/extraction analysis
 * Persists across navigation so users can view progress from any page
 */
import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';
import { api } from '../services/api';
import { useHistory } from './HistoryContext';
import { useAuth } from './AuthContext';
import { useDebug, type DebugMessage } from './DebugContext';
import type {
  ProgressEvent,
  PDFScoringResult,
  AgentArchitecture,
  StepInfo,
  ModelInfo,
  InitEvent
} from '../types/index';


interface AnalysisState {
  // Core analysis state
  isAnalyzing: boolean;
  progress: ProgressEvent | null;
  result: PDFScoringResult | null;
  error: string | null;
  completedSteps: Record<number, { duration: number; status: string }>;

  // Debug data
  architecture: AgentArchitecture | null;
  steps: StepInfo[];
  modelInfo: ModelInfo | null;

  // Analysis metadata
  analysisMetadata: {
    fileName: string;
    sector: string;
    provider: string;
    model: string;
    isExtraction: boolean;
    extractionId?: number;
  } | null;
}

interface AnalysisContextType extends AnalysisState {
  // Actions
  startPdfAnalysis: (file: File, sector: string, provider: string, model: string) => void;
  startExtractionAnalysis: (extractionId: number, fileName: string, sector: string, provider: string, model: string) => void;
  cancelAnalysis: () => void;
  clearResults: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { addEntry } = useHistory();
  const { user, token } = useAuth();
  const { addMessage: addDebugMessage, isDebugMode } = useDebug();

  // Core state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [result, setResult] = useState<PDFScoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, { duration: number; status: string }>>({});

  // Debug data
  const [architecture, setArchitecture] = useState<AgentArchitecture | null>(null);
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  // Analysis metadata
  const [analysisMetadata, setAnalysisMetadata] = useState<AnalysisState['analysisMetadata']>(null);

  // Abort controller reference
  const abortRef = useRef<{ abort: () => void } | null>(null);

  // Handle init event
  const handleInit = useCallback((init: InitEvent) => {
    setArchitecture(init.architecture);
    setSteps(init.steps);
    setModelInfo(init.model_info);
  }, []);

  // Handle progress event
  const handleProgress = useCallback((progressEvent: ProgressEvent) => {
    setProgress(progressEvent);
    // Track completed steps with timing
    if (progressEvent.status === 'completed' && progressEvent.timing) {
      setCompletedSteps(prev => ({
        ...prev,
        [progressEvent.step]: {
          duration: progressEvent.timing?.step_elapsed_seconds || 0,
          status: progressEvent.status
        }
      }));
    }
  }, []);

  // Handle result
  const handleResult = useCallback((analysisResult: PDFScoringResult) => {
    setResult(analysisResult);
    setIsAnalyzing(false);
    setProgress(null);
    // Save to history with user info
    addEntry(analysisResult, user);
  }, [addEntry, user]);

  // Handle error
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsAnalyzing(false);
    setProgress(null);
  }, []);

  // Handle debug events from backend
  const handleDebug = useCallback((event: { level: string; category: string; message: string; details?: Record<string, unknown>; source: string }) => {
    if (isDebugMode) {
      addDebugMessage({
        level: event.level as DebugMessage['level'],
        category: event.category as DebugMessage['category'],
        message: event.message,
        details: event.details,
        source: event.source as DebugMessage['source'],
      });
    }
  }, [isDebugMode, addDebugMessage]);

  // Start PDF analysis
  const startPdfAnalysis = useCallback((file: File, sector: string, provider: string, model: string) => {
    // Reset state
    setIsAnalyzing(true);
    setProgress(null);
    setResult(null);
    setError(null);
    setCompletedSteps({});
    setArchitecture(null);
    setSteps([]);
    setModelInfo(null);

    setAnalysisMetadata({
      fileName: file.name,
      sector,
      provider,
      model,
      isExtraction: false,
    });

    abortRef.current = api.scorePDFWithProgress(
      {
        file,
        sector,
        provider,
        model,
        num_ideas: 3,
        idea_index: 0,
        use_checkpoints: true,
      },
      handleProgress,
      handleResult,
      handleError,
      handleInit,
      handleDebug,
      token || undefined
    );
  }, [handleProgress, handleResult, handleError, handleInit, handleDebug, token]);

  // Start extraction analysis
  const startExtractionAnalysis = useCallback((
    extractionId: number,
    fileName: string,
    sector: string,
    provider: string,
    model: string
  ) => {
    // Reset state
    setIsAnalyzing(true);
    setProgress(null);
    setResult(null);
    setError(null);
    setCompletedSteps({});
    setArchitecture(null);
    setSteps([]);
    setModelInfo(null);

    setAnalysisMetadata({
      fileName,
      sector,
      provider,
      model,
      isExtraction: true,
      extractionId,
    });

    abortRef.current = api.scoreExtractionWithProgress(
      {
        extraction_id: extractionId,
        sector,
        provider,
        model,
        num_ideas: 3,
        idea_index: 0,
      },
      handleProgress,
      handleResult,
      handleError,
      handleInit,
      handleDebug,
      token || undefined
    );
  }, [handleProgress, handleResult, handleError, handleInit, handleDebug, token]);

  // Cancel analysis
  const cancelAnalysis = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsAnalyzing(false);
    setProgress(null);
  }, []);

  // Clear results (for starting new analysis)
  const clearResults = useCallback(() => {
    setResult(null);
    setError(null);
    setCompletedSteps({});
    setArchitecture(null);
    setSteps([]);
    setModelInfo(null);
    setAnalysisMetadata(null);
  }, []);

  const value: AnalysisContextType = {
    // State
    isAnalyzing,
    progress,
    result,
    error,
    completedSteps,
    architecture,
    steps,
    modelInfo,
    analysisMetadata,
    // Actions
    startPdfAnalysis,
    startExtractionAnalysis,
    cancelAnalysis,
    clearResults,
  };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}
