// ========================================
// MAIN SERVER FILE
// Entry point for the trading bot backend
// ========================================

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

// Import database and initialize it
const { initializeDatabase, getAllSettings } = require('./config/database');

// Initialize database on startup
initializeDatabase();

// ========================================
// EXPRESS APP SETUP
// ========================================
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Allow frontend to connect from different port
app.use(express.json()); // Parse JSON request bodies

// ========================================
// IMPORT ROUTES
// ========================================
const positionsRoutes = require('./routes/positions');
const tradesRoutes = require('./routes/trades');
const watchlistRoutes = require('./routes/watchlist');
const settingsRoutes = require('./routes/settings');
const approvalsRoutes = require('./routes/approvals');
const warrenRoutes = require('./routes/warren');
const dayTraderRoutes = require('./routes/daytrader');

// Also import the services directly (not just their routes) so the
// cron jobs below can call scanWatchlist() / scanMarkets() on a schedule
const warrenMode = require('./services/warrenMode');
const dayTraderMode = require('./services/dayTraderMode');
const positionService = require('./services/positionService');

// ========================================
// REGISTER ROUTES
// All API endpoints will be under /api/...
// ========================================
app.use('/api/positions', positionsRoutes);
app.use('/api/trades', tradesRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/warren', warrenRoutes);
app.use('/api/daytrader', dayTraderRoutes);

// ========================================
// ROOT ENDPOINT
// Health check - confirms server is running
// ========================================
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Trading Bot Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ========================================
// STATUS ENDPOINT
// Returns bot status, balance, and performance
// ========================================
app.get('/api/status', (req, res) => {
  try {
    const settings = getAllSettings();
    
    res.json({
      status: 'active',
      mode: process.env.TRADING212_MODE,
      balance: {
        total: parseFloat(settings.total_balance),
        warren_allocation: parseFloat(settings.warren_allocation),
        daytrader_allocation: parseFloat(settings.daytrader_allocation)
      },
      settings: {
        approval_threshold: parseFloat(settings.approval_threshold)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// ========================================
// SCHEDULED TASKS (CRON JOBS)
// These run automatically at set intervals
// ========================================

// WARREN MODE: Daily scan at 9:00 AM
// Checks watchlist for undervalued stocks
cron.schedule('0 9 * * *', async () => {
  console.log('⏰ [CRON] Running Warren Mode daily scan...');
  try {
    await warrenMode.scanWatchlist();
  } catch (error) {
    // node-cron doesn't catch errors from async callbacks for us -
    // without this try/catch, a failed scan would fail silently
    console.error('❌ [CRON] Warren Mode scan failed:', error);
  }
});

// DAY TRADER MODE: Scan every 15 minutes during market hours
// Monday-Friday, 9 AM - 4 PM
cron.schedule('*/15 9-16 * * 1-5', async () => {
  console.log('⏰ [CRON] Running Day Trader market scan...');
  try {
    await dayTraderMode.scanMarkets();
  } catch (error) {
    console.error('❌ [CRON] Day Trader scan failed:', error);
  }
});

// POSITION UPDATER: Update all position values every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('⏰ [CRON] Updating position values...');
  try {
    await positionService.updateAllPositions();
  } catch (error) {
    console.error('❌ [CRON] Position update failed:', error);
  }
});

// ========================================
// ERROR HANDLING MIDDLEWARE
// Catches any unhandled errors in routes
// ========================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🚀 Trading Bot Backend Server Started');
  console.log('========================================');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
  console.log(`💰 Trading212 Mode: ${process.env.TRADING212_MODE}`);
  console.log(`📊 API Documentation: http://localhost:${PORT}/api/status`);
  console.log('========================================\n');
  
  // Display current settings
  const settings = getAllSettings();
  console.log('⚙️  Current Settings:');
  console.log(`   Warren Allocation: ${settings.warren_allocation}%`);
  console.log(`   Day Trader Allocation: ${settings.daytrader_allocation}%`);
  console.log(`   Approval Threshold: ${settings.approval_threshold} NOK`);
  console.log(`   Total Balance: ${settings.total_balance} NOK`);
  console.log('\n✅ Bot is ready to trade!\n');
});

// ========================================
// GRACEFUL SHUTDOWN
// Properly close database when server stops
// ========================================
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  // Close database connection
  require('./config/database').db.close();
  console.log('✅ Database connection closed');
  process.exit(0);
});