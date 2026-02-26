/**
 * Verify Email Page Component
 * Handles email verification via token from URL
 */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import Spinner from '../components/Spinner';

export default function VerifyEmailPage() {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage(t('verification.invalidLink'));
        return;
      }

      try {
        const response = await api.verifyEmail({ token });
        setStatus('success');
        setMessage(response.message);
      } catch (err: unknown) {
        setStatus('error');
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { data?: { detail?: string } } };
          setMessage(axiosError.response?.data?.detail || t('verification.linkExpired'));
        } else {
          setMessage(t('verification.genericError'));
        }
      }
    };

    verifyEmail();
  }, [token, t]);

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

        {/* Verification Card */}
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 shadow-xl text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Spinner size="lg" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">{t('verification.verifying')}</h1>
              <p className="text-gray-400">{t('verification.pleaseWait')}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">{t('verification.verified')}</h1>
              <p className="text-gray-400 mb-6">{message}</p>
              <Link
                to="/login"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
              >
                {t('verification.signIn')}
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">{t('verification.verificationFailed')}</h1>
              <p className="text-gray-400 mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  to="/resend-verification"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
                >
                  {t('verification.resendVerificationEmail')}
                </Link>
                <Link
                  to="/login"
                  className="block w-full border border-gray-600 hover:border-gray-500 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
                >
                  {t('verification.backToLogin')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
