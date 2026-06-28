// ========================================
// TEST SCRIPT: Add Stocks to Watchlist
// Run this to populate Warren's watchlist with test data
// ========================================

const { db } = require('./src/config/database');

// Sample stocks with fundamental data
const testStocks = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    pe_ratio: 31.2,
    debt_to_equity: 1.8,
    roe: 147.3,
    intrinsic_value: 210,
    current_price: 195.50
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    pe_ratio: 36.8,
    debt_to_equity: 0.5,
    roe: 38.4,
    intrinsic_value: 365,
    current_price: 378.91
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    pe_ratio: 26.3,
    debt_to_equity: 0.1,
    roe: 28.1,
    intrinsic_value: 160,
    current_price: 141.80
  },
  {
    ticker: 'JNJ',
    name: 'Johnson & Johnson',
    pe_ratio: 24.5,
    debt_to_equity: 0.6,
    roe: 26.7,
    intrinsic_value: 175,
    current_price: 156.20
  },
  {
    ticker: 'BRK.B',
    name: 'Berkshire Hathaway',
    pe_ratio: 22.1,
    debt_to_equity: 0.3,
    roe: 15.8,
    intrinsic_value: 420,
    current_price: 385.50
  }
];

// ========================================
// ADD STOCKS TO WATCHLIST
// ========================================

function addStocksToWatchlist() {
  console.log('\n========================================');
  console.log('📊 Adding test stocks to watchlist');
  console.log('========================================\n');
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO watchlist (
      ticker, name, pe_ratio, debt_to_equity, roe,
      intrinsic_value, current_price, recommendation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const stock of testStocks) {
    // Calculate recommendation
    const discount = ((stock.intrinsic_value - stock.current_price) / stock.intrinsic_value * 100).toFixed(0);
    let recommendation;
    
    if (discount > 10) {
      recommendation = `BUY - Undervalued by ${discount}%`;
    } else if (discount < -10) {
      recommendation = `SELL - Overvalued by ${Math.abs(discount)}%`;
    } else {
      recommendation = 'HOLD - Fairly priced';
    }
    
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
    
    console.log(`✅ Added ${stock.ticker} (${stock.name})`);
    console.log(`   Current: ${stock.current_price} NOK, Fair Value: ${stock.intrinsic_value} NOK`);
    console.log(`   ${recommendation}\n`);
  }
  
  console.log('========================================');
  console.log(`✅ Successfully added ${testStocks.length} stocks to watchlist!`);
  console.log('========================================\n');
  console.log('🚀 You can now run Warren Mode scan:');
  console.log('   node test-warren-scan.js');
  console.log('\nOr trigger it via the API:');
  console.log('   POST http://localhost:3001/api/warren/scan');
  console.log('\n');
}

// ========================================
// RUN IF EXECUTED DIRECTLY
// ========================================

if (require.main === module) {
  try {
    addStocksToWatchlist();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

module.exports = { addStocksToWatchlist, testStocks };