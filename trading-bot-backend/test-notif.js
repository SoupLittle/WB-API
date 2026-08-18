// ========================================
// TEST SCRIPT: Send a Test Notification
// Confirms your NTFY_TOPIC is set up correctly
// and that a notification actually reaches your phone/browser
// ========================================

require('dotenv').config();
const notificationService = require('./src/services/notificationService');

async function testNotification() {
  console.log('\n========================================');
  console.log('🧪 Testing Notification Service');
  console.log('========================================\n');

  const topic = process.env.NTFY_TOPIC;

  if (!topic) {
    console.log('⚠️  NTFY_TOPIC is not set in .env - falling back to the default');
    console.log('   "trading-bot-notifications", which is PUBLIC. Set your own');
    console.log('   private topic name in .env before relying on this.\n');
  } else {
    console.log(`📡 Sending to topic: ${topic}`);
    console.log(`   Subscribe at: https://ntfy.sh/${topic}`);
    console.log('   (or add this topic in the ntfy app)\n');
  }

  const result = await notificationService.sendTestNotification();

  if (result.success) {
    console.log('✅ Notification sent successfully!');
    console.log('   Check your phone (ntfy app) or the ntfy.sh web page.');
  } else {
    console.log('❌ Notification failed to send.');
    console.log(`   Error: ${result.error}`);
  }

  console.log('\n========================================\n');
}

// Run the test
if (require.main === module) {
  testNotification();
}

module.exports = { testNotification };