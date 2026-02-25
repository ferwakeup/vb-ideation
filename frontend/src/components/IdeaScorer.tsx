/**
 * Main component for scoring business ideas
 */
import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import ScoreCard from './ScoreCard';
import ScoreChart from './ScoreChart';
import LoadingSpinner from './LoadingSpinner';
import ProgressTracker from './ProgressTracker';
import DebugPanel from './DebugPanel';
import Extractions from './Extractions';
import { useHistory } from '../contexts/HistoryContext';
import { useAuth } from '../contexts/AuthContext';
import type {
  ProgressEvent,
  PDFScoringResult,
  AgentArchitecture,
  StepInfo,
  ModelInfo
} from '../types/index';

const MODEL_OPTIONS = [
  // OpenAI Models
  { value: 'gpt-4o', label: '🤖 GPT-4o (OpenAI)', provider: 'OpenAI', description: 'Best quality, moderate cost (~$0.10-0.20)' },
  { value: 'gpt-4o-mini', label: '🤖 GPT-4o Mini (OpenAI)', provider: 'OpenAI', description: 'Fast & cheap (~$0.01-0.02)' },
  { value: 'gpt-4-turbo', label: '🤖 GPT-4 Turbo (OpenAI)', provider: 'OpenAI', description: 'High quality (~$0.30-0.50)' },
  { value: 'gpt-4', label: '🤖 GPT-4 (OpenAI)', provider: 'OpenAI', description: 'Highest quality (~$0.60-1.00)' },
  // Google Gemini Models
  { value: 'gemini-2.5-pro', label: '✨ Gemini 2.5 Pro (Google)', provider: 'Google', description: 'Excellent quality (~$0.05-0.15)' },
  { value: 'gemini-2.5-flash', label: '✨ Gemini 2.5 Flash (Google)', provider: 'Google', description: 'Very fast & cheap (~$0.005-0.01)' },
  { value: 'gemini-flash-latest', label: '✨ Gemini Flash Latest (Google)', provider: 'Google', description: 'Latest flash model (~$0.005-0.01)' },
  { value: 'gemini-pro-latest', label: '✨ Gemini Pro Latest (Google)', provider: 'Google', description: 'Latest pro model (~$0.05-0.15)' },
];

const PDF_PROVIDER_OPTIONS = [
  { value: 'anthropic', label: 'Anthropic Claude', model: 'claude-sonnet-4-20250514' },
  { value: 'openai', label: 'OpenAI GPT-4', model: 'gpt-4o' },
  { value: 'groq', label: 'Groq (Free, Fast)', model: 'llama-3.3-70b-versatile' },
];

const SECTOR_OPTIONS = [
  'mobility',
  'healthcare',
  'fintech',
  'edtech',
  'sustainability',
  'retail',
  'enterprise',
  'consumer',
  'other'
];

