// ========================================
// SETTINGS ROUTES
// API endpoints for managing bot settings
// ========================================

const express = require('express');
const router = express.Router();
const { db, getSetting, updateSetting, getAllSettings } = require('../config/database');

// ========================================
// GET /api/settings
// Returns all current settings
// ========================================
router.get('/', (req, res) => {
  try {
    const settings = getAllSettings();
    
    // Convert string values to numbers where appropriate
    res.json({
      warren_allocation: parseFloat(settings.warren_allocation),
      daytrader_allocation: parseFloat(settings.daytrader_allocation),
      approval_threshold: parseFloat(settings.approval_threshold),
      total_balance: parseFloat(settings.total_balance)
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ========================================
// PUT /api/settings/allocation
// Updates budget allocation split
// Body: { warren: 70, daytrader: 30 }
// ========================================
router.put('/allocation', (req, res) => {
  try {
    const { warren, daytrader } = req.body;
    
    // Validation: Must add up to 100
    if (warren + daytrader !== 100) {
      return res.status(400).json({ 
        error: 'Warren and Day Trader allocations must add up to 100%' 
      });
    }
    
    // Validation: Must be positive numbers
    if (warren < 0 || daytrader < 0) {
      return res.status(400).json({ 
        error: 'Allocations must be positive numbers' 
      });
    }
    
    // Update both allocations
    updateSetting('warren_allocation', warren.toString());
    updateSetting('daytrader_allocation', daytrader.toString());
    
    console.log(`✅ Budget allocation updated: Warren ${warren}%, Day Trader ${daytrader}%`);
    
    res.json({
      success: true,
      message: 'Allocation updated successfully',
      warren_allocation: warren,
      daytrader_allocation: daytrader
    });
  } catch (error) {
    console.error('Error updating allocation:', error);
    res.status(500).json({ error: 'Failed to update allocation' });
  }
});

// ========================================
// PUT /api/settings/threshold
// Updates approval threshold for Day Trader
// Body: { threshold: 500 }
// ========================================
router.put('/threshold', (req, res) => {
  try {
    const { threshold } = req.body;
    
    // Validation: Must be a positive number
    if (threshold < 0) {
      return res.status(400).json({ 
        error: 'Threshold must be a positive number' 
      });
    }
    
    updateSetting('approval_threshold', threshold.toString());
    
    console.log(`✅ Approval threshold updated to ${threshold} NOK`);
    
    res.json({
      success: true,
      message: 'Approval threshold updated successfully',
      approval_threshold: threshold
    });
  } catch (error) {
    console.error('Error updating threshold:', error);
    res.status(500).json({ error: 'Failed to update threshold' });
  }
});

// ========================================
// PUT /api/settings/balance
// Updates total balance (for demo mode testing)
// Body: { balance: 150000 }
// ========================================
router.put('/balance', (req, res) => {
  try {
    const { balance } = req.body;
    
    // Validation: Must be a positive number
    if (balance < 0) {
      return res.status(400).json({ 
        error: 'Balance must be a positive number' 
      });
    }
    
    updateSetting('total_balance', balance.toString());
    
    console.log(`✅ Total balance updated to ${balance} NOK`);
    
    res.json({
      success: true,
      message: 'Balance updated successfully',
      total_balance: balance
    });
  } catch (error) {
    console.error('Error updating balance:', error);
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

// ========================================
// POST /api/settings/pause
// Pause all trading (emergency stop)
// Body: { mode: 'all' | 'warren' | 'daytrader' }
// ========================================
router.post('/pause', (req, res) => {
  try {
    const { mode } = req.body;
    
    if (mode === 'all') {
      updateSetting('bot_paused', 'true');
      console.log('⏸️  ALL TRADING PAUSED');
      
      res.json({
        success: true,
        message: 'All trading paused',
        bot_paused: true
      });
    } else if (mode === 'warren') {
      updateSetting('warren_paused', 'true');
      console.log('⏸️  Warren Mode paused');
      
      res.json({
        success: true,
        message: 'Warren Mode paused',
        warren_paused: true
      });
    } else if (mode === 'daytrader') {
      updateSetting('daytrader_paused', 'true');
      console.log('⏸️  Day Trader Mode paused');
      
      res.json({
        success: true,
        message: 'Day Trader Mode paused',
        daytrader_paused: true
      });
    } else {
      return res.status(400).json({ error: 'Invalid mode. Use "all", "warren", or "daytrader"' });
    }
  } catch (error) {
    console.error('Error pausing:', error);
    res.status(500).json({ error: 'Failed to pause' });
  }
});

// ========================================
// POST /api/settings/resume
// Resume trading
// Body: { mode: 'all' | 'warren' | 'daytrader' }
// ========================================
router.post('/resume', (req, res) => {
  try {
    const { mode } = req.body;
    
    if (mode === 'all') {
      updateSetting('bot_paused', 'false');
      updateSetting('warren_paused', 'false');
      updateSetting('daytrader_paused', 'false');
      console.log('▶️  ALL TRADING RESUMED');
      
      res.json({
        success: true,
        message: 'All trading resumed',
        bot_paused: false
      });
    } else if (mode === 'warren') {
      updateSetting('warren_paused', 'false');
      console.log('▶️  Warren Mode resumed');
      
      res.json({
        success: true,
        message: 'Warren Mode resumed',
        warren_paused: false
      });
    } else if (mode === 'daytrader') {
      updateSetting('daytrader_paused', 'false');
      console.log('▶️  Day Trader Mode resumed');
      
      res.json({
        success: true,
        message: 'Day Trader Mode resumed',
        daytrader_paused: false
      });
    } else {
      return res.status(400).json({ error: 'Invalid mode. Use "all", "warren", or "daytrader"' });
    }
  } catch (error) {
    console.error('Error resuming:', error);
    res.status(500).json({ error: 'Failed to resume' });
  }
});

// ========================================
// GET /api/settings/status
// Get pause status
// ========================================
router.get('/status', (req, res) => {
  try {
    const botPaused = getSetting('bot_paused') === 'true';
    const warrenPaused = getSetting('warren_paused') === 'true';
    const daytraderPaused = getSetting('daytrader_paused') === 'true';
    
    res.json({
      bot_paused: botPaused,
      warren_paused: warrenPaused,
      daytrader_paused: daytraderPaused,
      warren_active: !botPaused && !warrenPaused,
      daytrader_active: !botPaused && !daytraderPaused
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

module.exports = router;