const express = require('express');
const router = express.Router();
const PositionHistory = require('../models/PositionHistory');

// Get all position history entries
router.get('/', async (req, res) => {
  try {
    const positions = await PositionHistory.find()
      .sort({ lastRefreshed: -1 })
      .limit(10);
    
    res.json(positions);
  } catch (error) {
    console.error('Error fetching position history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get position history by positionId and chainId
router.get('/:chainId/:positionId', async (req, res) => {
  try {
    const { chainId, positionId } = req.params;
    const position = await PositionHistory.findOne({ positionId, chainId });
    
    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }
    
    res.json(position);
  } catch (error) {
    console.error('Error fetching position:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create or update a position history entry
router.post('/', async (req, res) => {
  try {
    const { positionId, chainId } = req.body;
    
    if (!positionId || !chainId) {
      return res.status(400).json({ message: 'Position ID and Chain ID are required' });
    }
    
    // Check if position already exists
    const existingPosition = await PositionHistory.findOne({ positionId, chainId });
    
    if (existingPosition) {
      // Update existing position
      const updatedPosition = await PositionHistory.findOneAndUpdate(
        { positionId, chainId },
        { 
          ...req.body,
          lastRefreshed: Date.now()
        },
        { new: true }
      );
      
      return res.json(updatedPosition);
    }
    
    // Create new position
    const newPosition = new PositionHistory({
      ...req.body,
      timestamp: Date.now(),
      lastRefreshed: Date.now()
    });
    
    await newPosition.save();
    res.status(201).json(newPosition);
  } catch (error) {
    console.error('Error saving position history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a position history entry
router.delete('/:chainId/:positionId', async (req, res) => {
  try {
    const { chainId, positionId } = req.params;
    
    const deletedPosition = await PositionHistory.findOneAndDelete({ positionId, chainId });
    
    if (!deletedPosition) {
      return res.status(404).json({ message: 'Position not found' });
    }
    
    res.json({ message: 'Position deleted', position: deletedPosition });
  } catch (error) {
    console.error('Error deleting position:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete all position history entries
router.delete('/', async (req, res) => {
  try {
    await PositionHistory.deleteMany({});
    res.json({ message: 'All position history entries deleted' });
  } catch (error) {
    console.error('Error deleting all positions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = { positionHistoryRoutes: router };
