/**
 * API client for communicating with the backend
 */
import axios from 'axios';
import type { IdeaScore, ScoringRequest, URLsResponse } from '../types/index';

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
