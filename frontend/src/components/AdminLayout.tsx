/**
 * Admin Layout Component
 * Provides the main layout structure with sidebar navigation
 */
import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useAnalysis } from '../contexts/AnalysisContext';
import { useDebug } from '../contexts/DebugContext';
import LanguageSelector from './LanguageSelector';
import DebugConsole from './DebugConsole';

interface NavItem {
  key: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  end?: boolean;
}

const navigationConfig: NavItem[] = [
  {
    key: 'ventureScorer',
    href: '/app',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    end: true,
  },
  {
    key: 'history',
    href: '/app/history',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'users',
    href: '/app/users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    adminOnly: true,
  },
];

export default function AdminLayout() {
  const { t } = useTranslation('common');
  const { user, logout } = useAuth();
  const { isAnalyzing, progress } = useAnalysis();
  const { isAdmin, isDebugMode, toggleDebugMode } = useDebug();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change or window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Toggle button component
  const CollapseButton = ({ className = '' }: { className?: string }) => (
    <button
      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      className={`p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors ${className}`}
      title={sidebarCollapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
    >
      <svg
        className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
      </svg>
    </button>
  );

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-gray-900 flex items-center justify-between px-4 lg:hidden z-30">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-gray-400 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-white">{t('appName')}</span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={toggleDebugMode}
              className={`p-2 rounded-lg transition-colors ${
                isDebugMode
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              title={isDebugMode ? 'Disable Debug Mode' : 'Enable Debug Mode'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </button>
          )}
          <LanguageSelector variant="dark" compact />
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-gray-900 text-white flex flex-col
          transform transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
          w-64
        `}
      >
        {/* Logo/Header */}
        <div className={`p-4 border-b border-gray-800 ${sidebarCollapsed ? 'lg:px-2' : 'p-6'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 ${sidebarCollapsed ? 'w-10 h-10 lg:w-12 lg:h-12' : 'w-10 h-10'}`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              {!sidebarCollapsed && (
                <div className="lg:block">
                  <h1 className="font-bold text-lg">{t('appName')}</h1>
                  <p className="text-xs text-gray-400">{t('adminPanel')}</p>
                </div>
              )}
            </div>
            {/* Close button for mobile */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-gray-400 hover:text-white lg:hidden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Language Selector & Debug Toggle - Desktop */}
        {!sidebarCollapsed && (
          <div className="hidden lg:flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <LanguageSelector variant="dark" />
            {isAdmin && (
              <button
                onClick={toggleDebugMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isDebugMode
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                title={isDebugMode ? 'Disable Debug Mode' : 'Enable Debug Mode'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span>Debug</span>
              </button>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className={`flex-1 p-4 ${sidebarCollapsed ? 'lg:p-2' : ''}`}>
          <ul className="space-y-2">
            {navigationConfig
              .filter((item) => !item.adminOnly || user?.is_admin)
              .map((item) => {
                const name = t(`nav.${item.key}`);
                const description = t(`navDescriptions.${item.key}`);
                return (
                  <li key={item.key}>
                    <NavLink
                      to={item.href}
                      end={item.end}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''
                        } ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`
                      }
                      title={sidebarCollapsed ? name : undefined}
                    >
                      <div className="flex-shrink-0">{item.icon}</div>
                      {!sidebarCollapsed && (
                        <div className="lg:block">
                          <span className="font-medium">{name}</span>
                          <p className="text-xs opacity-70">{description}</p>
                        </div>
                      )}
                      {sidebarCollapsed && (
                        <div className="lg:hidden">
                          <span className="font-medium">{name}</span>
                          <p className="text-xs opacity-70">{description}</p>
                        </div>
                      )}
                    </NavLink>
                  </li>
                );
              })}
          </ul>

          {/* Analysis Progress Indicator */}
          {isAnalyzing && progress && (
            <div className={`mt-4 ${sidebarCollapsed ? 'lg:mx-1' : 'mx-2'}`}>
              {sidebarCollapsed ? (
                // Collapsed: spinner only (desktop)
                <div className="hidden lg:flex justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                </div>
              ) : null}
              {/* Expanded: progress bar with step info */}
              <div className={`bg-gray-800 rounded-lg p-3 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                <div className="text-xs text-gray-300 truncate mb-1">
                  {progress.title}
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(progress.step / progress.total_steps) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Step {progress.step}/{progress.total_steps}
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Collapse Toggle - Desktop Only */}
        <div className="hidden lg:block p-2 border-t border-gray-800">
          <CollapseButton className="w-full flex justify-center" />
        </div>

        {/* Footer */}
        <div className={`p-4 border-t border-gray-800 ${sidebarCollapsed ? 'lg:p-2' : ''}`}>
          {sidebarCollapsed ? (
            // Collapsed view - icon only
            <div className="hidden lg:flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title={t('nav.logout')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : null}
          {/* Full view (shown on mobile always, on desktop when not collapsed) */}
          <div className={`flex items-center justify-between px-4 py-2 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-white">
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-300 truncate">
                  {user?.full_name || t('user')}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
              title={t('nav.logout')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <Outlet />
      </main>

      {/* Debug Console */}
      <DebugConsole />
    </div>
  );
}
