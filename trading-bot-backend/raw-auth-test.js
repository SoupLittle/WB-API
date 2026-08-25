// ========================================
// RAW AUTH TEST - bypasses trading212Service.js entirely
// Tests the simplest possible authenticated request
// so we can rule our own wrapper code in or out
// ========================================

require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.TRADING212_API_KEY;
const API_SECRET = process.env.TRADING212_API_SECRET;
const MODE = process.env.TRADING212_MODE || 'demo';
const BASE_URL = MODE === 'live'
  ? 'https://live.trading212.com'
  : 'https://demo.trading212.com';

const credentials = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

console.log('\n========================================');
console.log('🔍 Raw auth test');
console.log('========================================\n');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Base64 credential preview: ${credentials.slice(0, 6)}...${credentials.slice(-6)}`);
console.log(`Base64 credential length: ${credentials.length}\n`);

async function rawTest() {
  try {
    const response = await axios.get(`${BASE_URL}/api/v0/equity/account/cash`, {
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });
    console.log('✅ SUCCESS!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log(`❌ FAILED - HTTP ${error.response.status}`);
      console.log('Response headers:', JSON.stringify(error.response.headers, null, 2));
      console.log('Response body:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ No response at all:', error.message);
    }
  }
}

rawTest();
