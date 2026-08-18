// ========================================
// DAY TRADER MODE - TECHNICAL ANALYSIS
// Fast trading based on chart patterns and indicators
// ========================================

const { db } = require('../config/database');
const trading212 = require('./trading212Service');
const notificationService = require('./notificationService');
const positionService = require('./positionService');
const { RSI, MACD, EMA, ATR } = require('technicalindicators');

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
  // Scanning
  SCAN_INTERVAL_MS: 900000,        // 15 minutes (in production)
  STOCKS_TO_SCAN: 50,              // How many stocks to check each scan
  
  // Signal thresholds
  RSI_OVERSOLD: 30,                // RSI < 30 = oversold (potential buy)
  RSI_OVERBOUGHT: 70,              // RSI > 70 = overbought (potential sell)
  MIN_VOLUME_INCREASE: 1.5,        // Volume must be 1.5x average
  
  // Risk management
  MAX_POSITION_SIZE: 5000,         // Max NOK per position
  STOP_LOSS_PERCENT: 3,            // Exit if down 3%
  TAKE_PROFIT_PERCENT: 5,          // Exit if up 5%
  APPROVAL_THRESHOLD: 300,         // Ask approval for trades > 300 NOK
  
  // Position limits
  MAX_POSITIONS: 10,               // Don't hold more than 10 stocks at once
  MIN_PROFIT_TARGET: 2,            // Minimum 2% profit target
  
  // Technical settings
  RSI_PERIOD: 14,
  MACD_FAST: 12,
  MACD_SLOW: 26,
  MACD_SIGNAL: 9,
  EMA_PERIODS: [10, 20, 50]
};

// Popular stocks to scan (high volume, liquid)
const SCAN_LIST = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
  'NVDA', 'META', 'NFLX', 'AMD', 'INTC',
  'BA', 'DIS', 'PYPL', 'UBER', 'COIN',
  'SPY', 'QQQ', 'IWM'  // ETFs
];

// ========================================
// TICKER MAPPING (same as Warren Mode)
// ========================================

function getFullTicker(ticker) {
  const upperTicker = ticker.toUpperCase();
  // Most US stocks follow this pattern
  return `${upperTicker}_US_EQ`;
}

// ========================================
// TECHNICAL INDICATOR CALCULATIONS
// ========================================

/**
 * Calculate RSI (Relative Strength Index)
 * Shows if stock is oversold (< 30) or overbought (> 70)
 * @param {Array<number>} prices - Array of closing prices
 * @returns {number} Current RSI value
 */
