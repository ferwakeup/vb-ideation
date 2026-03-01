/**
 * Verify Email Page Component
 * Handles email verification via Supabase callback
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../clients/supabase';
import Spinner from '../components/Spinner';

export default function VerifyEmailPage() {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Supabase handles the token verification automatically via the URL hash
        // We just need to check if the session is valid after the redirect
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          setStatus('error');
          setMessage(error.message || t('verification.genericError'));
          return;
        }

        if (session?.user?.email_confirmed_at) {
          // Update user profile to mark as verified
          const { error: updateError } = await supabase
            .from('users')
            .update({ is_verified: true })
            .eq('id', session.user.id);

          if (updateError) {
            console.error('Error updating user verification status:', updateError);
          }

          setStatus('success');
          setMessage(t('verification.successMessage'));

          // Redirect to app after a short delay
          setTimeout(() => {
            navigate('/app');
          }, 2000);
        } else {
          // No confirmed session, might be a direct visit or expired link
          setStatus('error');
          setMessage(t('verification.invalidLink'));
        }
      } catch (err) {
        setStatus('error');
        const errorMessage = err instanceof Error ? err.message : String(err);
        setMessage(errorMessage || t('verification.genericError'));
      }
    };

    // Listen for auth state changes (Supabase processes the URL hash automatically)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        setStatus('success');
        setMessage(t('verification.successMessage'));

        // Update user profile to mark as verified
        supabase
          .from('users')
          .update({ is_verified: true })
          .eq('id', session.user.id)
          .then(() => {
            setTimeout(() => {
              navigate('/app');
            }, 2000);
          });
      }
    });

    // Initial check
    handleEmailVerification();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, t]);

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
                <Spinner size="lg" variant="light" />
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
              <p className="text-sm text-gray-500">{t('verification.redirecting')}</p>
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
