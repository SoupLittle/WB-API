// ========================================
// WARREN MODE - VALUE INVESTING STRATEGY
// Implements Warren Buffett's long-term value investing approach
// ========================================

const { db } = require('../config/database');
const trading212 = require('./trading212Service');

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
  // Buy signals - STRICTER CRITERIA
  MIN_DISCOUNT_PERCENT: 20,        // Only buy if stock is at least 20% undervalued (bigger safety margin!)
  MAX_SINGLE_PURCHASE: 5000,       // Maximum NOK per purchase (build positions slowly)
  
  // Quality filters (Warren only buys quality companies)
  MIN_ROE: 20,                     // Return on Equity should be > 20% (higher standard!)
  MAX_DEBT_TO_EQUITY: 1.0,        // Debt/Equity ratio should be < 1.0 (more conservative!)
  MIN_PE_RATIO: 10,                // P/E ratio > 10 (avoid penny stocks)
  MAX_PE_RATIO: 30,               // P/E ratio < 30 (avoid overvalued - more strict!)
  
  // Position sizing
  MAX_POSITION_SIZE_PERCENT: 15,  // No single stock > 15% of Warren's budget
  
  // DCF Model parameters
  DISCOUNT_RATE: 0.10,            // 10% discount rate (required return)
  GROWTH_RATE: 0.05,              // Assume 5% perpetual growth
  YEARS_TO_PROJECT: 10            // Project cash flows 10 years out
};

// ========================================
// TICKER MAPPING
// Trading212 uses full instrument codes like AAPL_US_EQ
// This maps short tickers to Trading212 format
// ========================================

const TICKER_MAP = {
  'AAPL': 'AAPL_US_EQ',
  'MSFT': 'MSFT_US_EQ',
  'GOOGL': 'GOOGL_US_EQ',
  'GOOG': 'GOOG_US_EQ',
  'JNJ': 'JNJ_US_EQ',
  'BRK.B': 'BRK.B_US_EQ',
  'JPM': 'JPM_US_EQ',
  'V': 'V_US_EQ',
  'PG': 'PG_US_EQ',
  'MA': 'MA_US_EQ',
  'NVDA': 'NVDA_US_EQ',
  'HD': 'HD_US_EQ',
  'KO': 'KO_US_EQ',
  'PEP': 'PEP_US_EQ',
  'COST': 'COST_US_EQ'
};

/**
 * Convert short ticker to Trading212 format
 * @param {string} ticker - Short ticker (e.g., 'AAPL')
 * @returns {string} Trading212 ticker (e.g., 'AAPL_US_EQ')
 */
function getFullTicker(ticker) {
  const upperTicker = ticker.toUpperCase();
  return TICKER_MAP[upperTicker] || `${upperTicker}_US_EQ`;
}

// ========================================
// INTRINSIC VALUE CALCULATION (DCF MODEL)
// Calculates what a stock is "really worth"
// ========================================

/**
 * Calculate intrinsic value using simplified DCF model
 * @param {Object} fundamentals - Company fundamental data
 * @returns {number} Intrinsic value per share
 */
function calculateIntrinsicValue(fundamentals) {
  const { 
    free_cash_flow,      // Annual free cash flow
    shares_outstanding,  // Total shares
    growth_rate = CONFIG.GROWTH_RATE,
    discount_rate = CONFIG.DISCOUNT_RATE
  } = fundamentals;
  
  // If we don't have FCF data, fall back to simple P/E based valuation
  if (!free_cash_flow || !shares_outstanding) {
    return calculateSimpleValuation(fundamentals);
  }
  
  // Calculate present value of future cash flows
  let presentValue = 0;
  let cashFlow = free_cash_flow;
  
  // Project cash flows for N years
  for (let year = 1; year <= CONFIG.YEARS_TO_PROJECT; year++) {
    cashFlow *= (1 + growth_rate);
    const discountFactor = Math.pow(1 + discount_rate, year);
    presentValue += cashFlow / discountFactor;
  }
  
  // Add terminal value (value beyond projection period)
  const terminalCashFlow = cashFlow * (1 + growth_rate);
  const terminalValue = terminalCashFlow / (discount_rate - growth_rate);
  const discountedTerminalValue = terminalValue / Math.pow(1 + discount_rate, CONFIG.YEARS_TO_PROJECT);
  
  presentValue += discountedTerminalValue;
  
  // Intrinsic value per share
  return presentValue / shares_outstanding;
}

/**
 * Simple valuation for when we don't have full DCF data
 * Uses P/E ratio and earnings
 */