export default function IdeaScorer() {
  // History context
  const { addEntry } = useHistory();
  const { user, token } = useAuth();

  // Mode toggle: 'url' or 'pdf' - URL mode hidden but code preserved
  const [scoringMode] = useState<'url' | 'pdf'>('pdf');

  // URL mode state
  const [useConfig, setUseConfig] = useState(true);
  const [customUrls, setCustomUrls] = useState<string[]>(['']);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // PDF mode state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sector, setSector] = useState('mobility');
  const [pdfProvider] = useState('groq');
  const [isPdfScoring, setIsPdfScoring] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<ProgressEvent | null>(null);
  const [pdfResult, setPdfResult] = useState<PDFScoringResult | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const abortRef = useRef<{ abort: () => void } | null>(null);

  // Extraction selection state
  const [showExtractionSelector, setShowExtractionSelector] = useState(false);
  const [selectedExtraction, setSelectedExtraction] = useState<{ id: number; fileName: string } | null>(null);

  // Debug panel state
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [debugArchitecture, setDebugArchitecture] = useState<AgentArchitecture | null>(null);
  const [debugSteps, setDebugSteps] = useState<StepInfo[]>([]);
  const [debugModelInfo, setDebugModelInfo] = useState<ModelInfo | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, { duration: number; status: string }>>({});

  const scoreMutation = useMutation({
    mutationFn: api.scoreIdea,
  });

  // Handle PDF file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setPdfError(null);
    } else if (file) {
      setPdfError('Please select a valid PDF file');
    }
  }, []);

  // Handle extraction selection
  const handleSelectExtraction = useCallback(async (extractionId: number) => {
    if (!token) return;
    try {
      const extraction = await api.getExtraction(token, extractionId);
      setSelectedExtraction({ id: extraction.id, fileName: extraction.file_name });
      setSector(extraction.sector || 'mobility');
      setShowExtractionSelector(false);
      setPdfFile(null); // Clear any selected file
    } catch (err) {
      console.error('Failed to load extraction:', err);
      setPdfError('Failed to load extraction');
    }
  }, [token]);

  // Handle PDF scoring with progress
  const handlePdfScore = useCallback(() => {
    if (!pdfFile) {
      setPdfError('Please select a PDF file');
      return;
    }

    setIsPdfScoring(true);
    setPdfProgress(null);
    setPdfResult(null);
    setPdfError(null);
    setCompletedSteps({});

    const provider = PDF_PROVIDER_OPTIONS.find(p => p.value === pdfProvider);

    abortRef.current = api.scorePDFWithProgress(
      {
        file: pdfFile,
        sector,
        provider: pdfProvider,
        model: provider?.model,
        num_ideas: 3,
        idea_index: 0,
        use_checkpoints: true,
      },
      (progress) => {
        setPdfProgress(progress);
        // Track completed steps with timing
        if (progress.status === 'completed' && progress.timing) {
          setCompletedSteps(prev => ({
            ...prev,
            [progress.step]: {
              duration: progress.timing?.step_elapsed_seconds || 0,
              status: progress.status
            }
          }));
        }
      },
      (result) => {
        setPdfResult(result);
        setIsPdfScoring(false);
        setPdfProgress(null);
        // Save to history with user info
        addEntry(result, user);
      },
      (error) => {
        setPdfError(error);
        setIsPdfScoring(false);
        setPdfProgress(null);
      },
      (init) => {
        // Handle init event with architecture data
        setDebugArchitecture(init.architecture);
        setDebugSteps(init.steps);
        setDebugModelInfo(init.model_info);
      }
    );
  }, [pdfFile, sector, pdfProvider, addEntry, user]);

  // Handle extraction scoring with progress
  const handleExtractionScore = useCallback(() => {
    if (!selectedExtraction) {
      setPdfError('Please select an extraction');
      return;
    }

    setIsPdfScoring(true);
    setPdfProgress(null);
    setPdfResult(null);
    setPdfError(null);
    setCompletedSteps({});

    const provider = PDF_PROVIDER_OPTIONS.find(p => p.value === pdfProvider);

    abortRef.current = api.scoreExtractionWithProgress(
      {
        extraction_id: selectedExtraction.id,
        sector,
        provider: pdfProvider,
        model: provider?.model,
        num_ideas: 3,
        idea_index: 0,
      },
      (progress) => {
        setPdfProgress(progress);
        // Track completed steps with timing
        if (progress.status === 'completed' && progress.timing) {
          setCompletedSteps(prev => ({
            ...prev,
            [progress.step]: {
              duration: progress.timing?.step_elapsed_seconds || 0,
              status: progress.status
            }
          }));
        }
      },
      (result) => {
        setPdfResult(result);
        setIsPdfScoring(false);
        setPdfProgress(null);
        // Save to history with user info
        addEntry(result, user);
      },
      (error) => {
        setPdfError(error);
        setIsPdfScoring(false);
        setPdfProgress(null);
      },
      (init) => {
        // Handle init event with architecture data
        setDebugArchitecture(init.architecture);
        setDebugSteps(init.steps);
        setDebugModelInfo(init.model_info);
      }
    );
  }, [selectedExtraction, sector, pdfProvider, addEntry, user]);

  // Cancel PDF scoring
  const handleCancelPdfScore = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsPdfScoring(false);
    setPdfProgress(null);
  }, []);

  const handleScore = () => {
    if (useConfig) {
      scoreMutation.mutate({ url_source: 'config', model: selectedModel });
    } else {
      const validUrls = customUrls.filter(u => u.trim());
      if (validUrls.length === 0) {
        alert('Please enter at least one URL');
        return;
      }
      scoreMutation.mutate({ urls: validUrls, model: selectedModel });
    }
  };

  const addUrlField = () => {
    setCustomUrls([...customUrls, '']);
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...customUrls];
    newUrls[index] = value;
    setCustomUrls(newUrls);
  };

  const removeUrl = (index: number) => {
    if (customUrls.length > 1) {
      setCustomUrls(customUrls.filter((_, i) => i !== index));
    }
  };

  const getRecommendationStyle = (recommendation: string): string => {
    if (recommendation.includes('Strong')) {
      return 'bg-green-100 text-green-800 border-green-300';
    } else if (recommendation.includes('Consider')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else if (recommendation.includes('Research')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else {
      return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  // Info tooltip component
  const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-block ml-1">
      <svg className="w-4 h-4 text-gray-400 hover:text-blue-500 cursor-help" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <div className="invisible group-hover:visible absolute z-50 w-64 p-2 mt-1 text-xs text-white bg-gray-800 rounded-lg shadow-lg -left-28 top-5">
        {text}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
            Venture Builder Idea Scorer
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            AI-powered analysis across 11 critical dimensions
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-8">
          {/* PDF Mode - Always active, URL mode hidden but code preserved */}
          {/* Source Selection Toggle */}
          <div className="mb-4 sm:mb-6">
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              Document Source
              <InfoTooltip text="Choose to upload a new PDF document or select from previously extracted documents to save processing time." />
            </label>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowExtractionSelector(false);
                  setSelectedExtraction(null);
                }}
                className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg text-sm font-medium transition-colors border ${
                  !showExtractionSelector && !selectedExtraction
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="hidden xs:inline">Upload New PDF</span>
                  <span className="xs:hidden">New PDF</span>
                </div>
              </button>
              <button
                onClick={() => setShowExtractionSelector(true)}
                className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg text-sm font-medium transition-colors border ${
                  showExtractionSelector || selectedExtraction
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden xs:inline">Use Previous Extraction</span>
                  <span className="xs:hidden">Previous</span>
                </div>
              </button>
            </div>
          </div>

              {/* Extraction Selector */}
              {showExtractionSelector && !selectedExtraction && (
                <div className="mb-4 sm:mb-6 border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-3">Select a Previously Extracted Document</h3>
                  <div className="bg-white rounded-lg border border-gray-200 max-h-48 sm:max-h-64 overflow-auto">
                    <Extractions
                      onSelectExtraction={handleSelectExtraction}
                      selectionMode={true}
                    />
                  </div>
                </div>
              )}

              {/* Selected Extraction Display */}
              {selectedExtraction && (
                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Document
                  </label>
                  <div className="flex items-center justify-between border-2 border-green-300 bg-green-50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="min-w-0">
                        <span className="text-gray-700 font-medium text-sm sm:text-base truncate block">{selectedExtraction.fileName}</span>
                        <p className="text-xs text-green-600">Skipping extraction step</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedExtraction(null);
                        setShowExtractionSelector(true);
                      }}
                      className="text-gray-500 hover:text-gray-700 p-1 flex-shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* File Upload - only show when not using extraction */}
              {!showExtractionSelector && !selectedExtraction && (
                <div className="mb-4 sm:mb-6">
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    Upload PDF Document
                    <InfoTooltip text="Upload a PDF document containing business idea information. The AI will extract text and analyze it." />
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      {pdfFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-gray-700 font-medium text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">{pdfFile.name}</span>
                        </div>
                      ) : (
                        <div>
                          <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-gray-600 text-sm sm:text-base">Tap to upload PDF</span>
                          <p className="text-xs text-gray-400 mt-1">PDF files only</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Sector Selection */}
              <div className="mb-4 sm:mb-6">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Business Sector
                  <InfoTooltip text="Select the industry sector that best matches the business idea. This helps the AI provide more relevant analysis." />
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 sm:px-4 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {SECTOR_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Provider Info */}
              <div className="mb-4 sm:mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium text-blue-800">
                    Powered by Groq (Llama 3.3 70B) - Fast & Free
                  </span>
                </div>
              </div>

              <button
                onClick={selectedExtraction ? handleExtractionScore : handlePdfScore}
                disabled={isPdfScoring || (!pdfFile && !selectedExtraction)}
                className="w-full bg-blue-600 text-white font-semibold px-4 sm:px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                {isPdfScoring ? 'Analyzing...' : selectedExtraction ? 'Analyze (Skip Extraction)' : 'Analyze PDF'}
              </button>

              {pdfError && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800 text-sm">
                    Error: {pdfError}
                  </p>
                </div>
              )}

          {/* URL Mode - Hidden but code preserved for future use */}
          {scoringMode === 'url' && (
            <>
              {/* Model Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model Selection
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Selected: <span className="font-semibold">{MODEL_OPTIONS.find(m => m.value === selectedModel)?.label}</span>
                </p>
              </div>

              <div className="mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useConfig}
                    onChange={(e) => setUseConfig(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700">
                    Use URLs from backend config file
                  </span>
                </label>
              </div>

              {!useConfig && (
                <div className="space-y-3 mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Enter URLs to analyze:
                  </label>
                  {customUrls.map((url, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateUrl(idx, e.target.value)}
                        className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://example.com/business-idea"
                      />
                      {customUrls.length > 1 && (
                        <button
                          onClick={() => removeUrl(idx)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addUrlField}
                    className="text-blue-600 text-sm font-medium hover:text-blue-700"
                  >
                    + Add another URL
                  </button>
                </div>
              )}

              <button
                onClick={handleScore}
                disabled={scoreMutation.isPending}
                className="w-full bg-blue-600 text-white font-semibold px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {scoreMutation.isPending ? 'Analyzing...' : 'Score Business Idea'}
              </button>

              {scoreMutation.isError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800">
                    Error: {(scoreMutation.error as Error).message || 'Failed to score idea'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Loading State - URL Mode */}
        {scoreMutation.isPending && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <LoadingSpinner />
            <p className="text-center text-gray-600 mt-4">
              Analyzing business idea across 11 dimensions... This may take 30-60 seconds.
            </p>
          </div>
        )}

        {/* Loading State - PDF Mode with Progress */}
        {isPdfScoring && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <ProgressTracker progress={pdfProgress} />
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={handleCancelPdfScore}
                className="text-gray-500 hover:text-red-600 text-sm font-medium transition-colors"
              >
                Cancel Analysis
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setIsDebugOpen(true)}
                className="flex items-center gap-1 text-gray-500 hover:text-blue-600 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Debug Panel
              </button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {scoreMutation.data && (
          <div className="space-y-8">
            {/* Idea Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Business Idea Summary
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {scoreMutation.data.idea_summary}
              </p>
            </div>

            {/* Overall Score Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4 md:mb-0">
                  Overall Score
                </h2>
                <div className="text-5xl font-bold text-blue-600">
                  {scoreMutation.data.overall_score.toFixed(1)}/10
                </div>
              </div>
              <div
                className={`text-lg font-semibold p-4 rounded-md border-2 text-center mb-4 ${getRecommendationStyle(
                  scoreMutation.data.recommendation
                )}`}
              >
                {scoreMutation.data.recommendation}
              </div>

              {/* Cost Summary */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="mb-2 text-center">
                  <span className="text-xs text-gray-600">Analyzed using: </span>
                  <span className="text-sm font-bold text-blue-800">
                    {scoreMutation.data.model_used.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Total Tokens Used</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {scoreMutation.data.total_tokens.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">API Calls Made</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {scoreMutation.data.dimension_scores.length}
                    </div>
                    <div className="text-xs text-gray-500">(dimension scores)</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Total Cost</div>
                    <div className="text-3xl font-bold text-green-700">
                      ${scoreMutation.data.total_cost_usd.toFixed(4)}
                    </div>
                    <div className="text-xs text-gray-500">USD</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Visualization */}
            <ScoreChart scores={scoreMutation.data.dimension_scores} />

            {/* Key Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 rounded-lg shadow-md p-6 border-2 border-green-200">
                <h3 className="text-lg font-semibold mb-4 text-green-800 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Key Strengths
                </h3>
                <ul className="space-y-2">
                  {scoreMutation.data.key_strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <span className="text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-red-50 rounded-lg shadow-md p-6 border-2 border-red-200">
                <h3 className="text-lg font-semibold mb-4 text-red-800 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Key Concerns
                </h3>
                <ul className="space-y-2">
                  {scoreMutation.data.key_concerns.map((concern, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-red-600 mr-2">•</span>
                      <span className="text-gray-700">{concern}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Individual Dimension Scores */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Detailed Dimension Scores
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scoreMutation.data.dimension_scores.map((dim, idx) => (
                  <ScoreCard key={idx} score={dim} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PDF Results Section */}
        {pdfResult && (
          <div className="space-y-8">
            {/* Idea Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Business Idea Summary
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {pdfResult.idea_summary}
              </p>
            </div>

            {/* Overall Score Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4 md:mb-0">
                  Overall Score
                </h2>
                <div className="text-5xl font-bold text-blue-600">
                  {pdfResult.overall_score.toFixed(1)}/10
                </div>
              </div>
              <div
                className={`text-lg font-semibold p-4 rounded-md border-2 text-center mb-4 ${getRecommendationStyle(
                  pdfResult.recommendation
                )}`}
              >
                {pdfResult.recommendation}
              </div>

              {/* Processing Info */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="mb-2 text-center">
                  <span className="text-xs text-gray-600">Analyzed using: </span>
                  <span className="text-sm font-bold text-blue-800">
                    {pdfResult.model_used.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Source</div>
                    <div className="text-lg font-bold text-blue-700 truncate">
                      {pdfResult.source}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Sector</div>
                    <div className="text-lg font-bold text-blue-700 capitalize">
                      {pdfResult.sector}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Processing Time</div>
                    <div className="text-lg font-bold text-green-700">
                      {pdfResult.processing_time_seconds.toFixed(1)}s
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Visualization */}
            <ScoreChart scores={pdfResult.dimension_scores} />

            {/* Key Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 rounded-lg shadow-md p-6 border-2 border-green-200">
                <h3 className="text-lg font-semibold mb-4 text-green-800 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Key Strengths
                </h3>
                <ul className="space-y-2">
                  {pdfResult.key_strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <span className="text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-red-50 rounded-lg shadow-md p-6 border-2 border-red-200">
                <h3 className="text-lg font-semibold mb-4 text-red-800 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Key Concerns
                </h3>
                <ul className="space-y-2">
                  {pdfResult.key_concerns.map((concern, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-red-600 mr-2">•</span>
                      <span className="text-gray-700">{concern}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Individual Dimension Scores */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Detailed Dimension Scores
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pdfResult.dimension_scores.map((dim, idx) => (
                  <ScoreCard key={idx} score={dim} />
                ))}
              </div>
            </div>

            {/* New Analysis Button */}
            <div className="text-center flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  setPdfResult(null);
                  setPdfFile(null);
                  setSelectedExtraction(null);
                  setShowExtractionSelector(false);
                  setCompletedSteps({});
                }}
                className="bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-md hover:bg-gray-200 transition-colors"
              >
                Start New Analysis
              </button>
              <button
                onClick={() => setIsDebugOpen(true)}
                className="flex items-center gap-2 bg-blue-50 text-blue-700 font-semibold px-6 py-3 rounded-md hover:bg-blue-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                View Analysis Details
              </button>
            </div>
          </div>
        )}

        {/* Debug Panel */}
        <DebugPanel
          isOpen={isDebugOpen}
          onClose={() => setIsDebugOpen(false)}
          architecture={debugArchitecture}
          steps={debugSteps}
          modelInfo={debugModelInfo}
          currentProgress={pdfProgress}
          completedSteps={completedSteps}
        />
      </div>
    </div>
  );
}
