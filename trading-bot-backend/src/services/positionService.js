// ========================================
// POSITION SERVICE
// Shared logic for keeping the `positions` table accurate.
// Used by: dayTraderMode (after every BUY/SELL) and the
// 5-minute "position updater" cron job in server.js.
// ========================================

const { db } = require('../config/database');
const trading212 = require('./trading212Service');

/**
 * Record the effect of a trade on the positions table.
 * BUY: creates a new position, or averages into an existing one.
 * SELL: reduces an existing position, or deletes it if fully closed.
 *
 * @param {string} ticker
 * @param {'warren'|'daytrader'} mode
 * @param {'BUY'|'SELL'} action
 * @param {number} shares
 * @param {number} price
 */
async function recordTrade(ticker, mode, action, shares, price) {
  const upperTicker = ticker.toUpperCase();

  const existingStmt = db.prepare(`
    SELECT * FROM positions WHERE ticker = ? AND mode = ?
  `);
  const existing = existingStmt.get(upperTicker, mode);

  if (action === 'BUY') {
    if (existing) {
      // Average into the existing position
      const totalShares = existing.shares + shares;
      const totalInvested = existing.invested + (shares * price);
      const avgPrice = totalInvested / totalShares;
      const currentValue = totalShares * price;
      const profitLoss = currentValue - totalInvested;

      db.prepare(`
        UPDATE positions
        SET shares = ?, avg_price = ?, invested = ?,
            current_price = ?, current_value = ?, profit_loss = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(totalShares, avgPrice, totalInvested, price, currentValue, profitLoss, existing.id);
    } else {
      // Open a brand new position
      const invested = shares * price;

      db.prepare(`
        INSERT INTO positions (ticker, mode, shares, avg_price, current_price, invested, current_value, profit_loss)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).run(upperTicker, mode, shares, price, price, invested, invested);
    }
    return;
  }

  if (action === 'SELL') {
    if (!existing) {
      // Selling something we have no record of - shouldn't normally happen,
      // but don't crash the trade over a bookkeeping mismatch
      console.warn(`⚠️  SELL recorded for ${upperTicker} (${mode}) but no matching position was found`);
      return;
    }

    const remainingShares = existing.shares - shares;

    if (remainingShares <= 0.0001) {
      // Position fully closed - remove it rather than leave a zero-share row
      db.prepare(`DELETE FROM positions WHERE id = ?`).run(existing.id);
    } else {
      // Partial sell - keep the same average cost basis, shrink the position
      const remainingInvested = existing.avg_price * remainingShares;
      const currentValue = remainingShares * price;
      const profitLoss = currentValue - remainingInvested;

      db.prepare(`
        UPDATE positions
        SET shares = ?, invested = ?, current_price = ?,
            current_value = ?, profit_loss = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(remainingShares, remainingInvested, price, currentValue, profitLoss, existing.id);
    }
  }
}

/**
 * Refresh current_price / current_value / profit_loss for every open
 * position, using live prices from Trading212. Called every 5 minutes
 * by the cron job in server.js, and also feeds Day Trader's exit-condition
 * checks (which read position.current_price).
 */
async function updateAllPositions() {
  const positions = db.prepare(`SELECT * FROM positions`).all();

  if (positions.length === 0) {
    console.log('   No open positions to update.');
    return { updated: 0, failed: 0 };
  }

  let updated = 0;
  let failed = 0;

  for (const position of positions) {
    try {
      const currentPrice = await trading212.getCurrentPrice(position.ticker);
      const currentValue = position.shares * currentPrice;
      const profitLoss = currentValue - position.invested;

      db.prepare(`
        UPDATE positions
        SET current_price = ?, current_value = ?, profit_loss = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(currentPrice, currentValue, profitLoss, position.id);

      updated++;
    } catch (error) {
      // One bad ticker shouldn't stop the rest of the portfolio from updating
      console.error(`   Failed to update ${position.ticker}:`, error.message);
      failed++;
    }
  }

  console.log(`   Updated ${updated} position(s)${failed > 0 ? `, ${failed} failed` : ''}.`);
  return { updated, failed };
}

module.exports = {
  recordTrade,
  updateAllPositions
};