function calculateSimpleValuation(fundamentals) {
  const { pe_ratio, earnings_per_share, current_price } = fundamentals;
  
  // If P/E is too high, company is overvalued
  // Fair P/E for quality companies is around 15-20
  const FAIR_PE = 18;
  
  if (pe_ratio && earnings_per_share) {
    return earnings_per_share * FAIR_PE;
  }
  
  // If we can't calculate, return current price (no signal)
  return current_price || 0;
}

// ========================================
// STOCK QUALITY ASSESSMENT
// Warren only buys high-quality companies
// ========================================

/**
 * Check if a stock meets Warren's quality standards
 * @param {Object} stock - Stock data from watchlist
 * @returns {Object} { passed: boolean, reasons: string[] }
 */
function assessQuality(stock) {
  const reasons = [];
  let passed = true;
  
  // Check ROE (Return on Equity) - measures profitability
  if (stock.roe && stock.roe < CONFIG.MIN_ROE) {
    passed = false;
    reasons.push(`ROE too low (${stock.roe}% < ${CONFIG.MIN_ROE}%)`);
  } else if (stock.roe) {
    reasons.push(`✓ Strong ROE (${stock.roe}%)`);
  }
  
  // Check Debt/Equity ratio - measures financial health
  if (stock.debt_to_equity && stock.debt_to_equity > CONFIG.MAX_DEBT_TO_EQUITY) {
    passed = false;
    reasons.push(`Too much debt (${stock.debt_to_equity}x > ${CONFIG.MAX_DEBT_TO_EQUITY}x)`);
  } else if (stock.debt_to_equity) {
    reasons.push(`✓ Healthy debt levels (${stock.debt_to_equity}x)`);
  }
  
  // Check P/E ratio - measures valuation
  if (stock.pe_ratio) {
    if (stock.pe_ratio < CONFIG.MIN_PE_RATIO) {
      passed = false;
      reasons.push(`P/E too low - possible value trap (${stock.pe_ratio})`);
    } else if (stock.pe_ratio > CONFIG.MAX_PE_RATIO) {
      passed = false;
      reasons.push(`P/E too high - overvalued (${stock.pe_ratio})`);
    } else {
      reasons.push(`✓ Reasonable P/E (${stock.pe_ratio})`);
    }
  }
  
  return { passed, reasons };
}

// ========================================
// BUY DECISION LOGIC
// Determines if we should buy a stock
// ========================================

/**
 * Evaluate if we should buy a stock
 * @param {Object} stock - Stock from watchlist
 * @returns {Object} { shouldBuy: boolean, reason: string, amount: number }
 */
async function evaluateBuyOpportunity(stock) {
  try {
    // 1. Check quality first
    const quality = assessQuality(stock);
    if (!quality.passed) {
      return {
        shouldBuy: false,
        reason: `Quality check failed: ${quality.reasons.join(', ')}`,
        amount: 0
      };
    }
    
    // 2. Calculate intrinsic value vs current price
    const intrinsicValue = stock.intrinsic_value || calculateIntrinsicValue(stock);
    const currentPrice = stock.current_price;
    
    if (!currentPrice || currentPrice <= 0) {
      return {
        shouldBuy: false,
        reason: 'No current price data',
        amount: 0
      };
    }
    
    // 3. Calculate discount (margin of safety)
    const discount = ((intrinsicValue - currentPrice) / intrinsicValue) * 100;
    
    if (discount < CONFIG.MIN_DISCOUNT_PERCENT) {
      return {
        shouldBuy: false,
        reason: `Not undervalued enough (${discount.toFixed(1)}% < ${CONFIG.MIN_DISCOUNT_PERCENT}%)`,
        amount: 0
      };
    }
    
    // 4. Check if we already own too much of this stock
    const currentPosition = await getCurrentPosition(stock.ticker);
    const warrenBudget = await getWarrenBudget();
    const positionValue = currentPosition ? currentPosition.current_value : 0;
    const maxPositionValue = warrenBudget * (CONFIG.MAX_POSITION_SIZE_PERCENT / 100);
    
    if (positionValue >= maxPositionValue) {
      return {
        shouldBuy: false,
        reason: `Position already at max size (${CONFIG.MAX_POSITION_SIZE_PERCENT}% of budget)`,
        amount: 0
      };
    }
    
    // 5. Calculate purchase amount
    const availableBudget = await getAvailableBudget();
    const maxBuy = Math.min(
      CONFIG.MAX_SINGLE_PURCHASE,
      maxPositionValue - positionValue,
      availableBudget
    );
    
    if (maxBuy < currentPrice) {
      return {
        shouldBuy: false,
        reason: 'Insufficient budget for even 1 share',
        amount: 0
      };
    }
    
    const sharesToBuy = Math.floor(maxBuy / currentPrice);
    const totalCost = sharesToBuy * currentPrice;
    
    // 6. Decision: BUY!
    return {
      shouldBuy: true,
      reason: `Undervalued by ${discount.toFixed(1)}% (${quality.reasons.join(', ')})`,
      amount: totalCost,
      shares: sharesToBuy,
      price: currentPrice
    };
    
  } catch (error) {
    console.error(`Error evaluating ${stock.ticker}:`, error);
    return {
      shouldBuy: false,
      reason: `Error: ${error.message}`,
      amount: 0
    };
  }
}

