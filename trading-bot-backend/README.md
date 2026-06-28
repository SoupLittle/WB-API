# Trading Bot Backend

Dual-mode trading bot with Warren Buffett (long-term value) and Day Trader (technical analysis) strategies.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Edit the `.env` file and add your Trading212 API key:
```env
TRADING212_API_KEY=your_actual_api_key_here
```

### 3. Initialize Database
```bash
npm run init-db
```

This creates the SQLite database and all required tables.

### 4. Start the Server
```bash
# Production mode
npm start

# Development mode (auto-restarts on file changes)
npm run dev
```

The server will start on `http://localhost:3001`

## 📡 API Endpoints

### Status
- `GET /api/status` - Get bot status and balance

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings/allocation` - Update budget split
  ```json
  { "warren": 70, "daytrader": 30 }
  ```
- `PUT /api/settings/threshold` - Update approval threshold
  ```json
  { "threshold": 500 }
  ```

### Positions (Coming Soon)
- `GET /api/positions` - Get all positions
- `GET /api/positions/warren` - Get Warren mode positions
- `GET /api/positions/daytrader` - Get Day Trader positions

### Trades (Coming Soon)
- `GET /api/trades` - Get trade history

### Watchlist (Coming Soon)
- `GET /api/watchlist` - Get Warren's watchlist
- `POST /api/watchlist` - Add stock to watchlist

## 📁 Project Structure

```
trading-bot-backend/
├── src/
│   ├── config/         # Database & API configuration
│   ├── models/         # Database models (Position, Trade, etc.)
│   ├── services/       # Business logic (Warren, Day Trader modes)
│   ├── routes/         # API endpoints
│   ├── utils/          # Helper functions
│   └── server.js       # Main entry point
├── .env                # Environment variables (DON'T COMMIT THIS!)
├── package.json
└── README.md
```

## 🛠️ Development

### Testing the API
You can test endpoints using:
- Browser: `http://localhost:3001/api/status`
- curl: `curl http://localhost:3001/api/status`
- Postman or similar tools

### Database Location
The SQLite database is stored at: `./trading_bot.db`

You can view it using tools like:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- VS Code extension: SQLite Viewer

## 📊 Current Implementation Status

✅ **Completed:**
- Database schema and initialization
- Express server setup
- Settings API endpoints
- Scheduled tasks framework

🚧 **In Progress:**
- Trading212 API integration
- Warren Mode logic
- Day Trader Mode logic
- Remaining API routes

## ⚙️ Configuration

All settings are stored in the `settings` table in the database. Default values:
- Warren Allocation: 70%
- Day Trader Allocation: 30%
- Approval Threshold: 300 NOK
- Total Balance: 100,000 NOK (demo)

## 🔒 Security Notes

- **NEVER commit your `.env` file** to Git
- Use demo mode for testing
- Review all trades before going live
- Keep your API keys secure

## 📝 Next Steps

1. Complete remaining route files (positions, trades, watchlist)
2. Implement Trading212 API service
3. Build Warren Mode strategy logic
4. Build Day Trader Mode strategy logic
5. Connect frontend to backend
6. Test thoroughly with demo account
7. Deploy to your mini server

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Change PORT in .env file
PORT=3002
```

**Database errors:**
```bash
# Reinitialize database
npm run init-db
```

**Dependencies not found:**
```bash
# Reinstall all packages
rm -rf node_modules package-lock.json
npm install
```