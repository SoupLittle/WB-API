// ========================================
// TRADES ROUTES
// API endpoints for viewing trade history
// ========================================

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// ========================================
// GET /api/trades
// Returns all trades (complete history)
// ========================================
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM trades 
      ORDER BY executed_at DESC
    `);
    const trades = stmt.all();
    
    res.json(trades);
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// ========================================
// GET /api/trades/warren
// Returns only Warren Mode trades
// ========================================
router.get('/warren', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM trades 
      WHERE mode = 'warren'
      ORDER BY executed_at DESC
    `);
    const trades = stmt.all();
    
    res.json(trades);
  } catch (error) {
    console.error('Error fetching Warren trades:', error);
    res.status(500).json({ error: 'Failed to fetch Warren trades' });
  }
});

// ========================================
// GET /api/trades/daytrader
// Returns only Day Trader Mode trades
// ========================================
router.get('/daytrader', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM trades 
      WHERE mode = 'daytrader'
      ORDER BY executed_at DESC
    `);
    const trades = stmt.all();
    
    res.json(trades);
  } catch (error) {
    console.error('Error fetching Day Trader trades:', error);
    res.status(500).json({ error: 'Failed to fetch Day Trader trades' });
  }
});

// ========================================
// GET /api/trades/:ticker
// Get all trades for a specific stock ticker
// ========================================
router.get('/:ticker', (req, res) => {
  try {
    const { ticker } = req.params;
    const stmt = db.prepare(`
      SELECT * FROM trades 
      WHERE ticker = ?
      ORDER BY executed_at DESC
    `);
    const trades = stmt.all(ticker.toUpperCase());
    
    res.json(trades);
  } catch (error) {
    console.error('Error fetching trades for ticker:', error);
    res.status(500).json({ error: 'Failed to fetch trades for ticker' });
  }
});

module.exports = router;