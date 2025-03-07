/**
 * API configuration
 */

// Base URL for API requests
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Configuration for API endpoints
export const API_ENDPOINTS = {
  positionHistory: `${API_BASE_URL}/api/position-history`,
  cache: `${API_BASE_URL}/api/cache`,
  health: `${API_BASE_URL}/api/health`
};

// Default request timeout in milliseconds
export const API_TIMEOUT = 10000; // 10 seconds

// Retry configuration
export const API_RETRY = {
  attempts: 3,
  backoff: 1000, // 1 second
};
