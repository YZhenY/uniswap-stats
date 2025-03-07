import { API_BASE_URL } from '../config';

// Type definition for position history entry
export interface PositionHistoryEntry {
  _id?: string;
  positionId: string;
  chainId: string;
  poolPair?: string;
  apy?: string;
  timestamp: number;
  lowerPrice?: number;
  upperPrice?: number;
  currentPrice?: number;
  lastRefreshed?: number;
}

// API endpoint
const API_URL = `${API_BASE_URL}/api/position-history`;

/**
 * Get all position history entries
 * @returns Array of position history entries
 */
export const getPositionHistory = async (): Promise<PositionHistoryEntry[]> => {
  try {
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching position history:', error);
    // Fall back to localStorage if API fails
    try {
      const storedData = localStorage.getItem('uniswap_position_history');
      if (storedData) {
        return JSON.parse(storedData);
      }
    } catch (e) {
      console.error('Error reading from localStorage:', e);
    }
    return [];
  }
};

/**
 * Save a position history entry
 * @param position Position history entry to save
 * @returns Updated position history entry
 */
export const savePositionHistory = async (position: PositionHistoryEntry): Promise<PositionHistoryEntry> => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(position)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving position history:', error);
    // Fall back to localStorage if API fails
    try {
      const storedData = localStorage.getItem('uniswap_position_history') || '[]';
      const positions: PositionHistoryEntry[] = JSON.parse(storedData);
      
      // Remove existing entry if it exists
      const filteredPositions = positions.filter(
        p => !(p.positionId === position.positionId && p.chainId === position.chainId)
      );
      
      // Add the new position to the beginning
      const updatedPositions = [position, ...filteredPositions].slice(0, 10);
      
      localStorage.setItem('uniswap_position_history', JSON.stringify(updatedPositions));
      
      return position;
    } catch (e) {
      console.error('Error saving to localStorage:', e);
      return position;
    }
  }
};

/**
 * Delete a position history entry
 * @param positionId Position ID
 * @param chainId Chain ID
 * @returns Success status
 */
export const deletePositionHistory = async (positionId: string, chainId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/${chainId}/${positionId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting position history:', error);
    // Fall back to localStorage if API fails
    try {
      const storedData = localStorage.getItem('uniswap_position_history') || '[]';
      const positions: PositionHistoryEntry[] = JSON.parse(storedData);
      
      const filteredPositions = positions.filter(
        p => !(p.positionId === positionId && p.chainId === chainId)
      );
      
      localStorage.setItem('uniswap_position_history', JSON.stringify(filteredPositions));
      
      return true;
    } catch (e) {
      console.error('Error updating localStorage:', e);
      return false;
    }
  }
};

/**
 * Delete all position history entries
 * @returns Success status
 */
export const deleteAllPositionHistory = async (): Promise<boolean> => {
  try {
    const response = await fetch(API_URL, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting all position history:', error);
    // Fall back to localStorage if API fails
    try {
      localStorage.removeItem('uniswap_position_history');
      return true;
    } catch (e) {
      console.error('Error clearing localStorage:', e);
      return false;
    }
  }
};
