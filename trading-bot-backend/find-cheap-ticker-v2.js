// ========================================
// FIND A CHEAP REAL TICKER FOR TESTING
// v2 - fetches the instrument list ONCE and matches EXACTLY,
// instead of re-fetching per ticker and loosely substring-matching
// (which was returning wrong companies and hitting rate limits)
// ========================================

require('dotenv').config();
const trading212 = require('./src/services/trading212Service');

const candidates = ['F', 'SIRI', 'NOK', 'BAC', 'T'];

async function findCheapTicker() {
  console.log('\n========================================');
  console.log('🔍 Looking for a cheap, real ticker');
  console.log('========================================\n');

  // Fetch the full instrument list ONCE - this is the heavy call that
  // was rate-limiting us before, since we used to call it once PER candidate
  console.log('📥 Fetching full instrument list (one time)...\n');
  const allInstruments = await trading212.getAllInstruments();

  console.log(`✅ Got ${allInstruments.length} total instruments to search locally\n`);

  for (const ticker of candidates) {
    const upper = ticker.toUpperCase();

    // EXACT match only - this is the fix. The old code used a loose
    // substring search server-side, which for a query like "F" matched
    // thousands of unrelated instruments containing the letter F anywhere.
    const match = allInstruments.find(i =>
      i.ticker === upper || i.ticker === `${upper}_US_EQ`
    );

    if (match) {
      console.log(`✅ ${ticker} → ${match.ticker} (${match.name})`);
    } else {
      console.log(`❌ ${ticker}: no exact match found`);
    }
  }

  console.log('\n========================================');
  console.log('💡 Note: Trading212\'s API has no live price lookup');
  console.log('   for stocks you don\'t already own. Set the price');
  console.log('   manually (check a finance site) when adding this');
  console.log('   ticker to your watchlist, same as add-undervalued-stock.js does.');
  console.log('========================================\n');
}

findCheapTicker().catch(err => {
  console.error('❌ Fatal error:', err.message);
});
