// ========================================
// FUNDAMENTAL ANALYSIS UTILITIES
// Helper functions for Warren Mode calculations
// ========================================

/**
 * Calculate Return on Equity (ROE)
 * Measures how efficiently a company uses shareholder money
 * Formula: Net Income / Shareholder Equity
 * @param {number} netIncome - Annual net income
 * @param {number} equity - Total shareholder equity
 * @returns {number} ROE as percentage
 */
function calculateROE(netIncome, equity) {
  if (!equity || equity === 0) return 0;
  return (netIncome / equity) * 100;
}

/**
 * Calculate Price-to-Earnings (P/E) ratio
 * Measures how expensive a stock is relative to earnings
 * Formula: Stock Price / Earnings Per Share
 * @param {number} price - Current stock price
 * @param {number} eps - Earnings per share
 * @returns {number} P/E ratio
 */
function calculatePE(price, eps) {
  if (!eps || eps === 0) return null;
  return price / eps;
}

/**
 * Calculate Debt-to-Equity ratio
 * Measures financial leverage and risk
 * Formula: Total Debt / Total Equity
 * @param {number} debt - Total debt
 * @param {number} equity - Total equity
 * @returns {number} Debt-to-Equity ratio
 */
function calculateDebtToEquity(debt, equity) {
  if (!equity || equity === 0) return null;
  return debt / equity;
}

/**
 * Calculate Free Cash Flow
 * Cash available after capital expenditures
 * Formula: Operating Cash Flow - Capital Expenditures
 * @param {number} operatingCashFlow - Cash from operations
 * @param {number} capex - Capital expenditures
 * @returns {number} Free cash flow
 */
function calculateFreeCashFlow(operatingCashFlow, capex) {
  return operatingCashFlow - capex;
}

/**
 * Calculate Earnings Per Share (EPS)
 * Profit allocated to each share
 * Formula: Net Income / Shares Outstanding
 * @param {number} netIncome - Net income
 * @param {number} shares - Shares outstanding
 * @returns {number} EPS
 */
function calculateEPS(netIncome, shares) {
  if (!shares || shares === 0) return 0;
  return netIncome / shares;
}

/**
 * Calculate Book Value Per Share
 * Net asset value per share
 * Formula: (Assets - Liabilities) / Shares Outstanding
 * @param {number} assets - Total assets
 * @param {number} liabilities - Total liabilities
 * @param {number} shares - Shares outstanding
 * @returns {number} Book value per share
 */
function calculateBookValuePerShare(assets, liabilities, shares) {
  if (!shares || shares === 0) return 0;
  return (assets - liabilities) / shares;
}

/**
 * Calculate Margin of Safety
 * How much discount from intrinsic value
 * Formula: (Intrinsic Value - Current Price) / Intrinsic Value
 * @param {number} intrinsicValue - Calculated fair value
 * @param {number} currentPrice - Current market price
 * @returns {number} Margin of safety as percentage
 */
function calculateMarginOfSafety(intrinsicValue, currentPrice) {
  if (!intrinsicValue || intrinsicValue === 0) return 0;
  return ((intrinsicValue - currentPrice) / intrinsicValue) * 100;
}

/**
 * Assess if a company has a "moat" (competitive advantage)
 * Warren Buffett looks for companies with strong competitive advantages
 * @param {Object} metrics - Company metrics
 * @returns {Object} Assessment result
 */
function assessCompetitiveMoat(metrics) {
  const { roe, grossMargin, returnOnAssets, marketShare } = metrics;
  
  const moatIndicators = [];
  let moatScore = 0;
  
  // High ROE suggests competitive advantage
  if (roe && roe > 20) {
    moatIndicators.push('Consistently high ROE');
    moatScore += 2;
  }
  
  // High gross margins suggest pricing power
  if (grossMargin && grossMargin > 40) {
    moatIndicators.push('Strong gross margins');
    moatScore += 2;
  }
  
  // Strong asset utilization
  if (returnOnAssets && returnOnAssets > 10) {
    moatIndicators.push('Efficient asset use');
    moatScore += 1;
  }
  
  // Market leadership
  if (marketShare && marketShare > 20) {
    moatIndicators.push('Market leadership');
    moatScore += 2;
  }
  
  return {
    hasWide: moatScore >= 5,
    hasNarrow: moatScore >= 3,
    score: moatScore,
    indicators: moatIndicators
  };
}

/**
 * Generate recommendation based on fundamentals
 * @param {Object} stock - Stock data with fundamentals
 * @returns {string} Recommendation text
 */
function generateRecommendation(stock) {
  const { intrinsic_value, current_price, pe_ratio, roe, debt_to_equity } = stock;
  
  if (!intrinsic_value || !current_price) {
    return 'HOLD - Insufficient data for analysis';
  }
  
  const discount = calculateMarginOfSafety(intrinsic_value, current_price);
  
  // Strong buy signals
  if (discount > 20 && roe > 20 && debt_to_equity < 1) {
    return `STRONG BUY - Undervalued by ${discount.toFixed(0)}%, excellent fundamentals`;
  }
  
  // Buy signals
  if (discount > 10) {
    return `BUY - Undervalued by ${discount.toFixed(0)}%`;
  }
  
  // Hold signals
  if (discount > -5 && discount < 10) {
    return 'HOLD - Fairly priced';
  }
  
  // Sell signals
  if (discount < -10) {
    return `SELL - Overvalued by ${Math.abs(discount).toFixed(0)}%`;
  }
  
  return 'HOLD - Neutral fundamentals';
}

// ========================================
// EXPORT ALL FUNCTIONS
// ========================================

module.exports = {
  calculateROE,
  calculatePE,
  calculateDebtToEquity,
  calculateFreeCashFlow,
  calculateEPS,
  calculateBookValuePerShare,
  calculateMarginOfSafety,
  assessCompetitiveMoat,
  generateRecommendation
};