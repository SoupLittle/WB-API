// ========================================
// WATCHLIST ROUTES
// API endpoints for managing Warren Mode's watchlist
// ========================================

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// ========================================
// GET /api/watchlist
// Returns all stocks in Warren's watchlist
// ========================================
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM watchlist 
      ORDER BY ticker ASC
    `);
    const watchlist = stmt.all();
    
    res.json(watchlist);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// ========================================
// POST /api/watchlist
// Add a new stock to the watchlist
// Body: { ticker, name, pe_ratio, debt_to_equity, roe, intrinsic_value, current_price }
// ========================================
router.post('/', (req, res) => {
  try {
    const {
      ticker,
      name,
      pe_ratio,
      debt_to_equity,
      roe,
      intrinsic_value,
      current_price
    } = req.body;
    
    // Validation: ticker is required
    if (!ticker) {
      return res.status(400).json({ error: 'Ticker is required' });
    }
    
    // Calculate recommendation based on intrinsic value vs current price
    let recommendation = 'HOLD - Fairly priced';
    if (intrinsic_value && current_price) {
      const discount = ((intrinsic_value - current_price) / intrinsic_value * 100).toFixed(0);
      if (discount > 5) {
        recommendation = `BUY - Undervalued by ${discount}%`;
      } else if (discount < -5) {
        recommendation = `SELL - Overvalued by ${Math.abs(discount)}%`;
      }
    }
    
    const stmt = db.prepare(`
      INSERT INTO watchlist (
        ticker, name, pe_ratio, debt_to_equity, roe, 
        intrinsic_value, current_price, recommendation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      ticker.toUpperCase(),
      name,
      pe_ratio,
      debt_to_equity,
      roe,
      intrinsic_value,
      current_price,
      recommendation
    );
    
    console.log(`✅ Added ${ticker} to watchlist`);
    
    res.status(201).json({
      success: true,
      message: 'Stock added to watchlist',
      id: result.lastInsertRowid,
      ticker: ticker.toUpperCase()
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Stock already in watchlist' });
    }
    console.error('Error adding to watchlist:', error);
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

// ========================================
// PUT /api/watchlist/:ticker
// Update stock fundamental data
// Body: { pe_ratio, debt_to_equity, roe, intrinsic_value, current_price }
// ========================================
router.put('/:ticker', (req, res) => {
  try {
    const { ticker } = req.params;
    const {
      pe_ratio,
      debt_to_equity,
      roe,
      intrinsic_value,
      current_price
    } = req.body;
    
    // Calculate new recommendation
    let recommendation = 'HOLD - Fairly priced';
    if (intrinsic_value && current_price) {
      const discount = ((intrinsic_value - current_price) / intrinsic_value * 100).toFixed(0);
      if (discount > 5) {
        recommendation = `BUY - Undervalued by ${discount}%`;
      } else if (discount < -5) {
        recommendation = `SELL - Overvalued by ${Math.abs(discount)}%`;
      }
    }
    
    const stmt = db.prepare(`
      UPDATE watchlist 
      SET pe_ratio = ?, 
          debt_to_equity = ?, 
          roe = ?, 
          intrinsic_value = ?, 
          current_price = ?,
          recommendation = ?,
          last_updated = CURRENT_TIMESTAMP
      WHERE ticker = ?
    `);
    
    const result = stmt.run(
      pe_ratio,
      debt_to_equity,
      roe,
      intrinsic_value,
      current_price,
      recommendation,
      ticker.toUpperCase()
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Stock not found in watchlist' });
    }
    
    console.log(`✅ Updated ${ticker} in watchlist`);
    
    res.json({
      success: true,
      message: 'Stock updated successfully',
      ticker: ticker.toUpperCase()
    });
  } catch (error) {
    console.error('Error updating watchlist:', error);
    res.status(500).json({ error: 'Failed to update watchlist' });
  }
});

// ========================================
// DELETE /api/watchlist/:ticker
// Remove a stock from the watchlist
// ========================================
router.delete('/:ticker', (req, res) => {
  try {
    const { ticker } = req.params;
    
    const stmt = db.prepare('DELETE FROM watchlist WHERE ticker = ?');
    const result = stmt.run(ticker.toUpperCase());
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Stock not found in watchlist' });
    }
    
    console.log(`✅ Removed ${ticker} from watchlist`);
    
    res.json({
      success: true,
      message: 'Stock removed from watchlist',
      ticker: ticker.toUpperCase()
    });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

// ========================================
// GET /api/watchlist/:ticker
// Get details for a specific stock in watchlist
// ========================================
router.get('/:ticker', (req, res) => {
  try {
    const { ticker } = req.params;
    const stmt = db.prepare('SELECT * FROM watchlist WHERE ticker = ?');
    const stock = stmt.get(ticker.toUpperCase());
    
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found in watchlist' });
    }
    
    res.json(stock);
  } catch (error) {
    console.error('Error fetching stock from watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

module.exports = router;