// ========================================
// EXECUTE BUY ORDER
// Places the actual trade via Trading212
// ========================================

/**
 * Execute a buy order for a stock
 * @param {string} ticker - Stock ticker (short form like 'AAPL')
 * @param {number} shares - Number of shares to buy
 * @param {string} reason - Why we're buying
 * @param {boolean} dryRun - If true, don't actually place order (for testing)
 * @returns {Promise<Object>} Trade result
 */
async function executeBuy(ticker, shares, reason, dryRun = false) {
  try {
    console.log(`\n🤔 Warren Mode: ${dryRun ? '[DRY RUN] Would buy' : 'Buying'} ${shares} shares of ${ticker}`);
    console.log(`   Reason: ${reason}`);
    
    if (dryRun) {
      console.log(`   💡 DRY RUN MODE - Not placing actual order`);
      const estimatedPrice = 150; // Mock price for dry run
      const total = shares * estimatedPrice;
      
      return {
        success: true,
        ticker,
        shares,
        price: estimatedPrice,
        total,
        dryRun: true
      };
    }
    
    // Convert to Trading212 format (AAPL → AAPL_US_EQ)
    const fullTicker = getFullTicker(ticker);
    console.log(`   📝 Using Trading212 ticker: ${fullTicker}`);
    
    // Place market order via Trading212
    const order = await trading212.placeMarketOrder(fullTicker, shares, 'BUY');
    
    // Record trade in database (use short ticker for consistency)
    const price = order.fillPrice || order.limitPrice || 0;
    const total = shares * price;
    
    const stmt = db.prepare(`
      INSERT INTO trades (ticker, mode, action, shares, price, total, reason)
      VALUES (?, 'warren', 'BUY', ?, ?, ?, ?)
    `);
    
    stmt.run(ticker, shares, price, total, reason);
    
    // Update or create position
    await updatePosition(ticker, shares, price);
    
    console.log(`✅ Warren Mode: Successfully bought ${shares} shares of ${ticker} at ${price} NOK`);
    
    return {
      success: true,
      ticker,
      shares,
      price,
      total
    };
    
  } catch (error) {
    console.error(`❌ Failed to execute buy for ${ticker}:`, error);
    return {
      success: false,
      error: error.message,
      ticker
    };
  }
}

// ========================================
// POSITION MANAGEMENT
// ========================================

/**
 * Get current position for a ticker
 */
async function getCurrentPosition(ticker) {
  const stmt = db.prepare(`
    SELECT * FROM positions 
    WHERE ticker = ? AND mode = 'warren'
  `);
  return stmt.get(ticker.toUpperCase());
}

/**
 * Update position after a buy
 */
