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
    
    const mapping = [];
    
    for (const ticker of tickers) {
      console.log(`\n📊 ${ticker}:`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const results = await trading212.searchInstruments(ticker);
        
        if (results && results.length > 0) {
          // Look for exact match or closest match
          let match = results.find(r => r.ticker === ticker);
          
          if (!match) {
            // Try to find with _US_EQ suffix (most common)
            match = results.find(r => r.ticker === `${ticker}_US_EQ`);
          }
          
          if (!match) {
            // Just use first result
            match = results[0];
          }
          
          if (match) {
            console.log(`   ✅ Found: ${match.name}`);
            console.log(`   Trading212 Ticker: ${match.ticker}`);
            console.log(`   Short Ticker: ${ticker}`);
            
            mapping.push({
              shortTicker: ticker,
              fullTicker: match.ticker,
              name: match.name
            });
          }
        } else {
          console.log(`   ❌ Not found on Trading212`);
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }
    
    console.log('\n========================================');
    console.log('📋 Ticker Mapping:');
    console.log('========================================\n');
    
    mapping.forEach(m => {
      console.log(`${m.shortTicker.padEnd(10)} → ${m.fullTicker.padEnd(20)} (${m.name})`);
    });
    
    console.log('\n========================================');
    console.log('💡 Next Steps:');
    console.log('   1. Update watchlist with FULL tickers');
    console.log('   2. Or create a ticker mapping system');
    console.log('========================================\n');
    
    return mapping;
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAvailableStocks();// ========================================
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