// ========================================
// TRADING212 API SERVICE
// Handles all communication with Trading212 API
// ========================================

const axios = require('axios');
require('dotenv').config();

// ========================================
// API CONFIGURATION
// ========================================

// Get API credentials from environment variables
const API_KEY = process.env.TRADING212_API_KEY;
const API_SECRET = process.env.TRADING212_API_SECRET;
const MODE = process.env.TRADING212_MODE || 'demo';

// Validate that both key and secret are present
if (!API_KEY || !API_SECRET) {
  console.error('❌ Missing Trading212 credentials in .env file!');
  console.error('   You need both TRADING212_API_KEY and TRADING212_API_SECRET');
  throw new Error('Trading212 API credentials not configured');
}

// Set base URL based on mode
const BASE_URL = MODE === 'live' 
  ? 'https://live.trading212.com/api/v0'
  : 'https://demo.trading212.com/api/v0';

// Create Basic Auth credentials (API_KEY:API_SECRET encoded in Base64)
const credentials = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
const authHeader = `Basic ${credentials}`;

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 second timeout
});

// ========================================
// ERROR HANDLING HELPER
// ========================================
function handleApiError(error, context) {
  if (error.response) {
    // Server responded with error status
    console.error(`❌ Trading212 API Error (${context}):`, {
      status: error.response.status,
      message: error.response.data
    });
    
    if (error.response.status === 401) {
      throw new Error('Invalid API key - check your .env file');
    }
    if (error.response.status === 429) {
      throw new Error('Rate limit exceeded - too many requests');
    }
    
    throw new Error(`Trading212 API error: ${error.response.data.message || error.response.statusText}`);
  } else if (error.request) {
    // Request was made but no response
    console.error(`❌ No response from Trading212 (${context})`);
    throw new Error('Cannot connect to Trading212 - check your internet connection');
  } else {
    // Something else went wrong
    console.error(`❌ Request error (${context}):`, error.message);
    throw error;
  }
}

// ========================================
// ACCOUNT METHODS
// ========================================

/**
 * Get account cash balance
 * @returns {Promise<Object>} Account cash info
 */
async function getAccountCash() {
  try {
    console.log('📊 Fetching account cash...');
    const response = await api.get('/equity/account/cash');
    console.log('✅ Account cash retrieved:', response.data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'getAccountCash');
  }
}

/**
 * Get full account info (balance, positions, etc.)
 * @returns {Promise<Object>} Complete account info
 */
async function getAccountInfo() {
  try {
    console.log('📊 Fetching account info...');
    const response = await api.get('/equity/account/info');
    console.log('✅ Account info retrieved');
    return response.data;
  } catch (error) {
    handleApiError(error, 'getAccountInfo');
  }
}

// ========================================
// PORTFOLIO METHODS
// ========================================

/**
 * Get all current positions
 * @returns {Promise<Array>} Array of position objects
 */
async function getPortfolio() {
  try {
    console.log('📊 Fetching portfolio positions...');
    const response = await api.get('/equity/portfolio');
    console.log(`✅ Portfolio retrieved: ${response.data.length} positions`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'getPortfolio');
  }
}

/**
 * Get a specific position by ticker
 * @param {string} ticker - Stock ticker (e.g., 'AAPL')
 * @returns {Promise<Object|null>} Position object or null if not found
 */
async function getPosition(ticker) {
  try {
    const portfolio = await getPortfolio();
    const position = portfolio.find(p => p.ticker === ticker.toUpperCase());
    return position || null;
  } catch (error) {
    handleApiError(error, 'getPosition');
  }
}

// ========================================
// ORDERS METHODS
// ========================================

/**
 * Place a market order (buy/sell at current market price)
 * @param {string} ticker - Stock ticker (e.g., 'AAPL')
 * @param {number} quantity - Number of shares
 * @param {string} action - 'BUY' or 'SELL'
 * @returns {Promise<Object>} Order confirmation
 */
async function placeMarketOrder(ticker, quantity, action = 'BUY') {
  try {
    console.log(`📝 Placing ${action} order: ${quantity} shares of ${ticker}`);
    
    // For SELL orders, quantity must be negative
    const adjustedQuantity = action === 'SELL' ? -quantity : quantity;
    
    // Trading212 market orders only need ticker and quantity
    const orderData = {
      ticker: ticker.toUpperCase(),
      quantity: adjustedQuantity
    };
    
    const response = await api.post('/equity/orders/market', orderData);
    console.log(`✅ ${action} order placed successfully:`, response.data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'placeMarketOrder');
  }
}

/**
 * Place a limit order (buy/sell at specific price)
 * @param {string} ticker - Stock ticker
 * @param {number} quantity - Number of shares
 * @param {number} limitPrice - Price per share
 * @param {string} action - 'BUY' or 'SELL'
 * @returns {Promise<Object>} Order confirmation
 */
async function placeLimitOrder(ticker, quantity, limitPrice, action = 'BUY') {
  try {
    console.log(`📝 Placing ${action} limit order: ${quantity} shares of ${ticker} at ${limitPrice}`);
    
    const orderData = {
      ticker: ticker.toUpperCase(),
      quantity: quantity,
      limitPrice: limitPrice,
      timeValidity: 'DAY'
    };
    
    const response = await api.post('/equity/orders/limit', orderData);
    console.log(`✅ ${action} limit order placed successfully:`, response.data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'placeLimitOrder');
  }
}

/**
 * Get all open orders
 * @returns {Promise<Array>} Array of open orders
 */
async function getOpenOrders() {
  try {
    console.log('📊 Fetching open orders...');
    const response = await api.get('/equity/orders');
    console.log(`✅ Open orders retrieved: ${response.data.length} orders`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'getOpenOrders');
  }
}

