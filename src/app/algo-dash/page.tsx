"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../../components/Navbar";

// Types
interface Ticker {
  ticker: string;
  asset_type: string;
  type_label: string;
}

interface ChartCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Trade {
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  pnl: number;
  pnl_pct: number;
  direction: string;
}

interface BacktestMetrics {
  sharpe_ratio: number;
  max_drawdown_pct: number;
  win_rate_pct: number;
  profit_factor: number;
  total_trades: number;
  ann_return_pct: number;
  ann_volatility_pct: number;
}

interface BacktestResult {
  ticker: string;
  strategy: string;
  initial_capital: number;
  final_capital: number;
  total_return_pct: number;
  metrics: BacktestMetrics;
  equity_curve: { time: string; value: number }[];
  trades: Trade[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const STRATEGIES = [
  { id: "MACD_Cross", name: "MACD Crossover", description: "Buy on bullish cross, sell on bearish" },
  { id: "RSI_Divergence", name: "RSI Oversold/Overbought", description: "Buy below 30, sell above 70" },
  { id: "Turtle_Breakout", name: "Turtle Breakout", description: "20-day high/low breakout system" },
  { id: "Ichimoku", name: "Ichimoku Cloud", description: "Tenkan/Kijun cross signals" },
];

export default function AlgoDashPage() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [filteredTickers, setFilteredTickers] = useState<Ticker[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState<Ticker | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState("MACD_Cross");
  const [initialCapital, setInitialCapital] = useState(10000);
  const [chartData, setChartData] = useState<ChartCandle[]>([]);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [backtesting, setBacktesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available tickers
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const res = await fetch(`${API_URL}/algo-dash/tickers`);
        if (!res.ok) throw new Error("Failed to fetch tickers");
        const data = await res.json();
        setTickers(data.tickers);
        setFilteredTickers(data.tickers.slice(0, 50));
      } catch (err) {
        console.error(err);
        setError("Failed to load tickers. Is the backend running?");
      }
    };
    fetchTickers();
  }, []);

  // Filter tickers based on search
  useEffect(() => {
    if (searchQuery.length === 0) {
      setFilteredTickers(tickers.slice(0, 50));
    } else {
      const filtered = tickers.filter((t) =>
        t.ticker.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTickers(filtered.slice(0, 50));
    }
  }, [searchQuery, tickers]);

  // Fetch chart data when ticker selected
  useEffect(() => {
    if (!selectedTicker) return;

    const fetchChartData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/algo-dash/historical/${selectedTicker.ticker}?asset_type=${selectedTicker.asset_type}`
        );
        if (!res.ok) throw new Error("Failed to fetch data");
        const data = await res.json();
        setChartData(data.data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load chart data");
      } finally {
        setLoading(false);
      }
    };
    fetchChartData();
  }, [selectedTicker]);

  // Run backtest
  const runBacktest = async () => {
    if (!selectedTicker) return;

    setBacktesting(true);
    setBacktestResult(null);
    try {
      const res = await fetch(`${API_URL}/algo-dash/run-backtest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: selectedTicker.ticker,
          strategy: selectedStrategy,
          initial_capital: initialCapital,
          asset_type: selectedTicker.asset_type,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Backtest failed");
      }
      const result = await res.json();
      setBacktestResult(result);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Backtest failed");
    } finally {
      setBacktesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Algo Dash
          </h1>
          <p className="text-gray-400 mt-2">
            Backtest trading strategies on historical data with Tidy Finance metrics
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300"
          >
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Ticker Search */}
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold text-white mb-4">Select Ticker</h2>
              <input
                type="text"
                placeholder="Search ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
                {filteredTickers.map((t) => (
                  <button
                    key={`${t.asset_type}_${t.ticker}`}
                    onClick={() => setSelectedTicker(t)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-all ${
                      selectedTicker?.ticker === t.ticker && selectedTicker?.asset_type === t.asset_type
                        ? "bg-cyan-500/30 border border-cyan-500 text-cyan-300"
                        : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-300"
                    }`}
                  >
                    <span className="font-medium">{t.ticker}</span>
                    <span className="text-xs text-gray-500 ml-2">{t.type_label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy Selection */}
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold text-white mb-4">Strategy</h2>
              <div className="space-y-3">
                {STRATEGIES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStrategy(s.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      selectedStrategy === s.id
                        ? "bg-purple-500/30 border border-purple-500"
                        : "bg-gray-800/50 hover:bg-gray-700/50 border border-transparent"
                    }`}
                  >
                    <div className="font-medium text-white">{s.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{s.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Capital & Run */}
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold text-white mb-4">Parameters</h2>
              <div className="mb-4">
                <label className="text-sm text-gray-400">Initial Capital ($)</label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="w-full mt-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <button
                onClick={runBacktest}
                disabled={!selectedTicker || backtesting}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  selectedTicker && !backtesting
                    ? "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                {backtesting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Running...
                  </span>
                ) : (
                  "Run Backtest"
                )}
              </button>
            </div>
          </motion.div>

          {/* Right Panel - Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* Price Chart */}
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold text-white mb-4">
                {selectedTicker ? `${selectedTicker.ticker} Price Chart` : "Select a Ticker"}
              </h2>
              <div className="h-[300px] flex items-center justify-center">
                {loading ? (
                  <div className="text-gray-400">Loading chart...</div>
                ) : chartData.length > 0 ? (
                  <div className="w-full h-full flex items-end gap-[1px]">
                    {chartData.slice(-100).map((candle, i) => {
                      const maxPrice = Math.max(...chartData.slice(-100).map(c => c.high));
                      const minPrice = Math.min(...chartData.slice(-100).map(c => c.low));
                      const range = maxPrice - minPrice || 1;
                      const height = ((candle.close - minPrice) / range) * 100;
                      const isGreen = candle.close >= candle.open;
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-t transition-all hover:opacity-80 ${
                            isGreen ? "bg-green-500" : "bg-red-500"
                          }`}
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${candle.time}: $${candle.close.toFixed(2)}`}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-500">No data available</div>
                )}
              </div>
            </div>

            {/* Backtest Results */}
            <AnimatePresence>
              {backtestResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Metrics Grid */}
                  <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-lg font-semibold text-white mb-4">Performance Metrics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <MetricCard
                        label="Total Return"
                        value={`${backtestResult.total_return_pct.toFixed(2)}%`}
                        positive={backtestResult.total_return_pct > 0}
                      />
                      <MetricCard
                        label="Sharpe Ratio"
                        value={backtestResult.metrics.sharpe_ratio.toFixed(2)}
                        positive={backtestResult.metrics.sharpe_ratio > 1}
                      />
                      <MetricCard
                        label="Max Drawdown"
                        value={`${backtestResult.metrics.max_drawdown_pct.toFixed(2)}%`}
                        positive={false}
                        isDrawdown
                      />
                      <MetricCard
                        label="Win Rate"
                        value={`${backtestResult.metrics.win_rate_pct.toFixed(1)}%`}
                        positive={backtestResult.metrics.win_rate_pct > 50}
                      />
                      <MetricCard
                        label="Profit Factor"
                        value={backtestResult.metrics.profit_factor.toFixed(2)}
                        positive={backtestResult.metrics.profit_factor > 1}
                      />
                      <MetricCard
                        label="Total Trades"
                        value={backtestResult.metrics.total_trades.toString()}
                        neutral
                      />
                      <MetricCard
                        label="Final Capital"
                        value={`$${backtestResult.final_capital.toLocaleString()}`}
                        positive={backtestResult.final_capital > backtestResult.initial_capital}
                      />
                      <MetricCard
                        label="Ann. Volatility"
                        value={`${backtestResult.metrics.ann_volatility_pct.toFixed(2)}%`}
                        neutral
                      />
                    </div>
                  </div>

                  {/* Equity Curve */}
                  <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-lg font-semibold text-white mb-4">Equity Curve</h2>
                    <div className="h-[200px] flex items-end gap-[1px]">
                      {backtestResult.equity_curve.slice(-100).map((point, i) => {
                        const maxVal = Math.max(...backtestResult.equity_curve.map(p => p.value));
                        const minVal = Math.min(...backtestResult.equity_curve.map(p => p.value));
                        const range = maxVal - minVal || 1;
                        const height = ((point.value - minVal) / range) * 100;
                        const isAboveInitial = point.value >= backtestResult.initial_capital;
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-t transition-all ${
                              isAboveInitial ? "bg-cyan-500" : "bg-orange-500"
                            }`}
                            style={{ height: `${Math.max(height, 2)}%` }}
                            title={`${point.time}: $${point.value.toLocaleString()}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Trade Table */}
                  <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-800">
                    <h2 className="text-lg font-semibold text-white mb-4">Recent Trades</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-700">
                            <th className="text-left py-3 px-2">Entry</th>
                            <th className="text-left py-3 px-2">Exit</th>
                            <th className="text-right py-3 px-2">Entry $</th>
                            <th className="text-right py-3 px-2">Exit $</th>
                            <th className="text-right py-3 px-2">P&L</th>
                            <th className="text-right py-3 px-2">Return</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backtestResult.trades.map((trade, i) => (
                            <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                              <td className="py-3 px-2 text-gray-300">{trade.entry_time}</td>
                              <td className="py-3 px-2 text-gray-300">{trade.exit_time}</td>
                              <td className="py-3 px-2 text-right text-gray-300">
                                ${trade.entry_price.toFixed(2)}
                              </td>
                              <td className="py-3 px-2 text-right text-gray-300">
                                ${trade.exit_price.toFixed(2)}
                              </td>
                              <td
                                className={`py-3 px-2 text-right font-medium ${
                                  trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                                }`}
                              >
                                {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                              </td>
                              <td
                                className={`py-3 px-2 text-right ${
                                  trade.pnl_pct >= 0 ? "text-green-400" : "text-red-400"
                                }`}
                              >
                                {trade.pnl_pct >= 0 ? "+" : ""}{trade.pnl_pct.toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {backtestResult.trades.length === 0 && (
                        <div className="text-center text-gray-500 py-8">No trades executed</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  label,
  value,
  positive,
  neutral,
  isDrawdown,
}: {
  label: string;
  value: string;
  positive?: boolean;
  neutral?: boolean;
  isDrawdown?: boolean;
}) {
  let colorClass = "text-gray-300";
  if (!neutral) {
    if (isDrawdown) {
      colorClass = "text-orange-400";
    } else if (positive) {
      colorClass = "text-green-400";
    } else {
      colorClass = "text-red-400";
    }
  }

  return (
    <div className="bg-gray-800/50 rounded-xl p-4">
      <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</div>
    </div>
  );
}
