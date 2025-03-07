const express = require('express');
const router = express.Router();
const Cache = require('../models/Cache');

/**
 * @route   GET /api/cache/:key
 * @desc    Get cache by key
 * @access  Public
 */
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const now = new Date();
    
    const cache = await Cache.findOne({ 
      key,
      expiresAt: { $gt: now } 
    });
    
    if (!cache) {
      return res.status(404).json({ message: 'Cache not found or expired' });
    }
    
    res.json(cache.value);
  } catch (error) {
    console.error('Error retrieving cache:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/cache
 * @desc    Store cache
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { key, value, ttl = 3600 } = req.body; // Default TTL: 1 hour
    
    if (!key || value === undefined) {
      return res.status(400).json({ message: 'Key and value are required' });
    }
    
    // Calculate expiry time
    const expiresAt = new Date(Date.now() + ttl * 1000);
    
    // Upsert: update if exists, insert if not
    const result = await Cache.findOneAndUpdate(
      { key },
      { key, value, expiresAt },
      { upsert: true, new: true }
    );
    
    res.status(201).json({ message: 'Cache stored successfully', key });
  } catch (error) {
    console.error('Error storing cache:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/cache/:key
 * @desc    Delete cache by key
 * @access  Public
 */
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await Cache.deleteOne({ key });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Cache not found' });
    }
    
    res.json({ message: 'Cache deleted successfully' });
  } catch (error) {
    console.error('Error deleting cache:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/cache
 * @desc    Delete all expired cache
 * @access  Public
 */
router.delete('/', async (req, res) => {
  try {
    const now = new Date();
    const result = await Cache.deleteMany({ expiresAt: { $lt: now } });
    
    res.json({ 
      message: 'Expired cache cleaned successfully', 
      count: result.deletedCount 
    });
  } catch (error) {
    console.error('Error cleaning cache:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
