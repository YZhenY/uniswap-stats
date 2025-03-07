/**
 * API module for Uniswap Stats
 */

export * from './config';

/**
 * Generic API request function
 * @param url API endpoint URL
 * @param options Request options
 * @returns Response data
 */
export async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Check API health
 * @returns Health status
 */
export async function checkHealth(): Promise<{ status: string; message: string; mongodb: string }> {
  try {
    const response = await fetchApi<{ status: string; message: string; mongodb: string }>(
      '/api/health'
    );
    return response;
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      status: 'error',
      message: 'API unavailable',
      mongodb: 'disconnected'
    };
  }
}
