// ========================================
// TEST SCRIPT: Run position reconciliation NOW
// Instead of waiting for the 5-minute cron, trigger it directly.
// Useful right after cancelling an order on Trading212's side,
// to immediately clean up any phantom local positions.
// ========================================

require('dotenv').config();
const positionService = require('./src/services/positionService');

async function testReconcile() {
  console.log('\n========================================');
  console.log('🧪 Testing Position Reconciliation');
  console.log('========================================\n');

  const result = await positionService.updateAllPositions();

  console.log('\n========================================');
  console.log('📊 Reconciliation Summary');
  console.log('========================================');
  console.log(`Unchanged: ${result.unchanged}`);
  console.log(`Corrected: ${result.corrected}`);
  console.log(`Removed (phantom): ${result.removed}`);
  console.log(`Failed: ${result.failed}`);
  console.log('========================================\n');
}

testReconcile();