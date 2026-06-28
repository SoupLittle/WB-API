// ========================================
// NOTIFICATION SERVICE
// Sends push notifications to your phone
// ========================================

const axios = require('axios');
require('dotenv').config();

// ========================================
// CONFIGURATION
// ========================================

// Your unique ntfy.sh topic - change this to something unique!
// Example: trading-bot-marlene-abc123
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'trading-bot-notifications';

// Your server's public URL (for approval links)
// In development: http://localhost:3001
// In production on Raspberry Pi: your public IP or domain
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

// ========================================
// SEND NOTIFICATION
// ========================================

/**
 * Send a push notification via ntfy.sh
 * @param {string} title - Notification title
 * @param {string} message - Notification body
 * @param {Object} options - Additional options
 */
async function sendNotification(title, message, options = {}) {
  try {
    const {
      priority = 'default',  // min, low, default, high, urgent
      tags = [],             // Array of emoji tags like ['warning', 'chart']
      click = null,          // URL to open when clicked
      actions = []           // Array of action buttons
    } = options;
    
    const payload = {
      topic: NTFY_TOPIC,
      title: title,
      message: message,
      priority: priority,
      tags: tags
    };
    
    if (click) {
      payload.click = click;
    }
    
    if (actions.length > 0) {
      payload.actions = actions;
    }
    
    const response = await axios.post('https://ntfy.sh', payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📱 Notification sent: ${title}`);
    return { success: true, response: response.data };
    
  } catch (error) {
    console.error('❌ Failed to send notification:', error.message);
    return { success: false, error: error.message };
  }
}

// ========================================
// SPECIALIZED NOTIFICATIONS
// ========================================

/**
 * Send trade approval notification
 * @param {Object} approval - Pending approval object
 */
async function sendTradeApproval(approval) {
  const title = `🔔 Trade Approval Needed`;
  const message = `${approval.action} ${approval.shares} shares of ${approval.ticker}\n` +
                  `Total: ${approval.total} NOK\n` +
                  `Reason: ${approval.reason}`;
  
  // Create approval URLs
  const approveUrl = `${SERVER_URL}/api/approvals/${approval.id}/approve`;
  const rejectUrl = `${SERVER_URL}/api/approvals/${approval.id}/reject`;
  const dashboardUrl = `${SERVER_URL}`;
  
  await sendNotification(title, message, {
    priority: 'high',
    tags: ['chart_increasing', 'warning'],
    click: dashboardUrl,
    actions: [
      {
        action: 'http',
        label: '✅ Approve',
        url: approveUrl,
        method: 'POST'
      },
      {
        action: 'http',
        label: '❌ Reject',
        url: rejectUrl,
        method: 'POST'
      },
      {
        action: 'view',
        label: '📊 Open Dashboard',
        url: dashboardUrl
      }
    ]
  });
}

/**
 * Send trade execution notification
 * @param {Object} trade - Executed trade object
 */
async function sendTradeExecuted(trade) {
  const title = trade.success 
    ? `✅ Trade Executed`
    : `❌ Trade Failed`;
    
  const message = trade.success
    ? `${trade.action} ${trade.shares} shares of ${trade.ticker}\nPrice: ${trade.price} NOK\nTotal: ${trade.total} NOK`
    : `Failed to ${trade.action} ${trade.ticker}: ${trade.error}`;
  
  await sendNotification(title, message, {
    priority: trade.success ? 'default' : 'high',
    tags: trade.success ? ['heavy_check_mark', 'moneybag'] : ['x', 'warning'],
    click: SERVER_URL
  });
}

/**
 * Send bot status notification (paused/resumed/error)
 * @param {string} status - Status message
 * @param {string} type - Type: 'info', 'warning', 'error'
 */
async function sendBotStatus(status, type = 'info') {
  const emoji = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅'
  };
  
  const tags = {
    info: ['information_source'],
    warning: ['warning'],
    error: ['x'],
    success: ['heavy_check_mark']
  };
  
  const priority = type === 'error' ? 'high' : 'default';
  
  await sendNotification(`${emoji[type]} Trading Bot`, status, {
    priority: priority,
    tags: tags[type],
    click: SERVER_URL
  });
}

/**
 * Send daily summary notification
 * @param {Object} summary - Daily trading summary
 */
async function sendDailySummary(summary) {
  const title = '📊 Daily Trading Summary';
  const message = 
    `Warren Mode: ${summary.warren.trades} trades, ${summary.warren.profit > 0 ? '+' : ''}${summary.warren.profit} NOK\n` +
    `Day Trader: ${summary.daytrader.trades} trades, ${summary.daytrader.profit > 0 ? '+' : ''}${summary.daytrader.profit} NOK\n` +
    `Total P/L: ${summary.total.profit > 0 ? '+' : ''}${summary.total.profit} NOK`;
  
  await sendNotification(title, message, {
    priority: 'low',
    tags: ['chart_with_upwards_trend', 'moneybag'],
    click: SERVER_URL
  });
}

/**
 * Test notification (for setup)
 */
async function sendTestNotification() {
  await sendNotification(
    '🤖 Trading Bot Connected!',
    'Your trading bot is now connected and ready to send notifications.',
    {
      priority: 'default',
      tags: ['robot', 'heavy_check_mark'],
      click: SERVER_URL,
      actions: [
        {
          action: 'view',
          label: '📊 Open Dashboard',
          url: SERVER_URL
        }
      ]
    }
  );
}

// ========================================
// EXPORT
// ========================================

module.exports = {
  sendNotification,
  sendTradeApproval,
  sendTradeExecuted,
  sendBotStatus,
  sendDailySummary,
  sendTestNotification
};