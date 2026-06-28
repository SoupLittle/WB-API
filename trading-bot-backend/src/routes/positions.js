// ========================================
// POSITIONS ROUTES
// API endpoints for viewing current stock positions
// ========================================

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// ========================================
// GET /api/positions
// Returns all current positions (both Warren and Day Trader)
// ========================================
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM positions 
      ORDER BY opened_at DESC
    `);
    const positions = stmt.all();
    
    res.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// ========================================
// GET /api/positions/warren
// Returns only Warren Mode positions
// ========================================
router.get('/warren', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM positions 
      WHERE mode = 'warren'
      ORDER BY opened_at DESC
    `);
    const positions = stmt.all();
    
    res.json(positions);
  } catch (error) {
    console.error('Error fetching Warren positions:', error);
    res.status(500).json({ error: 'Failed to fetch Warren positions' });
  }
});

// ========================================
// GET /api/positions/daytrader
// Returns only Day Trader Mode positions
// ========================================
router.get('/daytrader', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM positions 
      WHERE mode = 'daytrader'
      ORDER BY opened_at DESC
    `);
    const positions = stmt.all();
    
    res.json(positions);
  } catch (error) {
    console.error('Error fetching Day Trader positions:', error);
    res.status(500).json({ error: 'Failed to fetch Day Trader positions' });
  }
});

// ========================================
// GET /api/positions/:id
// Get a specific position by ID
// ========================================
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('SELECT * FROM positions WHERE id = ?');
    const position = stmt.get(id);
    
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    res.json(position);
  } catch (error) {
    console.error('Error fetching position:', error);
    res.status(500).json({ error: 'Failed to fetch position' });
  }
});

module.exports = router;