/**
 * Resend Verification Page Component
 * Allows users to request a new verification email
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import Spinner from '../components/Spinner';
import LanguageSelector from '../components/LanguageSelector';

export default function ResendVerificationPage() {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Pre-fill email from URL parameter
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await api.resendVerification({ email });
      setStatus('success');
      setMessage(response.message);
    } catch (err: unknown) {
      setStatus('error');
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setMessage(axiosError.response?.data?.detail || t('resend.defaultError'));
      } else {
        setMessage(t('resend.genericError'));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-white font-bold text-2xl">{tCommon('appName')}</span>
          </Link>
        </div>

        {/* Resend Verification Card */}
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{t('resend.title')}</h1>
              <p className="text-gray-400">{t('resend.subtitle')}</p>
            </div>
            <LanguageSelector variant="dark" compact />
          </div>

          {status === 'success' && (
            <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg mb-6">
              {message}
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                {t('resend.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('resend.emailPlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <Spinner size="sm" variant="light" />
                  <span>{t('resend.submitting')}</span>
                </>
              ) : (
                t('resend.submit')
              )}
            </button>
          </form>
        </div>

        {/* Back Links */}
        <div className="text-center mt-6 space-y-2">
          <p>
            <Link to="/login" className="text-blue-500 hover:text-blue-400 font-medium">
              {t('resend.backToLogin')}
            </Link>
          </p>
          <p>
            <Link to="/" className="text-gray-500 hover:text-gray-400 text-sm">
              {tCommon('backToHome')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