/**
 * Cancel an order
 * @param {string} orderId - Order ID to cancel
 * @returns {Promise<Object>} Cancellation confirmation
 */
async function cancelOrder(orderId) {
  try {
    console.log(`📝 Cancelling order: ${orderId}`);
    const response = await api.delete(`/equity/orders/${orderId}`);
    console.log('✅ Order cancelled successfully');
    return response.data;
  } catch (error) {
    handleApiError(error, 'cancelOrder');
  }
}

// ========================================
// PRICE DATA METHODS
// ========================================

/**
 * Get current price for a stock
 * @param {string} ticker - Stock ticker (short form or full)
 * @returns {Promise<number>} Current price
 */
async function getCurrentPrice(ticker) {
  try {
    const upperTicker = ticker.toUpperCase();
    
    // First, try to get it from our current portfolio
    const portfolio = await getPortfolio();
    
    // Try both short and full ticker formats
    let position = portfolio.find(p => p.ticker === upperTicker);
    if (!position) {
      position = portfolio.find(p => p.ticker === `${upperTicker}_US_EQ`);
    }
    
    if (position && position.currentPrice) {
      console.log(`   Got price from portfolio: ${position.currentPrice}`);
      return position.currentPrice;
    }
    
    // If not in portfolio, get from instruments metadata
    const response = await api.get('/equity/metadata/instruments');
    
    // Try to find exact match or with _US_EQ suffix
    let instrument = response.data.find(i => i.ticker === upperTicker);
    if (!instrument) {
      instrument = response.data.find(i => i.ticker === `${upperTicker}_US_EQ`);
    }
    
    if (instrument && instrument.currentPrice) {
      console.log(`   Got price from instruments: ${instrument.currentPrice}`);
      return instrument.currentPrice;
    }
    
    console.log(`   ⚠️ No price found for ${ticker}`);
    return null;
  } catch (error) {
    console.log(`   ⚠️ Could not fetch price for ${ticker}`);
    return null;
  }
}

/**
 * Get historical prices for technical analysis
 * @param {string} ticker - Stock ticker
 * @param {string} period - Time period ('1d', '1w', '1m', '1y')
 * @returns {Promise<Array>} Array of historical price data
 */
async function getHistoricalPrices(ticker, period = '1m') {
  try {
    console.log(`📊 Fetching historical prices for ${ticker} (${period})...`);
    const response = await api.get(`/equity/history/orders/${ticker}`, {
      params: { period }
    });
    console.log(`✅ Historical data retrieved`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'getHistoricalPrices');
  }
}

// ========================================
// INSTRUMENT SEARCH METHODS
// ========================================

/**
 * Search for stocks/instruments
 * @param {string} query - Search query (ticker or company name)
 * @returns {Promise<Array>} Array of matching instruments
 */
async function searchInstruments(query) {
  try {
    console.log(`🔍 Searching for: ${query}`);
    const response = await api.get('/equity/metadata/instruments');
    
    // Filter results by query
    const results = response.data.filter(instrument => 
      instrument.ticker.includes(query.toUpperCase()) ||
      instrument.name.toLowerCase().includes(query.toLowerCase())
    );
    
    console.log(`✅ Found ${results.length} matches`);
    return results.slice(0, 10); // Return top 10 matches
  } catch (error) {
    handleApiError(error, 'searchInstruments');
  }
}

// ========================================
// UTILITY METHODS
// ========================================

/**
 * Test API connection
 * @returns {Promise<boolean>} True if connected successfully
 */
async function testConnection() {
  try {
    console.log('🔌 Testing Trading212 API connection...');
    console.log(`   Mode: ${MODE}`);
    console.log(`   URL: ${BASE_URL}`);
    
    await getAccountCash();
    console.log('✅ Trading212 API connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Trading212 API connection failed!');
    console.error('   Make sure your API key is correct in .env file');
    return false;
  }
}

// ========================================
// EXPORT ALL METHODS
// ========================================
module.exports = {
  // Account
  getAccountCash,
  getAccountInfo,
  
  // Portfolio
  getPortfolio,
  getPosition,
  
  // Orders
  placeMarketOrder,
  placeLimitOrder,
  getOpenOrders,
  cancelOrder,
  
  // Prices
  getCurrentPrice,
  getHistoricalPrices,
  
  // Search
  searchInstruments,
  
  // Utility
  testConnection,
  
  // Export config for debugging
  config: {
    mode: MODE,
    baseUrl: BASE_URL
  }
};

// ========================================
// TEST IF RUN DIRECTLY
// If you run this file directly, it tests the connection
// ========================================
if (require.main === module) {
  (async () => {
    console.log('\n========================================');
    console.log('Testing Trading212 API Connection');
    console.log('========================================\n');
    
    const connected = await testConnection();
    
    if (connected) {
      console.log('\n✅ All systems go! Your API key is working.');
      
      // Try to get account info
      try {
        const cash = await getAccountCash();
        console.log('\n💰 Account Balance:');
        console.log(`   Free: ${cash.free} ${cash.currency}`);
        console.log(`   Total: ${cash.total} ${cash.currency}`);
      } catch (err) {
        console.log('\n⚠️  Could not fetch account details');
      }
    } else {
      console.log('\n❌ Connection failed. Check your .env file:');
      console.log('   - TRADING212_API_KEY should be your actual API key');
      console.log('   - TRADING212_MODE should be "demo" or "live"');
    }
    
    console.log('\n========================================\n');
    process.exit(connected ? 0 : 1);
  })();
}