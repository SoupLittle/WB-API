// ========================================
// MARKET DATA SERVICE
// Live stock prices + fundamentals via Twelve Data - separate from Trading212.
//
// WHY THIS EXISTS: Trading212's API only returns a live price for
// stocks you already own (confirmed by testing). For a watchlist
// candidate you're evaluating but don't own yet, there's no price
// available from Trading212 at all. Twelve Data covers that gap -
// Trading212 stays purely for order execution, Twelve Data is purely
// for "what's this trading at right now".
//
// WHY TWELVE DATA (not Finnhub): Finnhub's free tier is US-only for
// live data - international exchanges need a paid plan. Twelve Data's
// own product page specifically advertises free-tier coverage of
// European exchanges (Cboe Europe), which matters since this account
// occasionally trades EU stocks, not just US ones.
//
// EU TICKERS: unlike US tickers, which are globally unique, an EU
// ticker usually needs its exchange specified too (e.g. "SAP" trades
// on multiple European exchanges) - getQuote() and getFundamentals()
// both accept an optional second `exchange` argument for this.
// For US stocks, just pass the ticker alone.
//
// RATE LIMITING: Twelve Data's free tier allows 800 requests/DAY
// (not per-minute like Finnhub). This throttles BOTH a minimum
// interval between calls (to avoid any undocumented burst limits)
// AND a running daily counter that refuses further calls once the
// 800/day budget is used up, rather than silently failing partway
// through a scan.
// ========================================

const axios = require('axios');

const API_KEY = process.env.TWELVEDATA_API_KEY;
const BASE_URL = 'https://api.twelvedata.com';

const MIN_INTERVAL_MS = 1000; // conservative spacing between calls
const DAILY_LIMIT = 800;

let lastCallTime = 0;
let dailyCount = 0;
let dailyCountResetAt = getNextMidnight();

function getNextMidnight() {
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  return next.getTime();
}

async function throttle() {
  // Reset the daily counter if we've crossed into a new day
  if (Date.now() >= dailyCountResetAt) {
    dailyCount = 0;
    dailyCountResetAt = getNextMidnight();
  }

  if (dailyCount >= DAILY_LIMIT) {
    throw new Error(`Twelve Data daily free-tier limit (${DAILY_LIMIT} requests) reached - try again tomorrow`);
  }

  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastCallTime = Date.now();
  dailyCount++;
}

/**
 * Get the current live price for a ticker from Twelve Data.
 * @param {string} ticker - e.g. 'AAPL', 'F', or for EU stocks e.g. 'SAP'
 * @param {string} [exchange] - e.g. 'XETRA' for EU tickers that need one
 * @returns {Promise<number|null>}
 */
async function getQuote(ticker, exchange = null) {
  if (!API_KEY) {
    console.log('   ⚠️ TWELVEDATA_API_KEY not set in .env - cannot fetch live price');
    return null;
  }

  try {
    await throttle();

    const params = { symbol: ticker.toUpperCase(), apikey: API_KEY };
    if (exchange) params.exchange = exchange;

    const response = await axios.get(`${BASE_URL}/price`, { params });

    // Twelve Data returns { price: "123.45" } on success, or
    // { status: "error", message: "..." } on failure - it uses HTTP 200
    // for both, so we have to check the response body, not just the status
    if (response.data?.status === 'error') {
      console.log(`   ⚠️ Twelve Data: ${response.data.message}`);
      return null;
    }

    const price = parseFloat(response.data?.price);
    return isNaN(price) ? null : price;
  } catch (error) {
    console.log(`   ❌ Twelve Data price error for ${ticker}: ${error.message}`);
    return null;
  }
}

/**
 * Get key fundamentals (P/E, ROE, debt/equity) for a ticker from Twelve Data.
 * UNCERTAIN: Twelve Data's /statistics endpoint may require a paid plan -
 * this hasn't been confirmed against a live free-tier key yet. If it
 * fails or comes back empty, that's expected until confirmed otherwise -
 * the caller falls back to whatever's already stored for that stock.
 * @param {string} ticker
 * @param {string} [exchange]
 * @returns {Promise<{peRatio: number|null, roe: number|null, debtToEquity: number|null}>}
 */
async function getFundamentals(ticker, exchange = null) {
  const empty = { peRatio: null, roe: null, debtToEquity: null };

  if (!API_KEY) {
    console.log('   ⚠️ TWELVEDATA_API_KEY not set in .env - cannot fetch fundamentals');
    return empty;
  }

  try {
    await throttle();

    const params = { symbol: ticker.toUpperCase(), apikey: API_KEY };
    if (exchange) params.exchange = exchange;

    const response = await axios.get(`${BASE_URL}/statistics`, { params });

    if (response.data?.status === 'error') {
      console.log(`   ⚠️ Twelve Data fundamentals for ${ticker}: ${response.data.message}`);
      console.log('   (This may mean fundamentals require a paid Twelve Data plan -');
      console.log('    price data still works independently of this.)');
      return empty;
    }

    const stats = response.data?.statistics || {};
    const valuation = stats.valuations_metrics || {};
    const financials = stats.financials || {};

    const peRatio = valuation.trailing_pe ?? valuation.forward_pe ?? null;
    const roe = financials.return_on_equity_ttm ?? null;
    const debtToEquity = financials.total_debt_to_equity_mrq ?? null;

    if (peRatio === null && roe === null && debtToEquity === null) {
      console.log(`   ⚠️ Could not find expected fundamental fields for ${ticker}.`);
      console.log('   Raw Twelve Data statistics object:', JSON.stringify(stats).slice(0, 500));
    }

    return { peRatio, roe, debtToEquity };
  } catch (error) {
    console.log(`   ❌ Twelve Data fundamentals error for ${ticker}: ${error.message}`);
    return empty;
  }
}

/**
 * Get the current exchange rate between two currencies.
 * Needed because Trading212 only EXECUTES orders in the account's
 * base currency (NOK for this account) - a stock priced in USD or
 * EUR must be converted before any NOK budget math touches it.
 * @param {string} from - e.g. 'USD'
 * @param {string} to - e.g. 'NOK'
 * @returns {Promise<number|null>} Rate such that amount_in_`from` * rate = amount_in_`to`
 */
async function getExchangeRate(from, to) {
  if (from === to) return 1;

  if (!API_KEY) {
    console.log('   ⚠️ TWELVEDATA_API_KEY not set in .env - cannot fetch exchange rate');
    return null;
  }

  try {
    await throttle();

    const response = await axios.get(`${BASE_URL}/exchange_rate`, {
      params: {
        symbol: `${from}/${to}`,
        apikey: API_KEY
      }
    });

    if (response.data?.status === 'error') {
      console.log(`   ⚠️ Twelve Data exchange rate ${from}/${to}: ${response.data.message}`);
      return null;
    }

    const rate = parseFloat(response.data?.rate);
    return isNaN(rate) ? null : rate;
  } catch (error) {
    console.log(`   ❌ Twelve Data exchange rate error (${from}/${to}): ${error.message}`);
    return null;
  }
}

module.exports = {
  getQuote,
  getFundamentals,
  getExchangeRate
};
