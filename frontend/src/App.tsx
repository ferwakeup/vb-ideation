/**
 * Main App component with React Query setup and routing
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HistoryProvider } from './contexts/HistoryContext';
import AdminLayout from './components/AdminLayout';
import IdeaScorer from './components/IdeaScorer';
import History from './components/History';

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
      <HistoryProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<IdeaScorer />} />
              <Route path="/history" element={<History />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </HistoryProvider>
    </QueryClientProvider>
  );
}

export default App;
