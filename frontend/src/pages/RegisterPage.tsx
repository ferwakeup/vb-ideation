/**
 * Register Page Component
 * User registration form with email verification
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/Spinner';
import PasswordStrength from '../components/PasswordStrength';
import LanguageSelector from '../components/LanguageSelector';

export default function RegisterPage() {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      setError(t('register.validation.fullNameRequired'));
      return false;
    }

    if (!email.trim()) {
      setError(t('register.validation.emailRequired'));
      return false;
    }

    if (password.length < 8) {
      setError(t('register.validation.passwordMinLength'));
      return false;
    }

    if (password !== confirmPassword) {
      setError(t('register.validation.passwordsNoMatch'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await register({ email, password, full_name: fullName });
      setSuccess(true);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string | Array<{ msg: string }> } } };
        const detail = axiosError.response?.data?.detail;
        if (typeof detail === 'string') {
          setError(detail);
        } else if (Array.isArray(detail) && detail.length > 0) {
          setError(detail[0].msg || t('register.defaultError'));
        } else {
          setError(t('register.defaultError'));
        }
      } else {
        setError(t('register.genericError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show success screen after registration
  if (success) {
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

          {/* Success Card */}
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 shadow-xl text-center">
            <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{t('verification.checkEmail')}</h1>
            <p className="text-gray-400 mb-6">
              {t('verification.sentTo')}<br />
              <span className="text-white font-medium">{email}</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {t('verification.linkExpiry')}
            </p>
            <div className="space-y-3">
              <Link
                to="/login"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
              >
                {t('verification.goToLogin')}
              </Link>
              <p className="text-sm text-gray-500">
                {t('verification.didntReceive')}{' '}
                <Link to="/resend-verification" className="text-blue-500 hover:text-blue-400">
                  {t('verification.resendVerification')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Register Card */}
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{t('register.title')}</h1>
              <p className="text-gray-400">{t('register.subtitle')}</p>
            </div>
            <LanguageSelector variant="dark" compact />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6 animate-in fade-in duration-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                {t('register.fullName')}
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('register.fullNamePlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                {t('register.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('register.emailPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                {t('register.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('register.passwordPlaceholder')}
              />
              <PasswordStrength password={password} />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                {t('register.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('register.confirmPasswordPlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" variant="light" />
                  <span>{t('register.submitting')}</span>
                </>
              ) : (
                t('register.submit')
              )}
            </button>
          </form>
        </div>

        {/* Login Link */}
        <p className="text-center text-gray-400 mt-6">
          {t('register.hasAccount')}{' '}
          <Link to="/login" className="text-blue-500 hover:text-blue-400 font-medium">
            {t('register.signIn')}
          </Link>
        </p>

        {/* Back to Home */}
        <p className="text-center mt-4">
          <Link to="/" className="text-gray-500 hover:text-gray-400 text-sm">
            {tCommon('backToHome')}
          </Link>
        </p>
      </div>
    </div>
  );
}
