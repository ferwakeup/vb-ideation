/**
 * API client for communicating with the backend
 */
import axios from 'axios';
import type {
  IdeaScore,
  ScoringRequest,
  URLsResponse,
  PDFScoringRequest,
  PDFScoringResult,
  ProgressEvent,
  InitEvent
} from '../types/index';

const API_BASE = 'http://localhost:8000/api/v1';

export const api = {
  /**
   * Score a business idea
   */
  scoreIdea: async (request: ScoringRequest): Promise<IdeaScore> => {
    const response = await axios.post(`${API_BASE}/score`, request);
    return response.data;
  },

  /**
   * Score a PDF with progress streaming (SSE)
   */
  scorePDFWithProgress: (
    request: PDFScoringRequest,
    onProgress: (event: ProgressEvent) => void,
    onResult: (result: PDFScoringResult) => void,
    onError: (error: string) => void,
    onInit?: (event: InitEvent) => void
  ): { abort: () => void } => {
    const abortController = new AbortController();

    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('sector', request.sector);
    formData.append('num_ideas', String(request.num_ideas ?? 3));
    formData.append('idea_index', String(request.idea_index ?? 0));
    formData.append('provider', request.provider ?? 'anthropic');
    if (request.model) {
      formData.append('model', request.model);
    }
    formData.append('use_checkpoints', String(request.use_checkpoints ?? true));

    fetch(`${API_BASE}/score-pdf-stream`, {
      method: 'POST',
      body: formData,
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          let eventType = '';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6);
            } else if (line === '' && eventData) {
              // Empty line marks end of an event
              try {
                const parsed = JSON.parse(eventData);

                if (eventType === 'init') {
                  onInit?.(parsed as InitEvent);
                } else if (eventType === 'progress') {
                  onProgress(parsed as ProgressEvent);
                } else if (eventType === 'result') {
                  onResult(parsed as PDFScoringResult);
                } else if (eventType === 'error') {
                  onError(parsed.message || 'Unknown error');
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }

              eventType = '';
              eventData = '';
            }
          }
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          onError(error.message || 'Connection failed');
        }
      });

    return {
      abort: () => abortController.abort()
    };
  },

  /**
   * Get URLs from config file
   */
  getUrls: async (): Promise<string[]> => {
    const response = await axios.get<URLsResponse>(`${API_BASE}/urls`);
    return response.data.urls;
  },

  /**
   * Update URLs in config file
   */
  updateUrls: async (urls: string[]): Promise<void> => {
    await axios.post(`${API_BASE}/urls`, urls);
  },

  /**
   * Health check
   */
  healthCheck: async (): Promise<{ status: string }> => {
    const response = await axios.get(`${API_BASE}/health`);
    return response.data;
  }
};
