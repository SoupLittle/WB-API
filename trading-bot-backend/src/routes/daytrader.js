// ========================================
// DAY TRADER MODE ROUTES
// API endpoints for Day Trader controls
// ========================================

const express = require('express');
const router = express.Router();
const dayTraderMode = require('../services/dayTraderMode');

// ========================================
// POST /api/daytrader/scan
// Manually trigger a market scan
// ========================================
router.post('/scan', async (req, res) => {
  try {
    console.log('\n🚀 Manual Day Trader scan triggered via API\n');
    
    const results = await dayTraderMode.scanMarkets();
    
    res.json({
      success: true,
      message: 'Market scan completed',
      results: {
        scanned: results.scanned,
        signals_found: results.signals.length,
        trades_executed: results.trades.length,
        approvals_created: results.approvals.length,
        signals: results.signals,
        trades: results.trades
      }
    });
  } catch (error) {
    console.error('Error running Day Trader scan:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// GET /api/daytrader/status
// Get Day Trader status and stats
// ========================================
router.get('/status', async (req, res) => {
  try {
    const positions = await dayTraderMode.getCurrentPositions();
    const available = await dayTraderMode.getAvailableBudget();
    
    res.json({
      active: true,
      positions_count: positions.length,
      max_positions: dayTraderMode.CONFIG.MAX_POSITIONS,
      budget_available: available,
      config: {
        approval_threshold: dayTraderMode.CONFIG.APPROVAL_THRESHOLD,
        max_positions: dayTraderMode.CONFIG.MAX_POSITIONS,
        stop_loss: dayTraderMode.CONFIG.STOP_LOSS_PERCENT,
        take_profit: dayTraderMode.CONFIG.TAKE_PROFIT_PERCENT
      }
    });
  } catch (error) {
    console.error('Error fetching Day Trader status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// POST /api/daytrader/analyze/:ticker
// Analyze a specific stock without trading
// ========================================
router.post('/analyze/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { prices, volumes } = req.body;
    
    if (!prices || prices.length < 50) {
      return res.status(400).json({
        error: 'Need at least 50 historical prices for analysis'
      });
    }
    
    const currentPrice = prices[prices.length - 1];
    const signals = dayTraderMode.analyzeSignals(
      ticker,
      prices,
      currentPrice,
      volumes
    );
    
    res.json({
      ticker,
      current_price: currentPrice,
      analysis: signals
    });
  } catch (error) {
    console.error('Error analyzing stock:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;