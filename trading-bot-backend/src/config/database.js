// ========================================
// DATABASE CONFIGURATION
// Sets up SQLite database and creates all tables
// ========================================

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

// Get database file path from environment variable
const dbPath = process.env.DATABASE_PATH || './trading_bot.db';

// Create/open database connection
const db = new Database(dbPath, { verbose: console.log });

// ========================================
// INITIALIZE DATABASE TABLES
// Creates all tables if they don't exist
// ========================================
function initializeDatabase() {
  console.log('Initializing database...');

  // Enable foreign key constraints
  db.pragma('foreign_keys = ON');

  // ========================================
  // TABLE 1: POSITIONS
  // Stores currently open positions (stocks you own)
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('warren', 'daytrader')),
      shares REAL NOT NULL CHECK(shares > 0),
      avg_price REAL NOT NULL CHECK(avg_price > 0),
      current_price REAL,
      invested REAL NOT NULL,
      current_value REAL,
      profit_loss REAL,
      opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ========================================
  // TABLE 2: TRADES
  // Historical record of all executed trades
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('warren', 'daytrader')),
      action TEXT NOT NULL CHECK(action IN ('BUY', 'SELL')),
      shares REAL NOT NULL CHECK(shares > 0),
      price REAL NOT NULL CHECK(price > 0),
      total REAL NOT NULL,
      reason TEXT,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ========================================
  // TABLE 3: WATCHLIST
  // Warren Mode's stocks to monitor
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT UNIQUE NOT NULL,
      name TEXT,
      pe_ratio REAL,
      debt_to_equity REAL,
      roe REAL,
      intrinsic_value REAL,
      current_price REAL,
      recommendation TEXT,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ========================================
  // TABLE 4: SETTINGS
  // Bot configuration (budget split, thresholds, etc.)
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default settings if they don't exist
  const defaultSettings = [
    { key: 'warren_allocation', value: '70' },
    { key: 'daytrader_allocation', value: '30' },
    { key: 'approval_threshold', value: '300' },
    { key: 'total_balance', value: '100000' },
    { key: 'bot_paused', value: 'false' },           // NEW: Global pause
    { key: 'warren_paused', value: 'false' },        // NEW: Warren pause
    { key: 'daytrader_paused', value: 'false' }      // NEW: Day Trader pause
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);

  for (const setting of defaultSettings) {
    insertSetting.run(setting.key, setting.value);
  }

  // ========================================
  // TABLE 5: PENDING_APPROVALS
  // Day Trader trades waiting for user approval
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('BUY', 'SELL')),
      shares REAL NOT NULL CHECK(shares > 0),
      price REAL NOT NULL CHECK(price > 0),
      total REAL NOT NULL,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Database initialized successfully!');
  console.log(`📁 Database location: ${path.resolve(dbPath)}`);
}

// ========================================
// HELPER FUNCTIONS FOR DATABASE QUERIES
// ========================================

// Get a setting value by key
function getSetting(key) {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const result = stmt.get(key);
  return result ? result.value : null;
}

// Update a setting value
function updateSetting(key, value) {
  const stmt = db.prepare(`
    UPDATE settings 
    SET value = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE key = ?
  `);
  return stmt.run(value, key);
}

// Get all settings as an object
function getAllSettings() {
  const stmt = db.prepare('SELECT key, value FROM settings');
  const rows = stmt.all();
  
  // Convert array of {key, value} to object
  const settings = {};
  rows.forEach(row => {
    settings[row.key] = row.value;
  });
  
  return settings;
}

// ========================================
// EXPORT DATABASE AND HELPER FUNCTIONS
// ========================================
module.exports = {
  db,
  initializeDatabase,
  getSetting,
  updateSetting,
  getAllSettings
};

// If this file is run directly (not imported), initialize the database
if (require.main === module) {
  initializeDatabase();
  console.log('\n✅ Database setup complete! You can now start the server.');
  process.exit(0);
}