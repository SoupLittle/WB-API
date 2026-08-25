// ========================================
// FIND A CHEAP REAL TICKER FOR TESTING
// Searches Trading212 for real instruments so we can safely
// test a full real buy (small NOK amount) on the demo account
// ========================================

require('dotenv').config();
const trading212 = require('./src/services/trading212Service');

// Candidates known to be low-priced, liquid, boring, easy to find
const candidates = ['F', 'SIRI', 'NOK', 'BAC', 'T'];

async function findCheapTicker() {
  console.log('\n========================================');
  console.log('🔍 Looking for a cheap, real ticker');
  console.log('========================================\n');

  for (const ticker of candidates) {
    try {
      const results = await trading212.searchInstruments(ticker);

      if (results && results.length > 0) {
        const match = results.find(r => r.ticker.startsWith(ticker + '_')) || results[0];
        console.log(`✅ ${ticker} → ${match.ticker} (${match.name})`);

        // Try to get a live price too, so we know roughly what 1 share costs
        try {
          const price = await trading212.getCurrentPrice(match.ticker);
          console.log(`   Current price: ~${price} NOK (or account currency)\n`);
        } catch {
          console.log('   (could not fetch live price)\n');
        }
      } else {
        console.log(`❌ ${ticker}: not found\n`);
      }
    } catch (err) {
      console.log(`❌ ${ticker}: error - ${err.message}\n`);
    }

    // Be polite to Trading212's rate limits
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('========================================');
  console.log('Pick one of the FULL tickers above (the one');
  console.log('with the suffix, e.g. F_US_EQ) for the next step.');
  console.log('========================================\n');
}

findCheapTicker();