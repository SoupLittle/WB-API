// ========================================
// ADD A STOCK TO THE WATCHLIST
// Automatically fetches current price, P/E, ROE, and debt/equity
// from Finnhub. YOU still provide the intrinsic value estimate -
// that's a judgment call, not something any free API computes.
//
// Usage: node add-stock-to-watchlist.js TICKER INTRINSIC_VALUE [EXCHANGE]
// Example (US):  node add-stock-to-watchlist.js JNJ 290
// Example (EU):  node add-stock-to-watchlist.js SAP 180 XETRA
// ========================================

require('dotenv').config();
const { db } = require('./src/config/database');
const marketDataService = require('./src/services/marketDataService');

async function addStock() {
  const ticker = process.argv[2];
  const intrinsicValue = parseFloat(process.argv[3]);
  const exchange = process.argv[4] || null; // only needed for EU/non-US tickers

  if (!ticker || !intrinsicValue) {
    console.log('\nUsage: node add-stock-to-watchlist.js TICKER INTRINSIC_VALUE [EXCHANGE]');
    console.log('Example (US): node add-stock-to-watchlist.js JNJ 290');
    console.log('Example (EU): node add-stock-to-watchlist.js SAP 180 XETRA\n');
    console.log('INTRINSIC_VALUE is YOUR estimate of what the stock is actually');
    console.log('worth - based on your own research (growth prospects, moat,');
    console.log('management quality, etc). This is the one number no API can');
    console.log('give you - it\'s the actual judgment call in value investing.\n');
    console.log('IMPORTANT: enter this in the stock\'s own NATIVE currency');
    console.log('(e.g. USD for a US stock, EUR for a XETRA stock) - the SAME');
    console.log('currency its live price comes back in. The bot only converts');
    console.log('to NOK later, at the point of sizing an actual purchase -');
    console.log('mixing currencies here would silently break the discount% math.\n');
    console.log('EXCHANGE is only needed for non-US tickers that trade on');
    console.log('multiple exchanges (e.g. SAP, ASML). Leave it off for US stocks.\n');
    process.exit(1);
  }

  console.log('\n========================================');
  console.log(`📊 Adding ${ticker.toUpperCase()} to watchlist`);
  console.log('========================================\n');

  console.log('Fetching live price and fundamentals from Twelve Data...\n');

  const currentPrice = await marketDataService.getQuote(ticker, exchange);
  const fundamentals = await marketDataService.getFundamentals(ticker, exchange);

  if (!currentPrice) {
    console.log(`❌ Could not fetch a price for ${ticker}. Check the ticker is correct,`);
    console.log('   and if it\'s a non-US stock, try adding the exchange (e.g. XETRA, LSE).\n');
    process.exit(1);
  }

  const discount = ((intrinsicValue - currentPrice) / intrinsicValue * 100).toFixed(1);
  const recommendation = discount >= 20
    ? `BUY - Undervalued by ${discount}%`
    : discount <= -20
      ? `Overvalued by ${Math.abs(discount)}%`
      : 'Fairly valued - no clear signal';

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO watchlist (
      ticker, name, pe_ratio, debt_to_equity, roe,
      intrinsic_value, current_price, recommendation, exchange
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    ticker.toUpperCase(),
    ticker.toUpperCase(), // Twelve Data's /price response doesn't include company name; edit manually if you want it
    fundamentals.peRatio,
    fundamentals.debtToEquity,
    fundamentals.roe,
    intrinsicValue,
    currentPrice,
    recommendation,
    exchange
  );

  console.log(`✅ Added ${ticker.toUpperCase()}:`);
  console.log(`   Current Price: $${currentPrice}`);
  console.log(`   P/E Ratio: ${fundamentals.peRatio ?? 'not available'}`);
  console.log(`   ROE: ${fundamentals.roe ?? 'not available'}`);
  console.log(`   Debt/Equity: ${fundamentals.debtToEquity ?? 'not available'}`);
  console.log(`   Your Intrinsic Value Estimate: $${intrinsicValue}`);
  console.log(`   Discount/Premium: ${discount}%`);
  console.log(`   Recommendation: ${recommendation}\n`);

  if (fundamentals.peRatio === null || fundamentals.roe === null || fundamentals.debtToEquity === null) {
    console.log('⚠️  Some fundamentals came back empty - Warren Mode\'s quality checks');
    console.log('   (ROE, debt/equity, P/E thresholds) need real numbers to pass.');
    console.log('   Check the Finnhub field names logged above if this persists.\n');
  }

  console.log('========================================\n');
  process.exit(0);
}

addStock();
