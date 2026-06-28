// ========================================
// TRADING212 CONFIGURATION
// Settings and constants for Trading212 API
// ========================================

require('dotenv').config();

// ========================================
// API CONFIGURATION
// ========================================

const config = {
  // API credentials from .env file
  apiKey: process.env.TRADING212_API_KEY,
  mode: process.env.TRADING212_MODE || 'demo',
  
  // API endpoints
  endpoints: {
    demo: 'https://demo.trading212.com/api/v0',
    live: 'https://live.trading212.com/api/v0'
  },
  
  // Request settings
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second between retries
  
  // Rate limiting (Trading212 limits)
  rateLimit: {
    requestsPerMinute: 60,
    burstLimit: 10 // Max requests in quick succession
  }
};

// ========================================
// VALIDATION
// Check that required config is present
// ========================================

function validateConfig() {
  const errors = [];
  
  if (!config.apiKey) {
    errors.push('TRADING212_API_KEY is not set in .env file');
  }
  
  if (!['demo', 'live'].includes(config.mode)) {
    errors.push('TRADING212_MODE must be either "demo" or "live"');
  }
  
  if (errors.length > 0) {
    console.error('❌ Trading212 Configuration Errors:');
    errors.forEach(err => console.error(`   - ${err}`));
    throw new Error('Invalid Trading212 configuration');
  }
  
  console.log('✅ Trading212 configuration valid');
  console.log(`   Mode: ${config.mode}`);
  console.log(`   Endpoint: ${config.endpoints[config.mode]}`);
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get the active API endpoint URL
 * @returns {string} Base URL for API requests
 */
function getEndpoint() {
  return config.endpoints[config.mode];
}

/**
 * Check if running in demo mode
 * @returns {boolean} True if demo mode
 */
function isDemoMode() {
  return config.mode === 'demo';
}

/**
 * Check if running in live mode
 * @returns {boolean} True if live mode
 */
function isLiveMode() {
  return config.mode === 'live';
}

/**
 * Get authorization header for API requests
 * @returns {Object} Headers object with authorization
 */
function getAuthHeaders() {
  return {
    'Authorization': config.apiKey,
    'Content-Type': 'application/json'
  };
}

// ========================================
// EXPORT CONFIGURATION
// ========================================

module.exports = {
  config,
  validateConfig,
  getEndpoint,
  isDemoMode,
  isLiveMode,
  getAuthHeaders
};