function calculateRSI(prices) {
  if (prices.length < CONFIG.RSI_PERIOD + 1) return null;
  
  const rsiInput = {
    values: prices,
    period: CONFIG.RSI_PERIOD
  };
  
  const rsiValues = RSI.calculate(rsiInput);
  return rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * Shows momentum and trend direction
 * @param {Array<number>} prices - Array of closing prices
 * @returns {Object} MACD values {macd, signal, histogram}
 */
function calculateMACD(prices) {
  if (prices.length < CONFIG.MACD_SLOW + CONFIG.MACD_SIGNAL) return null;
  
  const macdInput = {
    values: prices,
    fastPeriod: CONFIG.MACD_FAST,
    slowPeriod: CONFIG.MACD_SLOW,
    signalPeriod: CONFIG.MACD_SIGNAL,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  };
  
  const macdValues = MACD.calculate(macdInput);
  return macdValues.length > 0 ? macdValues[macdValues.length - 1] : null;
}

/**
 * Calculate EMA (Exponential Moving Average)
 * Shows trend direction
 * @param {Array<number>} prices - Array of closing prices
 * @param {number} period - EMA period
 * @returns {number} Current EMA value
 */
function calculateEMAValue(prices, period) {
  if (prices.length < period) return null;
  
  const emaInput = {
    values: prices,
    period: period
  };
  
  const emaValues = EMA.calculate(emaInput);
  return emaValues.length > 0 ? emaValues[emaValues.length - 1] : null;
}

// ========================================
// SIGNAL DETECTION
// Find trading opportunities
// ========================================

/**
 * Analyze a stock and generate buy/sell signals
 * @param {string} ticker - Stock ticker
 * @param {Array<number>} prices - Historical prices (last 50+ days)
 * @param {number} currentPrice - Current price
 * @param {Array<number>} volumes - Historical volumes
 * @returns {Object} Signal analysis
 */
function analyzeSignals(ticker, prices, currentPrice, volumes) {
  const signals = {
    ticker,
    action: 'HOLD',
    confidence: 0,
    reasons: [],
    indicators: {}
  };
  
  // Calculate indicators
  const rsi = calculateRSI(prices);
  const macd = calculateMACD(prices);
  const ema10 = calculateEMAValue(prices, 10);
  const ema20 = calculateEMAValue(prices, 20);
  
  if (!rsi || !macd || !ema10 || !ema20) {
    signals.reasons.push('Insufficient data for analysis');
    return signals;
  }
  
  signals.indicators = { rsi, macd: macd.MACD, signal: macd.signal, ema10, ema20 };
  
  // ========================================
  // BUY SIGNALS
  // ========================================
  
  let buyScore = 0;
  
  // Signal 1: RSI Oversold
  if (rsi < CONFIG.RSI_OVERSOLD) {
    buyScore += 3;
    signals.reasons.push(`RSI oversold (${rsi.toFixed(1)} < ${CONFIG.RSI_OVERSOLD})`);
  }
  
  // Signal 2: MACD Bullish Crossover
  if (macd.MACD > macd.signal && macd.histogram > 0) {
    buyScore += 2;
    signals.reasons.push('MACD bullish crossover');
  }
  
  // Signal 3: Price above EMA10
  if (currentPrice > ema10) {
    buyScore += 1;
    signals.reasons.push('Price above EMA10 (uptrend)');
  }
  
  // Signal 4: EMA10 above EMA20 (golden cross)
  if (ema10 > ema20) {
    buyScore += 2;
    signals.reasons.push('EMA10 > EMA20 (golden cross)');
  }
  
  // Signal 5: Volume spike
  if (volumes && volumes.length > 20) {
    const avgVolume = volumes.slice(-20, -1).reduce((a, b) => a + b, 0) / 19;
    const currentVolume = volumes[volumes.length - 1];
    
    if (currentVolume > avgVolume * CONFIG.MIN_VOLUME_INCREASE) {
      buyScore += 1;
      signals.reasons.push('Volume spike detected');
    }
  }
  
  // ========================================
  // SELL SIGNALS
  // ========================================
  
  let sellScore = 0;
  
  // Signal 1: RSI Overbought
  if (rsi > CONFIG.RSI_OVERBOUGHT) {
    sellScore += 3;
    signals.reasons.push(`RSI overbought (${rsi.toFixed(1)} > ${CONFIG.RSI_OVERBOUGHT})`);
  }
  
  // Signal 2: MACD Bearish Crossover
  if (macd.MACD < macd.signal && macd.histogram < 0) {
    sellScore += 2;
    signals.reasons.push('MACD bearish crossover');
  }
  
  // Signal 3: Price below EMA10
  if (currentPrice < ema10) {
    sellScore += 1;
    signals.reasons.push('Price below EMA10 (downtrend)');
  }
  
  // Signal 4: EMA10 below EMA20 (death cross)
  if (ema10 < ema20) {
    sellScore += 2;
    signals.reasons.push('EMA10 < EMA20 (death cross)');
  }
  
  // ========================================
  // DECISION
  // ========================================
  
  if (buyScore >= 4) {
    signals.action = 'BUY';
    signals.confidence = Math.min(buyScore * 10, 100);
  } else if (sellScore >= 4) {
    signals.action = 'SELL';
    signals.confidence = Math.min(sellScore * 10, 100);
  }
  
  return signals;
}

// ========================================
// POSITION MANAGEMENT
// ========================================

/**
 * Check if we should exit a position (stop loss or take profit)
 * @param {Object} position - Current position
 * @returns {Object} Exit decision
 */
function checkExitConditions(position) {
  const profitPercent = ((position.current_price - position.avg_price) / position.avg_price) * 100;
  
  // Stop loss hit
  if (profitPercent <= -CONFIG.STOP_LOSS_PERCENT) {
    return {
      shouldExit: true,
      reason: `Stop loss hit (${profitPercent.toFixed(1)}%)`,
      urgency: 'high'
    };
  }
  
  // Take profit hit
  if (profitPercent >= CONFIG.TAKE_PROFIT_PERCENT) {
    return {
      shouldExit: true,
      reason: `Take profit target (${profitPercent.toFixed(1)}%)`,
      urgency: 'normal'
    };
  }
  
  return {
    shouldExit: false,
    reason: `Position healthy (${profitPercent.toFixed(1)}%)`,
    urgency: 'none'
  };
}

/**
 * Get current Day Trader positions
 */
async function getCurrentPositions() {
  const stmt = db.prepare(`
    SELECT * FROM positions 
    WHERE mode = 'daytrader'
  `);
  return stmt.all();
}

/**
 * Get available budget for Day Trader
 */
async function getAvailableBudget() {
  const { getSetting } = require('../config/database');
  const totalBalance = parseFloat(getSetting('total_balance'));
  const allocation = parseFloat(getSetting('daytrader_allocation'));
  const budget = totalBalance * (allocation / 100);
  
  // Subtract used budget
  const stmt = db.prepare(`
    SELECT SUM(current_value) as used
    FROM positions
    WHERE mode = 'daytrader'
  `);
  
  const result = stmt.get();
  const used = result.used || 0;
  
  return budget - used;
}

// ========================================
// APPROVAL SYSTEM
// ========================================

/**
 * Create a pending approval for user
 * @param {string} ticker - Stock ticker
 * @param {string} action - BUY or SELL
 * @param {number} shares - Number of shares
 * @param {number} price - Price per share
 * @param {string} reason - Why this trade
 */
function createApproval(ticker, action, shares, price, reason) {
  const total = shares * price;
  
  const stmt = db.prepare(`
    INSERT INTO pending_approvals (ticker, action, shares, price, total, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(ticker, action, shares, price, total, reason);
  
  console.log(`📋 Created approval request for ${action} ${shares} shares of ${ticker} (${total} NOK)`);
  
  return result.lastInsertRowid;
}

/**
 * Execute a trade (with approval check)
 * @param {string} ticker - Stock ticker
 * @param {string} action - BUY or SELL
 * @param {number} shares - Number of shares
 * @param {number} price - Price per share
 * @param {string} reason - Why this trade
 * @returns {Promise<Object>} Trade result
 */
async function executeTrade(ticker, action, shares, price, reason) {
  const total = shares * price;
  
  // Check if needs approval
  const { getSetting } = require('../config/database');
  const threshold = parseFloat(getSetting('approval_threshold'));
  
  if (total > threshold) {
    // Create approval request
    const approvalId = createApproval(ticker, action, shares, price, reason);

    // sendTradeApproval builds the Approve/Reject buttons using these
    // exact fields - it expects an 'id', not 'approvalId'
    await notificationService.sendTradeApproval({
      id: approvalId,
      ticker,
      action,
      shares,
      total,
      reason
    });

    return {
      success: true,
      needsApproval: true,
      approvalId,
      message: `Trade requires approval (${total} NOK > ${threshold} NOK threshold)`
    };
  }
  
  // Execute immediately (under threshold)
  console.log(`\n⚡ Day Trader: ${action} ${shares} shares of ${ticker}`);
  console.log(`   Reason: ${reason}`);
  console.log(`   Total: ${total} NOK (auto-executed, under ${threshold} threshold)`);
  
  try {
    const fullTicker = getFullTicker(ticker);
    const order = await trading212.placeMarketOrder(fullTicker, shares, action);
    
    // Record in database
    const tradeStmt = db.prepare(`
      INSERT INTO trades (ticker, mode, action, shares, price, total, reason)
      VALUES (?, 'daytrader', ?, ?, ?, ?, ?)
    `);
    
    tradeStmt.run(ticker, action, shares, price, total, reason);
    
    // Keep the positions table in sync with what actually happened -
    // this is what lets scanMarkets() correctly check exit conditions
    // and enforce MAX_POSITIONS on the next scan
    await positionService.recordTrade(ticker, 'daytrader', action, shares, price);
    
    const result = {
      success: true,
      needsApproval: false,
      executed: true,
      ticker,
      action,
      shares,
      price,
      total
    };

    await notificationService.sendTradeExecuted(result);

    return result;
    
  } catch (error) {
    console.error(`❌ Failed to execute ${action}:`, error);
    const result = {
      success: false,
      error: error.message,
      ticker,
      action
    };

    await notificationService.sendTradeExecuted(result);

    return result;
  }
}

// ========================================
// MAIN SCAN FUNCTION
// ========================================

/**
 * Scan markets for trading opportunities
 * This runs every 15 minutes
 */
async function scanMarkets() {
  console.log('\n========================================');
  console.log('⚡ Day Trader: Starting market scan');
  console.log('========================================\n');
  
  const results = {
    scanned: 0,
    signals: [],
    trades: [],
    approvals: []
  };
  
  try {
    // Check if bot is paused
    const { getSetting } = require('../config/database');
    const botPaused = getSetting('bot_paused') === 'true';
    const daytraderPaused = getSetting('daytrader_paused') === 'true';
    
    if (botPaused || daytraderPaused) {
      console.log('⏸️  Day Trader Mode is PAUSED - skipping scan');
      results.paused = true;
      return results;
    }
    // Check current positions first
    const positions = await getCurrentPositions();
    console.log(`📊 Current positions: ${positions.length}`);
    
    // Check exit conditions for existing positions
    for (const position of positions) {
      const exit = checkExitConditions(position);
      if (exit.shouldExit) {
        console.log(`\n🚪 Exit signal for ${position.ticker}: ${exit.reason}`);
        
        const trade = await executeTrade(
          position.ticker,
          'SELL',
          position.shares,
          position.current_price,
          exit.reason
        );
        
        if (trade.needsApproval) {
          results.approvals.push(trade);
        } else if (trade.executed) {
          results.trades.push(trade);
        }
      }
    }
    
    // Don't scan for new positions if we're at max
    if (positions.length >= CONFIG.MAX_POSITIONS) {
      console.log(`\n⚠️  At maximum positions (${CONFIG.MAX_POSITIONS}). Not scanning for new trades.`);
      return results;
    }
    
    // Scan for new opportunities
    console.log(`\n🔍 Scanning ${SCAN_LIST.length} stocks for entry signals...\n`);
    
    // NOTE: In production, you'd fetch real historical data from Trading212
    // For now, this is a placeholder - Day Trader needs price history to work
    console.log('⚠️  Note: Day Trader needs historical price data to calculate indicators.');
    console.log('   This would come from Trading212 API or another data source.');
    
    results.scanned = SCAN_LIST.length;
    
    console.log('\n========================================');
    console.log('⚡ Day Trader: Scan complete');
    console.log(`   Scanned: ${results.scanned} stocks`);
    console.log(`   Signals found: ${results.signals.length}`);
    console.log(`   Trades executed: ${results.trades.length}`);
    console.log(`   Approvals created: ${results.approvals.length}`);
    console.log('========================================\n');
    
    return results;
    
  } catch (error) {
    console.error('❌ Error during market scan:', error);
    throw error;
  }
}

// ========================================
// EXPORT
// ========================================

module.exports = {
  scanMarkets,
  analyzeSignals,
  checkExitConditions,
  getCurrentPositions,
  getAvailableBudget,
  executeTrade,
  CONFIG
};