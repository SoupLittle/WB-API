// ========================================
// APPROVALS ROUTES
// API endpoints for Day Trader trade approvals
// ========================================

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const trading212 = require('../services/trading212Service');
const positionService = require('../services/positionService');
const notificationService = require('../services/notificationService');

// Trading212 needs the full instrument ticker (e.g. AAPL_US_EQ), not just
// the short symbol stored in our database
function getFullTicker(ticker) {
  return `${ticker.toUpperCase()}_US_EQ`;
}

// ========================================
// GET /api/approvals/pending
// Returns all pending trade approvals
// ========================================
router.get('/pending', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM pending_approvals 
      ORDER BY created_at DESC
    `);
    const approvals = stmt.all();
    
    res.json(approvals);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

// ========================================
// POST /api/approvals/:id/approve
// Approve a pending trade
// ========================================
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the pending approval
    const getStmt = db.prepare('SELECT * FROM pending_approvals WHERE id = ?');
    const approval = getStmt.get(id);
    
    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found' });
    }
    
    console.log(`✅ Trade approved: ${approval.action} ${approval.shares} shares of ${approval.ticker}`);
    
    // Actually place the order with Trading212 - previously this just
    // logged a success message and wrote a fake trades row without
    // ever touching the broker
    const fullTicker = getFullTicker(approval.ticker);
    await trading212.placeMarketOrder(fullTicker, approval.shares, approval.action);
    
    // Insert into trades table
    const tradeStmt = db.prepare(`
      INSERT INTO trades (ticker, mode, action, shares, price, total, reason)
      VALUES (?, 'daytrader', ?, ?, ?, ?, ?)
    `);
    
    tradeStmt.run(
      approval.ticker,
      approval.action,
      approval.shares,
      approval.price,
      approval.total,
      approval.reason
    );

    // Keep the positions table in sync, same as the auto-executed path
    await positionService.recordTrade(
      approval.ticker,
      'daytrader',
      approval.action,
      approval.shares,
      approval.price
    );

    await notificationService.sendTradeExecuted({
      success: true,
      ticker: approval.ticker,
      action: approval.action,
      shares: approval.shares,
      price: approval.price,
      total: approval.total
    });
    
    // Remove from pending_approvals
    const deleteStmt = db.prepare('DELETE FROM pending_approvals WHERE id = ?');
    deleteStmt.run(id);
    
    res.json({
      success: true,
      message: 'Trade approved and executed',
      trade: {
        ticker: approval.ticker,
        action: approval.action,
        shares: approval.shares,
        total: approval.total
      }
    });
  } catch (error) {
    console.error('Error approving trade:', error);
    // Note: if placeMarketOrder failed, the approval is deliberately left
    // in pending_approvals rather than deleted - so a failed order doesn't
    // silently vanish, and you can retry or reject it explicitly
    res.status(500).json({ error: 'Failed to approve trade' });
  }
});

// ========================================
// POST /api/approvals/:id/reject
// Reject a pending trade
// ========================================
router.post('/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the pending approval
    const getStmt = db.prepare('SELECT * FROM pending_approvals WHERE id = ?');
    const approval = getStmt.get(id);
    
    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found' });
    }
    
    console.log(`❌ Trade rejected: ${approval.action} ${approval.shares} shares of ${approval.ticker}`);
    
    // Remove from pending_approvals
    const deleteStmt = db.prepare('DELETE FROM pending_approvals WHERE id = ?');
    deleteStmt.run(id);
    
    res.json({
      success: true,
      message: 'Trade rejected',
      trade: {
        ticker: approval.ticker,
        action: approval.action,
        shares: approval.shares
      }
    });
  } catch (error) {
    console.error('Error rejecting trade:', error);
    res.status(500).json({ error: 'Failed to reject trade' });
  }
});

module.exports = router;