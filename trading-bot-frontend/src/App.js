import React, { useState, useEffect } from 'react';
import { TrendingUp, Brain, Zap, Settings, AlertCircle, CheckCircle, XCircle, Activity, RefreshCw } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

const TradingDashboard = () => {
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [warrenPositions, setWarrenPositions] = useState([]);
  const [dayTraderPositions, setDayTraderPositions] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tempWarrenAllocation, setTempWarrenAllocation] = useState(70);
  const [scanningWarren, setScanningWarren] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [pauseStatus, setPauseStatus] = useState({
    bot_paused: false,
    warren_paused: false,
    daytrader_paused: false,
    warren_active: true,
    daytrader_active: true
  });
  
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const responses = await Promise.all([
        fetch(`${API_URL}/status`),
        fetch(`${API_URL}/settings`),
        fetch(`${API_URL}/watchlist`),
        fetch(`${API_URL}/positions/warren`),
        fetch(`${API_URL}/positions/daytrader`),
        fetch(`${API_URL}/approvals/pending`),
        fetch(`${API_URL}/settings/status`)
      ]);
      
      const [statusData, settingsData, watchlistData, warrenPosData, dayTraderPosData, approvalsData, pauseData] = await Promise.all(
        responses.map(r => r.json())
      );
      
      setStatus(statusData);
      setSettings(settingsData);
      setWatchlist(watchlistData);
      setWarrenPositions(warrenPosData);
      setDayTraderPositions(dayTraderPosData);
      setPendingApprovals(approvalsData);
      setTempWarrenAllocation(settingsData.warren_allocation);
      setPauseStatus(pauseData);
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to connect to backend');
      setLoading(false);
    }
  };
  
  const updateAllocation = async () => {
    try {
      await fetch(`${API_URL}/settings/allocation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warren: tempWarrenAllocation, daytrader: 100 - tempWarrenAllocation })
      });
      fetchAllData();
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  const handleApprove = async (id) => {
    try {
      await fetch(`${API_URL}/approvals/${id}/approve`, { method: 'POST' });
      fetchAllData();
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  const handleReject = async (id) => {
    try {
      await fetch(`${API_URL}/approvals/${id}/reject`, { method: 'POST' });
      fetchAllData();
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  const handleWarrenScan = async () => {
    try {
      setScanningWarren(true);
      const response = await fetch(`${API_URL}/warren/scan`, { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setScanResult(data.results);
        alert(`Scan Complete!\nScanned: ${data.results.scanned}\nOpportunities: ${data.results.opportunities}\nTrades: ${data.results.trades_executed}`);
        setTimeout(() => fetchAllData(), 1000);
      }
      setScanningWarren(false);
    } catch (err) {
      console.error('Error:', err);
      setScanningWarren(false);
    }
  };
  
  const handlePause = async (mode) => {
    try {
      await fetch(`${API_URL}/settings/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      fetchAllData();
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  const handleResume = async (mode) => {
    try {
      await fetch(`${API_URL}/settings/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      fetchAllData();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  if (!settings || !status) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex items-center justify-center">
        {loading ? (
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-xl">Loading...</p>
          </div>
        ) : (
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-xl mb-2">Connection Error</p>
            <p className="text-sm text-gray-400 mb-4">{error}</p>
            <button onClick={fetchAllData} className="px-6 py-3 bg-blue-600 rounded-lg">Try Again</button>
          </div>
        )}
      </div>
    );
  }

  const totalBalance = status.balance.total;
  const warrenAllocation = settings.warren_allocation;
  const dayTraderAllocation = settings.daytrader_allocation;
  const warrenBudget = (totalBalance * warrenAllocation / 100).toFixed(0);
  const dayTraderBudget = (totalBalance * dayTraderAllocation / 100).toFixed(0);
  const warrenUsed = warrenPositions.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const dayTraderUsed = dayTraderPositions.reduce((sum, p) => sum + (p.current_value || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <TrendingUp className="w-10 h-10 text-green-400" />
            <h1 className="text-4xl font-bold">Trading Bot</h1>
            <button onClick={fetchAllData} className="ml-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-400">Two strategies working together</p>
          <p className="text-sm text-yellow-400 mt-1">🟡 {status.mode.toUpperCase()} Mode</p>
          
          <div className="mt-4">
            {pauseStatus.bot_paused ? (
              <button onClick={() => handleResume('all')} className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-lg">
                ▶️ RESUME ALL TRADING
              </button>
            ) : (
              <button onClick={() => handlePause('all')} className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-lg animate-pulse">
                ⏸️ PAUSE ALL TRADING
              </button>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-8 text-center shadow-2xl">
          <p className="text-green-100 text-lg mb-2">Your Total Balance</p>
          <p className="text-5xl font-bold mb-2">{totalBalance.toLocaleString()} NOK</p>
          <p className="text-green-100 text-sm">Connected to Trading212</p>
        </div>

        <div className="flex justify-center">
          <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg">
            <Settings className="w-5 h-5" />
            {showSettings ? 'Hide Settings' : 'Adjust Budget Split'}
          </button>
        </div>

        {showSettings && (
          <div className="bg-gray-800 rounded-2xl p-6 border-2 border-gray-700">
            <h3 className="text-2xl font-bold mb-4 text-center">Budget Split</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-3">
                  <span className="flex items-center gap-2"><Brain className="w-5 h-5 text-blue-400" />Warren Mode</span>
                  <span className="text-2xl font-bold text-blue-400">{tempWarrenAllocation}%</span>
                </div>
                <input type="range" min="0" max="100" value={tempWarrenAllocation} onChange={(e) => setTempWarrenAllocation(Number(e.target.value))} className="w-full h-3 bg-gray-700 rounded-lg accent-blue-500" />
              </div>
              <div>
                <div className="flex justify-between mb-3">
                  <span className="flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" />Day Trader Mode</span>
                  <span className="text-2xl font-bold text-yellow-400">{100 - tempWarrenAllocation}%</span>
                </div>
              </div>
              {tempWarrenAllocation !== warrenAllocation && (
                <button onClick={updateAllocation} className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold">
                  Save Changes
                </button>
              )}
            </div>
          </div>
        )}

        {pendingApprovals.map(approval => (
          <div key={approval.id} className="bg-gradient-to-br from-yellow-600 to-orange-600 rounded-xl p-5 border-2 border-yellow-400">
            <h3 className="text-xl font-bold text-white mb-3">⚠️ Approval Needed!</h3>
            <div className="bg-white/10 rounded-lg p-4 mb-3">
              <p className="text-2xl font-bold text-white">{approval.ticker}</p>
              <p className="text-white/90">{approval.shares} shares × {approval.price} NOK = {approval.total} NOK</p>
              <p className="text-xs text-white/90 mt-2">📊 {approval.reason}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleApprove(approval.id)} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg">
                <CheckCircle className="w-5 h-5 inline mr-2" />Approve
              </button>
              <button onClick={() => handleReject(approval.id)} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg">
                <XCircle className="w-5 h-5 inline mr-2" />Reject
              </button>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl p-6 border-2 border-blue-600">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-8 h-8 text-blue-300" />
              <div>
                <h2 className="text-2xl font-bold">Warren Mode</h2>
                <p className="text-blue-200 text-sm">Long-term value investing</p>
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div><p className="text-blue-200 text-sm">Budget</p><p className="text-2xl font-bold">{warrenBudget} NOK</p></div>
                <div><p className="text-blue-200 text-sm">Used</p><p className="text-2xl font-bold">{warrenUsed.toFixed(0)} NOK</p></div>
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className={`w-4 h-4 ${pauseStatus.warren_active ? 'text-green-400' : 'text-gray-400'}`} />
                <span className={`text-sm font-semibold ${pauseStatus.warren_active ? 'text-green-400' : 'text-gray-400'}`}>
                  {pauseStatus.warren_active ? 'Active' : 'PAUSED'}
                </span>
              </div>
              
              {!pauseStatus.warren_active && (
                <button onClick={() => handleResume('warren')} className="w-full py-2 mb-2 bg-green-600 rounded-lg font-semibold">
                  ▶️ Resume
                </button>
              )}
              
              <button onClick={handleWarrenScan} disabled={!pauseStatus.warren_active || scanningWarren} 
                className={`w-full py-2 rounded-lg font-semibold ${!pauseStatus.warren_active || scanningWarren ? 'bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                {scanningWarren ? '⏳ Scanning...' : '🔍 Run Scan'}
              </button>
              
              {pauseStatus.warren_active && (
                <button onClick={() => handlePause('warren')} className="w-full py-2 mt-2 bg-red-600/20 rounded-lg text-sm">
                  ⏸️ Pause
                </button>
              )}
              
              {scanResult && (
                <div className="mt-3 p-3 bg-blue-900/30 rounded-lg text-xs">
                  <p className="font-semibold">Last Scan:</p>
                  <p>Scanned: {scanResult.scanned} | Opportunities: {scanResult.opportunities}</p>
                </div>
              )}
            </div>

            <h3 className="font-bold mb-3">📋 Watchlist:</h3>
            <div className="space-y-3 mb-4">
              {watchlist.length === 0 ? (
                <div className="bg-black/30 rounded-xl p-4 text-center text-sm">No stocks yet</div>
              ) : (
                watchlist.map(stock => (
                  <div key={stock.ticker} className="bg-black/30 rounded-xl p-4">
                    <div className="flex justify-between mb-2">
                      <div><p className="font-bold">{stock.ticker}</p><p className="text-xs text-blue-200">{stock.name}</p></div>
                      <p className="font-bold">{stock.current_price} NOK</p>
                    </div>
                    <div className="text-sm px-3 py-2 rounded-lg bg-gray-600/50">{stock.recommendation || 'Analyzing...'}</div>
                  </div>
                ))
              )}
            </div>

            <h3 className="font-bold mb-3">💼 Holdings:</h3>
            <div className="space-y-3">
              {warrenPositions.length === 0 ? (
                <div className="bg-black/30 rounded-xl p-4 text-center text-sm">No positions</div>
              ) : (
                warrenPositions.map(pos => (
                  <div key={pos.id} className="bg-black/30 rounded-xl p-4">
                    <div className="flex justify-between">
                      <div><p className="font-bold">{pos.ticker}</p><p className="text-sm">{pos.shares} shares</p></div>
                      <div className="text-right">
                        <p className="font-bold">{pos.current_value?.toFixed(0)} NOK</p>
                        <p className={pos.profit_loss > 0 ? 'text-green-400' : 'text-red-400'}>
                          {pos.profit_loss > 0 ? '+' : ''}{pos.profit_loss?.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-2xl p-6 border-2 border-yellow-600">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-8 h-8 text-yellow-300" />
              <div>
                <h2 className="text-2xl font-bold">Day Trader Mode</h2>
                <p className="text-yellow-200 text-sm">Quick trades</p>
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div><p className="text-yellow-200 text-sm">Budget</p><p className="text-2xl font-bold">{dayTraderBudget} NOK</p></div>
                <div><p className="text-yellow-200 text-sm">Used</p><p className="text-2xl font-bold">{dayTraderUsed.toFixed(0)} NOK</p></div>
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className={`w-4 h-4 ${pauseStatus.daytrader_active ? 'text-yellow-400' : 'text-gray-400'}`} />
                <span className={`text-sm font-semibold ${pauseStatus.daytrader_active ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {pauseStatus.daytrader_active ? 'Active' : 'PAUSED'}
                </span>
              </div>
              <p className="text-xs text-yellow-100 mb-3">Asks approval for trades over {settings.approval_threshold} NOK</p>
              
              {!pauseStatus.daytrader_active ? (
                <button onClick={() => handleResume('daytrader')} className="w-full py-2 bg-green-600 rounded-lg font-semibold">
                  ▶️ Resume
                </button>
              ) : (
                <button onClick={() => handlePause('daytrader')} className="w-full py-2 bg-red-600/20 rounded-lg text-sm">
                  ⏸️ Pause
                </button>
              )}
            </div>

            <h3 className="font-bold mb-3">💼 Holdings:</h3>
            <div className="space-y-3">
              {dayTraderPositions.length === 0 ? (
                <div className="bg-black/30 rounded-xl p-4 text-center text-sm">No positions</div>
              ) : (
                dayTraderPositions.map(pos => (
                  <div key={pos.id} className="bg-black/30 rounded-xl p-4">
                    <div className="flex justify-between">
                      <div><p className="font-bold">{pos.ticker}</p><p className="text-sm">{pos.shares} shares</p></div>
                      <div className="text-right">
                        <p className="font-bold">{pos.current_value?.toFixed(0)} NOK</p>
                        <p className={pos.profit_loss > 0 ? 'text-green-400' : 'text-red-400'}>
                          {pos.profit_loss > 0 ? '+' : ''}{pos.profit_loss?.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingDashboard;