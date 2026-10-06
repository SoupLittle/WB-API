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
/**
 * Reconcile local positions against what Trading212 ACTUALLY shows.
 *
 * This used to just fetch a fresh price for whatever was already in the
 * local `positions` table - it never checked whether that position still
 * genuinely existed on Trading212. That let "phantom" positions survive
 * locally after an order was cancelled (or never filled) on the broker's
 * side, since cancelling on Trading212 doesn't notify our database.
 *
 * Trading212's live portfolio is treated as the source of truth:
 *   - If it shows zero/no holding for a ticker we have locally, the local
 *     position is phantom (cancelled/never filled) - delete it.
 *   - If it shows a holding, sync our shares/avg_price/current_price to
 *     match exactly, in case of partial fills or manual intervention.
 *
 * One getPortfolio() call covers every local position, instead of one
 * API call per position - this avoids the rate-limiting we hit earlier
 * when we were calling a heavy endpoint once per ticker.
 */
async function updateAllPositions() {
  const positions = db.prepare(`SELECT * FROM positions`).all();

  if (positions.length === 0) {
    console.log('   No open positions to reconcile.');
    return { unchanged: 0, corrected: 0, removed: 0, failed: 0 };
  }

  let unchanged = 0;
  let corrected = 0;
  let removed = 0;
  let failed = 0;

  let portfolio;
  try {
    portfolio = await trading212.getPortfolio();
  } catch (error) {
    console.error('   Failed to fetch Trading212 portfolio - skipping reconciliation this cycle:', error.message);
    return { unchanged: 0, corrected: 0, removed: 0, failed: positions.length };
  }

  for (const position of positions) {
    try {
      const upperTicker = position.ticker.toUpperCase();
      const match = portfolio.find(p =>
        p.ticker === upperTicker || p.ticker === `${upperTicker}_US_EQ`
      );

      if (!match || !match.quantity || match.quantity <= 0) {
        // Trading212 has nothing for this ticker - the order behind this
        // local position never actually filled, or was cancelled/sold
        // outside the bot. Remove it so Holdings reflects reality.
        db.prepare('DELETE FROM positions WHERE id = ?').run(position.id);
        console.log(`   🗑️  Removed ${position.ticker} - not found in real Trading212 portfolio (likely cancelled/never filled)`);
        removed++;
        continue;
      }

      const shares = match.quantity;
      const avgPrice = match.averagePrice || position.avg_price;
      const currentPrice = match.currentPrice || position.current_price || avgPrice;
      const invested = shares * avgPrice;
      const currentValue = shares * currentPrice;
      const profitLoss = currentValue - invested;

      const changed = shares !== position.shares || avgPrice !== position.avg_price;

      db.prepare(`
        UPDATE positions
        SET shares = ?, avg_price = ?, current_price = ?, invested = ?, current_value = ?, profit_loss = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(shares, avgPrice, currentPrice, invested, currentValue, profitLoss, position.id);

      if (changed) {
        console.log(`   🔄 Corrected ${position.ticker}: local had ${position.shares} shares @ ${position.avg_price}, Trading212 shows ${shares} @ ${avgPrice}`);
        corrected++;
      } else {
        unchanged++;
      }
    } catch (error) {
      console.error(`   Failed to reconcile ${position.ticker}:`, error.message);
      failed++;
    }
  }

  console.log(`   Reconciled: ${unchanged} unchanged, ${corrected} corrected, ${removed} removed${failed > 0 ? `, ${failed} failed` : ''}.`);
  return { unchanged, corrected, removed, failed };
}

module.exports = {
  recordTrade,
  updateAllPositions
};