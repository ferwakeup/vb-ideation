/**
 * Main App component with React Query setup and routing
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './i18n';
import { HistoryProvider } from './contexts/HistoryContext';
import { AuthProvider } from './contexts/AuthContext';
import { AnalysisProvider } from './contexts/AnalysisContext';
import { DebugProvider } from './contexts/DebugContext';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import IdeaScorer from './components/IdeaScorer';
import History from './components/History';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ResendVerificationPage from './pages/ResendVerificationPage';
import AdminUsersPage from './pages/AdminUsersPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DebugProvider>
          <HistoryProvider>
            <AnalysisProvider>
              <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/resend-verification" element={<ResendVerificationPage />} />

                {/* Protected routes */}
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<IdeaScorer />} />
                  <Route path="history" element={<History />} />
                  <Route path="users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
                </Route>
              </Routes>
              </BrowserRouter>
            </AnalysisProvider>
          </HistoryProvider>
        </DebugProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
