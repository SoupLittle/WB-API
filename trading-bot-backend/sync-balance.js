// ========================================
// SYNC BALANCE FROM TRADING212
// Fetches your real FREE balance and updates database
// ========================================

require('dotenv').config();
const trading212 = require('./src/services/trading212Service');
const { updateSetting } = require('./src/config/database');

async function syncBalance() {
  try {
    console.log('📊 Fetching balance from Trading212...\n');
    
    const cash = await trading212.getAccountCash();
    
    console.log('💰 Trading212 Account:');
    console.log(`   Total: ${cash.total} ${cash.currency}`);
    console.log(`   Free (available): ${cash.free} ${cash.currency}`);
    console.log(`   Invested: ${cash.invested} ${cash.currency}`);
    console.log(`   In Pies: ${cash.pieCash} ${cash.currency}\n`);
    
    // Update database with FREE balance (what's available to trade)
    updateSetting('total_balance', cash.free.toString());
    
    console.log('✅ Database updated with free balance!');
    console.log(`   Bot will use: ${cash.free} NOK\n`);
    
  } catch (error) {
    console.error('❌ Error syncing balance:', error.message);
  }
}

syncBalance();