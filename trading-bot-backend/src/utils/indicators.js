// ========================================
// TECHNICAL INDICATORS UTILITIES
// Helper functions for Day Trader Mode
// ========================================

/**
 * Calculate Simple Moving Average (SMA)
 * @param {Array<number>} data - Price data
 * @param {number} period - Period length
 * @returns {number} SMA value
 */
function calculateSMA(data, period) {
  if (data.length < period) return null;
  
  const slice = data.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * Calculate momentum (rate of change)
 * @param {Array<number>} data - Price data
 * @param {number} period - Lookback period
 * @returns {number} Momentum percentage
 */
function calculateMomentum(data, period = 10) {
  if (data.length < period + 1) return null;
  
  const current = data[data.length - 1];
  const past = data[data.length - period - 1];
  
  return ((current - past) / past) * 100;
}

/**
 * Detect if price is in an uptrend
 * @param {Array<number>} data - Price data
 * @returns {boolean} True if uptrend
 */
function isUptrend(data) {
  if (data.length < 3) return false;
  
  const recent = data.slice(-3);
  return recent[2] > recent[1] && recent[1] > recent[0];
}

/**
 * Detect if price is in a downtrend
 * @param {Array<number>} data - Price data
 * @returns {boolean} True if downtrend
 */
function isDowntrend(data) {
  if (data.length < 3) return false;
  
  const recent = data.slice(-3);
  return recent[2] < recent[1] && recent[1] < recent[0];
}

/**
 * Calculate volatility (standard deviation)
 * @param {Array<number>} data - Price data
 * @param {number} period - Period length
 * @returns {number} Volatility
 */
function calculateVolatility(data, period = 20) {
  if (data.length < period) return null;
  
  const slice = data.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  
  const squaredDiffs = slice.map(value => Math.pow(value - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  
  return Math.sqrt(variance);
}

/**
 * Detect support level (price floor)
 * @param {Array<number>} data - Price data
 * @returns {number} Support level
 */
function findSupportLevel(data) {
  if (data.length < 20) return null;
  
  const recent = data.slice(-20);
  return Math.min(...recent);
}

/**
 * Detect resistance level (price ceiling)
 * @param {Array<number>} data - Price data
 * @returns {number} Resistance level
 */
function findResistanceLevel(data) {
  if (data.length < 20) return null;
  
  const recent = data.slice(-20);
  return Math.max(...recent);
}

/**
 * Generate trading signal strength (0-100)
 * @param {Object} indicators - All calculated indicators
 * @returns {number} Signal strength
 */
function calculateSignalStrength(indicators) {
  let strength = 50; // Neutral start
  
  // RSI contribution
  if (indicators.rsi) {
    if (indicators.rsi < 30) strength += 20; // Oversold - bullish
    if (indicators.rsi > 70) strength -= 20; // Overbought - bearish
  }
  
  // MACD contribution
  if (indicators.macd && indicators.signal) {
    if (indicators.macd > indicators.signal) strength += 15; // Bullish
    if (indicators.macd < indicators.signal) strength -= 15; // Bearish
  }
  
  // EMA contribution
  if (indicators.ema10 && indicators.ema20) {
    if (indicators.ema10 > indicators.ema20) strength += 10; // Uptrend
    if (indicators.ema10 < indicators.ema20) strength -= 10; // Downtrend
  }
  
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, strength));
}

module.exports = {
  calculateSMA,
  calculateMomentum,
  isUptrend,
  isDowntrend,
  calculateVolatility,
  findSupportLevel,
  findResistanceLevel,
  calculateSignalStrength
};