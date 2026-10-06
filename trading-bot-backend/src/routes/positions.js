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
// GET /api/positions/pending
// Returns real pending (not-yet-filled) orders, straight from Trading212.
// This is what makes a placed-but-unfilled order visible on the GUI,
// instead of it just looking like nothing happened until it fills.
//
// NOTE: this list isn't currently split by mode (warren/daytrader) -
// Trading212 itself has no concept of our bot's internal modes. Right
// now that's fine since Day Trader's buy-side isn't live yet, so every
// pending order is effectively a Warren Mode order. If Day Trader's
// entry logic gets built later, this would need order_id tracking in
// the trades table to correctly attribute each pending order to a mode.
// ========================================
router.get('/pending', async (req, res) => {
  try {
    const trading212 = require('../services/trading212Service');
    const orders = await trading212.getOpenOrders();

    const formatted = (orders || []).map(order => {
      const fullTicker = order.ticker || order.instrument?.ticker || '';
      return {
        id: order.id,
        ticker: fullTicker.replace(/_.*$/, ''), // 'F_US_EQ' -> 'F'
        fullTicker,
        name: order.instrument?.name || null,
        side: order.side,
        quantity: order.quantity,
        filledQuantity: order.filledQuantity || 0,
        status: order.status,
        createdAt: order.createdAt
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    res.status(500).json({ error: 'Failed to fetch pending orders' });
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