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
  InitEvent,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  AuthResponse,
  VerifyEmailRequest,
  ResendVerificationRequest,
  User,
  UserStatusUpdate,
  ExtractionCreate,
  Extraction,
  ExtractionListItem,
  ExtractionScoringRequest,
  ExtractionCheck,
  ExtractionCheckResponse,
  ExtractionStats
} from '../types/index';

const API_BASE = import.meta.env.PROD
  ? 'https://vb-ideation.onrender.com/api/v1'
  : 'http://localhost:8000/api/v1';

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
        let eventType = '';
        let eventData = '';

        const processLines = (lines: string[]) => {
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6);
            } else if (line === '' && eventData) {
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
        };

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Process any remaining data in buffer when stream ends
            if (buffer.trim()) {
              const finalLines = buffer.split('\n');
              finalLines.push(''); // Add empty line to trigger final event processing
              processLines(finalLines);
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          processLines(lines);
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
   * Score a previously extracted document with progress streaming (SSE)
   */
  scoreExtractionWithProgress: (
    request: ExtractionScoringRequest,
    onProgress: (event: ProgressEvent) => void,
    onResult: (result: PDFScoringResult) => void,
    onError: (error: string) => void,
    onInit?: (event: InitEvent) => void
  ): { abort: () => void } => {
    const abortController = new AbortController();

    const formData = new FormData();
    formData.append('extraction_id', String(request.extraction_id));
    formData.append('sector', request.sector);
    formData.append('num_ideas', String(request.num_ideas ?? 3));
    formData.append('idea_index', String(request.idea_index ?? 0));
    formData.append('provider', request.provider ?? 'groq');
    if (request.model) {
      formData.append('model', request.model);
    }

    fetch(`${API_BASE}/score-extraction-stream`, {
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
        let eventType = '';
        let eventData = '';

        const processLines = (lines: string[]) => {
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6);
            } else if (line === '' && eventData) {
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
        };

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Process any remaining data in buffer when stream ends
            if (buffer.trim()) {
              const finalLines = buffer.split('\n');
              finalLines.push(''); // Add empty line to trigger final event processing
              processLines(finalLines);
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          processLines(lines);
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
  },

  /**
   * Login user
   */
  login: async (request: LoginRequest): Promise<AuthResponse> => {
    const response = await axios.post(`${API_BASE}/auth/login`, request);
    return response.data;
  },

  /**
   * Register user
   */
  register: async (request: RegisterRequest): Promise<RegisterResponse> => {
    const response = await axios.post(`${API_BASE}/auth/register`, request);
    return response.data;
  },

  /**
   * Verify email with token
   */
  verifyEmail: async (request: VerifyEmailRequest): Promise<{ message: string }> => {
    const response = await axios.post(`${API_BASE}/auth/verify-email`, request);
    return response.data;
  },

  /**
   * Resend verification email
   */
  resendVerification: async (request: ResendVerificationRequest): Promise<{ message: string }> => {
    const response = await axios.post(`${API_BASE}/auth/resend-verification`, request);
    return response.data;
  },

  /**
   * Get current user info
   */
  getMe: async (token: string): Promise<User> => {
    const response = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Admin endpoints

  /**
   * Get all users (admin only)
   */
  getUsers: async (token: string): Promise<User[]> => {
    const response = await axios.get(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Update user status (admin only)
   */
  updateUserStatus: async (token: string, userId: number, status: UserStatusUpdate): Promise<User> => {
    const response = await axios.patch(`${API_BASE}/admin/users/${userId}/status`, status, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Delete user (admin only)
   */
  deleteUser: async (token: string, userId: number): Promise<{ message: string }> => {
    const response = await axios.delete(`${API_BASE}/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Extraction endpoints

  /**
   * Check if extraction exists for file hash + model
   */
  checkExtraction: async (token: string, check: ExtractionCheck): Promise<ExtractionCheckResponse> => {
    const response = await axios.post(`${API_BASE}/extractions/check`, check, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Get extraction storage statistics
   */
  getExtractionStats: async (token: string): Promise<ExtractionStats> => {
    const response = await axios.get(`${API_BASE}/extractions/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Create a new extraction
   */
  createExtraction: async (token: string, extraction: ExtractionCreate): Promise<Extraction> => {
    const response = await axios.post(`${API_BASE}/extractions/`, extraction, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * List all extractions
   */
  getExtractions: async (token: string): Promise<ExtractionListItem[]> => {
    const response = await axios.get(`${API_BASE}/extractions/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Get a specific extraction with full text
   */
  getExtraction: async (token: string, extractionId: number): Promise<Extraction> => {
    const response = await axios.get(`${API_BASE}/extractions/${extractionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Delete an extraction
   */
  deleteExtraction: async (token: string, extractionId: number): Promise<{ message: string }> => {
    const response = await axios.delete(`${API_BASE}/extractions/${extractionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