async function updatePosition(ticker, sharesBought, price) {
  const existing = await getCurrentPosition(ticker);
  
  if (existing) {
    // Update existing position (average price)
    const totalShares = existing.shares + sharesBought;
    const totalInvested = existing.invested + (sharesBought * price);
    const avgPrice = totalInvested / totalShares;
    
    const stmt = db.prepare(`
      UPDATE positions 
      SET shares = ?,
          avg_price = ?,
          invested = ?,
          current_price = ?,
          current_value = ?,
          profit_loss = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const currentValue = totalShares * price;
    const profitLoss = currentValue - totalInvested;
    
    stmt.run(totalShares, avgPrice, totalInvested, price, currentValue, profitLoss, existing.id);
  } else {
    // Create new position
    const invested = sharesBought * price;
    const stmt = db.prepare(`
      INSERT INTO positions (ticker, mode, shares, avg_price, current_price, invested, current_value, profit_loss)
      VALUES (?, 'warren', ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(ticker, sharesBought, price, price, invested, invested, 0);
  }
}

// ========================================
// BUDGET MANAGEMENT
// ========================================

/**
 * Get Warren's total budget
 */
async function getWarrenBudget() {
  const { getSetting } = require('../config/database');
  const totalBalance = parseFloat(getSetting('total_balance'));
  const warrenAllocation = parseFloat(getSetting('warren_allocation'));
  return totalBalance * (warrenAllocation / 100);
}

/**
 * Get available budget (not tied up in positions)
 */
async function getAvailableBudget() {
  const totalBudget = await getWarrenBudget();
  
  const stmt = db.prepare(`
    SELECT SUM(current_value) as used
    FROM positions
    WHERE mode = 'warren'
  `);
  
  const result = stmt.get();
  const used = result.used || 0;
  
  return totalBudget - used;
}

// ========================================
// MAIN SCAN FUNCTION
// Runs daily to check all watchlist stocks
// ========================================

/**
 * Scan entire watchlist for buy opportunities
 * This is the main function that runs daily
 * @param {boolean} dryRun - If true, don't place actual orders (for testing)
 */
async function scanWatchlist(dryRun = false) {
  console.log('\n========================================');
  console.log(`📊 Warren Mode: Starting watchlist scan ${dryRun ? '[DRY RUN]' : ''}`);
  console.log('========================================\n');
  
  try {
    // Check if bot is paused
    const { getSetting } = require('../config/database');
    const botPaused = getSetting('bot_paused') === 'true';
    const warrenPaused = getSetting('warren_paused') === 'true';
    
    if (botPaused || warrenPaused) {
      console.log('⏸️  Warren Mode is PAUSED - skipping scan');
      return {
        scanned: 0,
        opportunities: 0,
        trades: [],
        paused: true
      };
    }
    // Get all stocks in watchlist
    const stmt = db.prepare('SELECT * FROM watchlist');
    const watchlist = stmt.all();
    
    if (watchlist.length === 0) {
      console.log('⚠️  Watchlist is empty. Add stocks to start trading!');
      return {
        scanned: 0,
        opportunities: 0,
        trades: []
      };
    }
    
    console.log(`📋 Scanning ${watchlist.length} stocks...\n`);
    
    const results = {
      scanned: watchlist.length,
      opportunities: 0,
      trades: []
    };
    
    // Evaluate each stock
    for (const stock of watchlist) {
      console.log(`\n🔍 Analyzing ${stock.ticker} (${stock.name})...`);
      
      // IMPORTANT: Add delay to avoid rate limiting
      if (watchlist.indexOf(stock) > 0) {
        console.log('   ⏳ Waiting 5 seconds to avoid rate limit...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Get current price from Trading212
      try {
        const currentPrice = await trading212.getCurrentPrice(stock.ticker);
        if (currentPrice) {
          // Update price in watchlist
          const updateStmt = db.prepare(`
            UPDATE watchlist 
            SET current_price = ?, last_updated = CURRENT_TIMESTAMP 
            WHERE ticker = ?
          `);
          updateStmt.run(currentPrice, stock.ticker);
          stock.current_price = currentPrice;
        }
      } catch (err) {
        console.log(`   ⚠️ Could not fetch current price, using stored price`);
      }
      
      // Evaluate buy opportunity
      const evaluation = await evaluateBuyOpportunity(stock);
      
      if (evaluation.shouldBuy) {
        results.opportunities++;
        console.log(`   💰 BUY SIGNAL! ${evaluation.reason}`);
        
        // Execute the trade (or simulate if dry run)
        const trade = await executeBuy(
          stock.ticker,
          evaluation.shares,
          evaluation.reason,
          dryRun
        );
        
        results.trades.push(trade);
        
        // Small delay between trades to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log(`   ⏸️  No action: ${evaluation.reason}`);
      }
    }
    
    console.log('\n========================================');
    console.log('📊 Warren Mode: Scan complete');
    console.log(`   Scanned: ${results.scanned} stocks`);
    console.log(`   Opportunities: ${results.opportunities}`);
    console.log(`   Trades executed: ${results.trades.length}`);
    console.log('========================================\n');
    
    return results;
    
  } catch (error) {
    console.error('❌ Error during watchlist scan:', error);
    throw error;
  }
}

// ========================================
// EXPORT ALL FUNCTIONS
// ========================================

module.exports = {
  // Main functions
  scanWatchlist,
  evaluateBuyOpportunity,
  executeBuy,
  
  // Calculations
  calculateIntrinsicValue,
  assessQuality,
  
  // Position management
  getCurrentPosition,
  updatePosition,
  
  // Budget
  getWarrenBudget,
  getAvailableBudget,
  
  // Config (for testing/adjusting)
  CONFIG
};