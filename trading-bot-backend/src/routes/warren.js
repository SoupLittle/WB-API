// ========================================
// WARREN MODE ROUTES
// API endpoints for Warren Mode controls
// ========================================

const express = require('express');
const router = express.Router();
const warrenMode = require('../services/warrenMode');

// ========================================
// POST /api/warren/scan
// Manually trigger a watchlist scan
// ========================================
router.post('/scan', async (req, res) => {
  try {
    console.log('\n🚀 Manual Warren Mode scan triggered via API\n');
    
    const results = await warrenMode.scanWatchlist();
    
    res.json({
      success: true,
      message: 'Watchlist scan completed',
      results: {
        scanned: results.scanned,
        opportunities: results.opportunities,
        trades_executed: results.trades.length,
        trades: results.trades
      }
    });
  } catch (error) {
    console.error('Error running Warren scan:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// GET /api/warren/status
// Get Warren Mode status and stats
// ========================================
router.get('/status', async (req, res) => {
  try {
    const budget = await warrenMode.getWarrenBudget();
    const available = await warrenMode.getAvailableBudget();
    
    res.json({
      budget_total: budget,
      budget_available: available,
      budget_used: budget - available,
      config: warrenMode.CONFIG
    });
  } catch (error) {
    console.error('Error fetching Warren status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// POST /api/warren/evaluate/:ticker
// Evaluate a specific stock without buying
// ========================================
router.post('/evaluate/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { db } = require('../config/database');
    
    // Get stock from watchlist
    const stmt = db.prepare('SELECT * FROM watchlist WHERE ticker = ?');
    const stock = stmt.get(ticker.toUpperCase());
    
    if (!stock) {
      return res.status(404).json({ error: 'Stock not in watchlist' });
    }
    
    // Evaluate
    const evaluation = await warrenMode.evaluateBuyOpportunity(stock);
    const quality = warrenMode.assessQuality(stock);
    
    res.json({
      ticker: stock.ticker,
      name: stock.name,
      current_price: stock.current_price,
      intrinsic_value: stock.intrinsic_value,
      evaluation,
      quality_assessment: quality
    });
  } catch (error) {
    console.error('Error evaluating stock:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;