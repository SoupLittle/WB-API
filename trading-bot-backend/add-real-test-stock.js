// ========================================
// ADD A REAL TICKER FOR A FULL END-TO-END TEST
// Uses Ford (F) - a real, tradeable Trading212 instrument -
// with fundamentals crafted to clear every Warren Mode gate,
// so this test proves the WHOLE chain: decision -> real order
// -> database -> notification -> GUI
//
// NOTE: Ford's REAL fundamentals (negative earnings, high debt
// from Ford Credit) would actually FAIL Warren's quality bar -
// same as the old fake "TEST" stock, we're crafting numbers here
// on purpose to guarantee a BUY decision for testing.
// ========================================

const { db } = require('./src/config/database');

function addRealTestStock() {
  console.log('\n========================================');
  console.log('📊 Adding real ticker for end-to-end test');
  console.log('========================================\n');

  const stock = {
    ticker: 'F',                    // Real Trading212 ticker (F_US_EQ)
    name: 'Ford Motor Company',
    pe_ratio: 15.0,                 // Crafted to pass MIN_PE_RATIO(10)/MAX_PE_RATIO(30)
    debt_to_equity: 0.8,            // Crafted to pass MAX_DEBT_TO_EQUITY(1.0)
    roe: 25.0,                      // Crafted to pass MIN_ROE(20)
    intrinsic_value: 20,            // "Fair value" we're claiming
    current_price: 14.40            // Roughly Ford's real price (check before running!)
  };

  const discount = ((stock.intrinsic_value - stock.current_price) / stock.intrinsic_value * 100).toFixed(1);
  const recommendation = `BUY - Undervalued by ${discount}%`;

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO watchlist (
      ticker, name, pe_ratio, debt_to_equity, roe,
      intrinsic_value, current_price, recommendation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    stock.ticker,
    stock.name,
    stock.pe_ratio,
    stock.debt_to_equity,
    stock.roe,
    stock.intrinsic_value,
    stock.current_price,
    recommendation
  );

  console.log(`✅ Added ${stock.ticker} (${stock.name}):`);
  console.log(`   Current Price: $${stock.current_price}`);
  console.log(`   Claimed Intrinsic Value: $${stock.intrinsic_value}`);
  console.log(`   Discount: ${discount}% (needs > 20%)`);
  console.log(`   ROE: ${stock.roe}% (needs > 20%)`);
  console.log(`   Debt/Equity: ${stock.debt_to_equity}x (needs < 1.0)`);
  console.log(`   P/E: ${stock.pe_ratio} (needs between 10-30)\n`);

  console.log('⚠️  IMPORTANT: This will place a REAL order on your');
  console.log('   Trading212 DEMO account when you run the scan.');
  console.log('   Double check TRADING212_MODE=demo in .env first!\n');

  console.log('========================================');
  console.log('Next: run node test-warren-scan.js');
  console.log('========================================\n');
}

addRealTestStock();
