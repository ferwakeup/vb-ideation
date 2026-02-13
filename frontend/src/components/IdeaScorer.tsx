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
import { useHistory } from '../contexts/HistoryContext';
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

  // Mode toggle: 'url' or 'pdf'
  const [scoringMode, setScoringMode] = useState<'url' | 'pdf'>('pdf');

  // URL mode state
  const [useConfig, setUseConfig] = useState(true);
  const [customUrls, setCustomUrls] = useState<string[]>(['']);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // PDF mode state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sector, setSector] = useState('mobility');
  const [pdfProvider, setPdfProvider] = useState('anthropic');
  const [isPdfScoring, setIsPdfScoring] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<ProgressEvent | null>(null);
  const [pdfResult, setPdfResult] = useState<PDFScoringResult | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const abortRef = useRef<{ abort: () => void } | null>(null);

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
        // Save to history
        addEntry(result);
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
  }, [pdfFile, sector, pdfProvider, addEntry]);

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

  return (
    <div className="min-h-full bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Venture Builder Idea Scorer
          </h1>
          <p className="text-gray-600">
            AI-powered analysis of business ideas across 11 critical dimensions
          </p>
        </div>

        {/* Legend / Scoring Guide */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Decision Matrix Legend
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Recommendation Categories */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Overall Recommendation</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">Strong Pursue:</span> Overall ≥7.5/10
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">Consider:</span> Overall ≥6.0/10
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">Further Research:</span> Overall ≥4.5/10
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">Pass:</span> Overall &lt;4.5/10
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Dimension Score Ranges */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Dimension Score Ranges</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="w-12 text-sm font-semibold text-green-700">9-10</span>
                  <span className="text-sm text-gray-700">Excellent - No significant concerns</span>
                </div>
                <div className="flex items-center">
                  <span className="w-12 text-sm font-semibold text-blue-700">7-8</span>
                  <span className="text-sm text-gray-700">Good - Minor concerns</span>
                </div>
                <div className="flex items-center">
                  <span className="w-12 text-sm font-semibold text-yellow-700">4-6</span>
                  <span className="text-sm text-gray-700">Average - Some concerns</span>
                </div>
                <div className="flex items-center">
                  <span className="w-12 text-sm font-semibold text-red-700">0-3</span>
                  <span className="text-sm text-gray-700">Poor - Major concerns</span>
                </div>
              </div>
            </div>
          </div>

          {/* Critical Dimensions Note */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              <span className="font-semibold">Note:</span> Critical dimensions (Rapid Prototype Validation, Scalability, and Sustainable Competitive Advantage) have higher weights in the overall score calculation.
            </p>
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Input Configuration
          </h2>

          {/* Mode Toggle */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setScoringMode('pdf')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                scoringMode === 'pdf'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              PDF Upload (Multi-Agent)
            </button>
            <button
              onClick={() => setScoringMode('url')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                scoringMode === 'url'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              URL Analysis
            </button>
          </div>

          {/* PDF Mode */}
          {scoringMode === 'pdf' && (
            <>
              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload PDF Document
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
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
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-700 font-medium">{pdfFile.name}</span>
                      </div>
                    ) : (
                      <div>
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-gray-600">Click to upload or drag and drop</span>
                        <p className="text-xs text-gray-400 mt-1">PDF files only</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Sector Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Sector
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {SECTOR_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Provider Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Provider
                </label>
                <select
                  value={pdfProvider}
                  onChange={(e) => setPdfProvider(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {PDF_PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.model})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePdfScore}
                disabled={isPdfScoring || !pdfFile}
                className="w-full bg-blue-600 text-white font-semibold px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isPdfScoring ? 'Analyzing...' : 'Score PDF Document'}
              </button>

              {pdfError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800">
                    Error: {pdfError}
                  </p>
                </div>
              )}
            </>
          )}

          {/* URL Mode */}
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
