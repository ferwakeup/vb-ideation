/**
 * History Component
 * Displays a sortable table of previously analyzed documents
 * and a tab for extracted documents
 */
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, type HistoryEntry } from '../contexts/HistoryContext';
import Extractions from './Extractions';

type TabType = 'analyses' | 'extractions';

type SortField = 'timestamp' | 'fileName' | 'user' | 'sector' | 'overallScore' | 'recommendation' | string;
type SortDirection = 'asc' | 'desc';

// Standard dimension names for column headers
const DIMENSION_COLUMNS = [
  { key: 'Market Potential', short: 'Market' },
  { key: 'Differentiated Approach and Positioning', short: 'Diff. Approach' },
  { key: 'Sustainable Competitive Advantage', short: 'Comp. Adv.' },
  { key: 'Differentiating Element', short: 'Diff. Element' },
  { key: 'Technical Feasibility', short: 'Tech. Feas.' },
  { key: 'Affordable & Rapid Implementation', short: 'Rapid Impl.' },
  { key: 'AI Enablement for Core Value', short: 'AI Enable.' },
  { key: 'Barrier to Entry', short: 'Barrier' },
  { key: 'Scalable Technology & Operations', short: 'Scalability' },
  { key: 'Product-Focused Output', short: 'Product' },
  { key: 'Subscription-Based Platform Access', short: 'Subscription' },
];

