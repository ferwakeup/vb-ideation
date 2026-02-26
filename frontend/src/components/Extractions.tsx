/**
 * Extractions Component
 * Displays a table of previously extracted documents
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { ExtractionListItem } from '../types/index';
import Spinner from './Spinner';

interface ExtractionsProps {
  onSelectExtraction?: (extractionId: number) => void;
  selectionMode?: boolean;
}

export default function Extractions({ onSelectExtraction, selectionMode = false }: ExtractionsProps) {
  const { t } = useTranslation('scorer');
  const { t: tCommon } = useTranslation('common');
  const { token } = useAuth();
  const [extractions, setExtractions] = useState<ExtractionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  useEffect(() => {
    loadExtractions();
  }, [token]);

  const loadExtractions = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError('');
      const data = await api.getExtractions(token);
      setExtractions(data);
    } catch (err) {
      setError(t('extractions.loadError'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!confirm(t('extractions.confirmDelete'))) return;

    try {
      setDeleteLoading(id);
      await api.deleteExtraction(token, id);
      setExtractions(extractions.filter(e => e.id !== id));
    } catch (err) {
      setError(t('extractions.deleteError'));
      console.error(err);
    } finally {
      setDeleteLoading(null);
    }
  };

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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <Spinner size="lg" />
        <p className="text-gray-500 mt-4">{t('extractions.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadExtractions}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          {tCommon('actions.retry')}
        </button>
      </div>
    );
  }

  if (extractions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('extractions.noExtractions')}</h3>
        <p className="text-gray-500">
          {t('extractions.noExtractionsHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('extractions.columns.date')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('extractions.columns.document')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('extractions.columns.user')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('extractions.columns.model')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('extractions.columns.sector')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('extractions.columns.tokens')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('extractions.columns.size')}
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('extractions.columns.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {extractions.map((extraction) => (
              <tr key={extraction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(extraction.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={extraction.file_name}>
                    {extraction.file_name}
                  </div>
                  {extraction.text_preview && (
                    <div className="text-xs text-gray-400 truncate max-w-[200px]" title={extraction.text_preview}>
                      {extraction.text_preview}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {extraction.user_full_name ? (
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{extraction.user_full_name}</div>
                      <div className="text-gray-500 text-xs">{extraction.user_email}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {extraction.model_used}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {extraction.sector ? (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded capitalize">
                      {extraction.sector}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {extraction.token_count?.toLocaleString() || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {(extraction.compressed_size / 1024).toFixed(1)} KB
                  </div>
                  <div className="text-xs text-green-600">
                    {t('extractions.spaceSaved', { percent: extraction.space_saved_percent?.toFixed(0) })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    {selectionMode && onSelectExtraction && (
                      <button
                        onClick={() => onSelectExtraction(extraction.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        {tCommon('actions.use')}
                      </button>
                    )}
                    {deleteLoading === extraction.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <button
                        onClick={() => handleDelete(extraction.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title={tCommon('actions.delete')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
