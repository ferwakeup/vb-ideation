/**
 * Main component for scoring business ideas
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import ScoreCard from './ScoreCard';
import ScoreChart from './ScoreChart';
import LoadingSpinner from './LoadingSpinner';

export default function IdeaScorer() {
  const [useConfig, setUseConfig] = useState(true);
  const [customUrls, setCustomUrls] = useState<string[]>(['']);

  const scoreMutation = useMutation({
    mutationFn: api.scoreIdea,
  });

  const handleScore = () => {
    if (useConfig) {
      scoreMutation.mutate({ url_source: 'config' });
    } else {
      const validUrls = customUrls.filter(u => u.trim());
      if (validUrls.length === 0) {
        alert('Please enter at least one URL');
        return;
      }
      scoreMutation.mutate({ urls: validUrls });
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Venture Builder Idea Scorer
          </h1>
          <p className="text-gray-600">
            AI-powered analysis of business ideas across 11 critical dimensions
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Input Configuration
          </h2>

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
        </div>

        {/* Loading State */}
        {scoreMutation.isPending && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <LoadingSpinner />
            <p className="text-center text-gray-600 mt-4">
              Analyzing business idea across 11 dimensions... This may take 30-60 seconds.
            </p>
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
                className={`text-lg font-semibold p-4 rounded-md border-2 text-center ${getRecommendationStyle(
                  scoreMutation.data.recommendation
                )}`}
              >
                {scoreMutation.data.recommendation}
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
      </div>
    </div>
  );
}
