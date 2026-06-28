// ========================================
// ADD AN OBVIOUSLY UNDERVALUED STOCK
// This adds a fake stock that Warren Mode will definitely buy
// Perfect for testing the buying logic
// ========================================

const { db } = require('./src/config/database');

function addUndervaluedStock() {
  console.log('\n========================================');
  console.log('📊 Adding test undervalued stock');
  console.log('========================================\n');
  
  // This stock is VERY undervalued (40% discount!)
  // Warren Mode should definitely want to buy it
  const stock = {
    ticker: 'TEST',
    name: 'Test Undervalued Company',
    pe_ratio: 18.5,           // Reasonable P/E
    debt_to_equity: 0.5,      // Low debt (good!)
    roe: 25.0,                // High ROE (excellent!)
    intrinsic_value: 250,     // Fair value: 250 NOK
    current_price: 150        // Trading at only 150 NOK (40% discount!)
  };
  
  const discount = ((stock.intrinsic_value - stock.current_price) / stock.intrinsic_value * 100).toFixed(0);
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
  
  console.log('✅ Added TEST stock:');
  console.log(`   Current Price: ${stock.current_price} NOK`);
  console.log(`   Intrinsic Value: ${stock.intrinsic_value} NOK`);
  console.log(`   Discount: ${discount}%`);
  console.log(`   ROE: ${stock.roe}%`);
  console.log(`   Debt/Equity: ${stock.debt_to_equity}x\n`);
  
  console.log('🤔 Warren Mode Analysis:');
  console.log(`   ✓ Quality check: PASS (ROE > 15%, Debt < 2.0)`);
  console.log(`   ✓ Valuation: PASS (${discount}% > 10% minimum)`);
  console.log(`   → Warren should BUY this stock!\n`);
  
  console.log('========================================');
  console.log('⚠️  NOTE: This is a FAKE stock for testing!');
  console.log('   Trading212 will reject the order.');
  console.log('   But you can see Warren Mode\'s logic work.');
  console.log('========================================\n');
  
  console.log('🚀 Next steps:');
  console.log('   1. Refresh your dashboard to see TEST stock');
  console.log('   2. Click "Run Watchlist Scan" button');
  console.log('   3. Watch Warren Mode analyze and try to buy!\n');
}

if (require.main === module) {
  try {
    addUndervaluedStock();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

module.exports = { addUndervaluedStock };