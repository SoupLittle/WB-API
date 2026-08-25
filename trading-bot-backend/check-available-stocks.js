// ========================================
// CHECK AVAILABLE STOCKS ON TRADING212
// See what stocks you can actually trade
// ========================================

require('dotenv').config();
const trading212 = require('./src/services/trading212Service');

async function checkAvailableStocks() {
  try {
    console.log('\n========================================');
    console.log('🔍 Checking Trading212 Available Stocks');
    console.log('========================================\n');

    // Search for the stocks in our watchlist
    const tickers = ['AAPL', 'MSFT', 'GOOGL', 'JNJ', 'BRK.B'];

    console.log('Looking up these tickers:\n');

    for (const ticker of tickers) {
      console.log(`\n📊 ${ticker}:`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 4000));

      try {
        const results = await trading212.searchInstruments(ticker);

        if (results && results.length > 0) {
          const exact = results.find(r => r.ticker === ticker);
          if (exact) {
            console.log(`   ✅ Found: ${exact.name}`);
            console.log(`   Ticker: ${exact.ticker}`);
            console.log(`   Type: ${exact.type || 'Unknown'}`);
            console.log(`   Can Trade: YES`);
          } else {
            console.log(`   ⚠️  Found similar: ${results[0].ticker} (${results[0].name})`);
          }
        } else {
          console.log(`   ❌ Not found on Trading212`);
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }

    console.log('\n========================================');
    console.log('💡 Recommendation:');
    console.log('   Only add stocks to watchlist that exist');
    console.log('   on Trading212 demo account!');
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkAvailableStocks();