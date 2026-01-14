/**
 * Main App component with React Query setup
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import IdeaScorer from './components/IdeaScorer';

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
      <IdeaScorer />
    </QueryClientProvider>
  );
}

export default App;