export default function History() {
  const { t } = useTranslation('scorer');
  const { t: tCommon } = useTranslation('common');
  const { history, removeEntry, clearHistory } = useHistory();
  const [activeTab, setActiveTab] = useState<TabType>('analyses');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

  // Get dimension score from entry
  const getDimensionScore = (entry: HistoryEntry, dimensionKey: string): number | null => {
    const dim = entry.dimensionScores.find(d => d.dimension === dimensionKey);
    return dim ? dim.score : null;
  };

  // Sort history entries
  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      // Check if sorting by a dimension
      const isDimensionSort = DIMENSION_COLUMNS.some(d => d.key === sortField);

      if (isDimensionSort) {
        aValue = getDimensionScore(a, sortField) ?? -1;
        bValue = getDimensionScore(b, sortField) ?? -1;
      } else {
        switch (sortField) {
          case 'timestamp':
            aValue = new Date(a.timestamp).getTime();
            bValue = new Date(b.timestamp).getTime();
            break;
          case 'fileName':
            aValue = a.fileName.toLowerCase();
            bValue = b.fileName.toLowerCase();
            break;
          case 'user':
            aValue = (a.user?.fullName || '').toLowerCase();
            bValue = (b.user?.fullName || '').toLowerCase();
            break;
          case 'sector':
            aValue = a.sector.toLowerCase();
            bValue = b.sector.toLowerCase();
            break;
          case 'overallScore':
            aValue = a.overallScore;
            bValue = b.overallScore;
            break;
          case 'recommendation':
            aValue = a.recommendation.toLowerCase();
            bValue = b.recommendation.toLowerCase();
            break;
          default:
            aValue = 0;
            bValue = 0;
        }
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [history, sortField, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Score color helper
  const getScoreColor = (score: number | null): string => {
    if (score === null) return 'text-gray-400';
    if (score >= 8) return 'text-green-600 font-semibold';
    if (score >= 6) return 'text-blue-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Recommendation badge color
  const getRecommendationStyle = (recommendation: string): string => {
    if (recommendation.includes('Strong')) {
      return 'bg-green-100 text-green-800';
    } else if (recommendation.includes('Consider')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (recommendation.includes('Research')) {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-red-100 text-red-800';
  };

  // Format date
  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t('history.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('history.subtitle')}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('analyses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analyses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {t('history.tabs.analyses')}
                <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {history.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('extractions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'extractions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('history.tabs.extractions')}
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'extractions' ? (
          <Extractions />
        ) : (
          <>
            {/* Analysis History Header */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-gray-600">
                {t('history.documentsAnalyzed', { count: history.length })}
              </p>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm(t('history.confirmClear'))) {
                      clearHistory();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {t('history.clearHistory')}
                </button>
              )}
            </div>

        {/* Empty State */}
        {history.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('history.noAnalyses')}</h3>
            <p className="text-gray-500 mb-4">
              {t('history.noAnalysesHint')}
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('history.startAnalysis')}
            </a>
          </div>
        )}

        {/* Table */}
        {history.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {/* Fixed columns */}
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky left-0 bg-gray-50 z-10"
                      onClick={() => handleSort('timestamp')}
                    >
                      <div className="flex items-center gap-1">
                        {t('history.columns.date')}
                        <SortIndicator field="timestamp" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('fileName')}
                    >
                      <div className="flex items-center gap-1">
                        {t('history.columns.document')}
                        <SortIndicator field="fileName" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('user')}
                    >
                      <div className="flex items-center gap-1">
                        {t('history.columns.user')}
                        <SortIndicator field="user" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('sector')}
                    >
                      <div className="flex items-center gap-1">
                        {t('history.columns.sector')}
                        <SortIndicator field="sector" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('overallScore')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {t('history.columns.overall')}
                        <SortIndicator field="overallScore" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('recommendation')}
                    >
                      <div className="flex items-center gap-1">
                        {t('history.columns.recommendation')}
                        <SortIndicator field="recommendation" />
                      </div>
                    </th>

                    {/* Dimension columns */}
                    {DIMENSION_COLUMNS.map((dim) => (
                      <th
                        key={dim.key}
                        className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={() => handleSort(dim.key)}
                        title={dim.key}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {dim.short}
                          <SortIndicator field={dim.key} />
                        </div>
                      </th>
                    ))}

                    {/* Actions column */}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('history.columns.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedHistory.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 sticky left-0 bg-white">
                        {formatDate(entry.timestamp)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={entry.fileName}>
                          {entry.fileName}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {entry.user ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{entry.user.fullName}</div>
                            <div className="text-gray-500 text-xs">{entry.user.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded capitalize">
                          {entry.sector}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className={`text-lg font-bold ${getScoreColor(entry.overallScore)}`}>
                          {entry.overallScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getRecommendationStyle(entry.recommendation)}`}>
                          {entry.recommendation}
                        </span>
                      </td>

                      {/* Dimension scores */}
                      {DIMENSION_COLUMNS.map((dim) => {
                        const score = getDimensionScore(entry, dim.key);
                        return (
                          <td key={dim.key} className="px-3 py-4 whitespace-nowrap text-center">
                            <span className={`text-sm ${getScoreColor(score)}`}>
                              {score !== null ? score.toFixed(1) : '-'}
                            </span>
                          </td>
                        );
                      })}

                      {/* Actions */}
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedEntry(entry)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title={t('history.viewDetails')}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(t('history.confirmRemove'))) {
                                removeEntry(entry.id);
                              }
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title={tCommon('actions.delete')}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedEntry && (
          <DetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
        )}
          </>
        )}
      </div>
    </div>
  );
}

// Detail Modal Component
function DetailModal({ entry, onClose }: { entry: HistoryEntry; onClose: () => void }) {
  const { t } = useTranslation('scorer');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{entry.fileName}</h2>
            <p className="text-sm text-gray-500">
              {t('history.modal.analyzedOn')} {new Date(entry.timestamp).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('history.modal.ideaSummary')}</h3>
            <p className="text-gray-700">{entry.ideaSummary}</p>
          </div>

          {/* Scores Overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{entry.overallScore.toFixed(1)}</div>
              <div className="text-sm text-blue-600">{t('history.modal.overallScore')}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-lg font-semibold text-gray-800 capitalize">{entry.sector}</div>
              <div className="text-sm text-gray-500">{t('history.columns.sector')}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-lg font-semibold text-gray-800">{entry.processingTime.toFixed(1)}s</div>
              <div className="text-sm text-gray-500">{t('history.modal.processingTime')}</div>
            </div>
          </div>

          {/* Recommendation */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('history.modal.recommendation')}</h3>
            <span className={`px-3 py-1.5 text-sm font-medium rounded ${
              entry.recommendation.includes('Strong') ? 'bg-green-100 text-green-800' :
              entry.recommendation.includes('Consider') ? 'bg-yellow-100 text-yellow-800' :
              entry.recommendation.includes('Research') ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800'
            }`}>
              {entry.recommendation}
            </span>
          </div>

          {/* Dimension Scores */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('history.modal.dimensionScores')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {entry.dimensionScores.map((dim, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                  <span className="text-sm text-gray-700 truncate flex-1" title={dim.dimension}>
                    {dim.dimension}
                  </span>
                  <span className={`text-sm font-semibold ml-2 ${
                    dim.score >= 8 ? 'text-green-600' :
                    dim.score >= 6 ? 'text-blue-600' :
                    dim.score >= 4 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {dim.score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Concerns */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">{t('history.modal.keyStrengths')}</h4>
              <ul className="space-y-1">
                {entry.keyStrengths.map((s, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start">
                    <span className="text-green-600 mr-2">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">{t('history.modal.keyConcerns')}</h4>
              <ul className="space-y-1">
                {entry.keyConcerns.map((c, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start">
                    <span className="text-red-600 mr-2">-</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* User & Model Info */}
          <div className="text-center text-sm text-gray-500 space-y-1">
            {entry.user && (
              <div>
                {t('history.modal.analyzedBy')} <span className="font-medium">{entry.user.fullName}</span> ({entry.user.email})
              </div>
            )}
            <div>
              {t('history.modal.using')} <span className="font-medium">{entry.modelUsed}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
