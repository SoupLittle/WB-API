// ========================================
// TEST SCRIPT: Run Warren Mode Scan
// Tests the Warren Mode scanning logic
// ========================================

require('dotenv').config();
const warrenMode = require('./src/services/warrenMode');

async function testWarrenScan() {
  console.log('\n========================================');
  console.log('🧪 Testing Warren Mode Scan');
  console.log('========================================\n');
  
  try {
    // Check budget first
    const budget = await warrenMode.getWarrenBudget();
    const available = await warrenMode.getAvailableBudget();
    
    console.log('💰 Budget Status:');
    console.log(`   Total Warren Budget: ${budget.toFixed(0)} NOK`);
    console.log(`   Available: ${available.toFixed(0)} NOK`);
    console.log(`   Used: ${(budget - available).toFixed(0)} NOK\n`);
    
    // Run the scan
    const results = await warrenMode.scanWatchlist();
    
    console.log('\n========================================');
    console.log('📊 Scan Results Summary');
    console.log('========================================');
    console.log(`Stocks scanned: ${results.scanned}`);
    console.log(`Buy opportunities found: ${results.opportunities}`);
    console.log(`Trades executed: ${results.trades.length}`);
    
    if (results.trades.length > 0) {
      console.log('\n✅ Trades:');
      results.trades.forEach(trade => {
        if (trade.success) {
          console.log(`   - ${trade.ticker}: ${trade.shares} shares @ ${trade.price} NOK (${trade.total} NOK)`);
        } else {
          console.log(`   - ${trade.ticker}: FAILED - ${trade.error}`);
        }
      });
    }
    
    console.log('\n========================================\n');
    
  } catch (error) {
    console.error('\n❌ Error during test:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testWarrenScan();
}

module.exports = { testWarrenScan };