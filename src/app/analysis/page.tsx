"use client"
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SignalCard } from '@/components/SignalCard';
import { ChartComponent } from '@/components/ChartComponent';
import { TradeModal } from '@/components/TradeModal';
import { TradeHistory } from '@/components/TradeHistory';
import { DataProcessor } from '@/components/DataProcessor';
import { OrderBook } from '@/components/OrderBook';
import {
    LayoutDashboard,
    Bell,
    Settings,
    PieChart,
    Activity,
    Info,
    Coins,
    BarChart4,
    TrendingUp,
    TrendingDown,
    XCircle,
    Wallet,
    Target,
    ShieldCheck,
    Zap,
    Search,
    ChevronDown,
    PlusCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const ASSETS = {
    STOCKS: [
        { name: 'Apple', ticker: 'AAPL' },
        { name: 'Amazon', ticker: 'AMZN' },
        { name: 'Tesla', ticker: 'TSLA' },
        { name: 'Microsoft', ticker: 'MSFT' },
        { name: 'Nvidia', ticker: 'NVDA' },
    ],
    CRYPTO: [
        { name: 'Bitcoin', ticker: 'BTC-USD' },
        { name: 'Ethereum', ticker: 'ETH-USD' },
        { name: 'BNB', ticker: 'BNB-USD' },
        { name: 'Doge', ticker: 'DOGE-USD' },
        { name: 'Solana', ticker: 'SOL-USD' },
    ]
};

export default function AnalysisPage() {
    const [mounted, setMounted] = useState(false);
    const [category, setCategory] = useState<'STOCKS' | 'CRYPTO'>('CRYPTO');
    const [selectedAsset, setSelectedAsset] = useState(ASSETS.CRYPTO[0]);
    const [signals, setSignals] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [proAnalysis, setProAnalysis] = useState<any>(null);
    const [isApiOnline, setIsApiOnline] = useState(true);
    const [backtestResults, setBacktestResults] = useState<any[]>([]);
    const [volatility, setVolatility] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [accountSummary, setAccountSummary] = useState({ balance: 10000.0, total_pnl: 0, trades_count: 0 });
    const [activeTrades, setActiveTrades] = useState<any[]>([]);
    const [tradeHistory, setTradeHistory] = useState<any[]>([]);
    const [isTrading, setIsTrading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalDirection, setModalDirection] = useState<'buy' | 'sell'>('buy');
    const [alerts, setAlerts] = useState([
        { id: 1, title: 'Volatility Alert', time: '10m ago', message: 'High volatility detected in BTC-USD. Exercise caution.' },
        { id: 2, title: 'Strategy Signal', time: '25m ago', message: 'MACD Golden Cross detected on NVDA 1h chart.' }
    ]);

    const toggleWatchlist = (e: React.MouseEvent, ticker: string) => {
        e.stopPropagation();
        setWatchlist(prev => {
            const next = prev.includes(ticker)
                ? prev.filter(t => t !== ticker)
                : [...prev, ticker];
            localStorage.setItem('smark_watchlist', JSON.stringify(next));
            return next;
        });
    };

    const fetchSignals = useCallback(async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/signals`);
            if (!res.ok) throw new Error("API unreachable");
            const data = await res.json();
            setSignals(data);
            setIsApiOnline(true);
        } catch (e) {
            console.error("Failed to fetch signals", e);
            setIsApiOnline(false);
        }
    }, []);

    const fetchHistory = useCallback(async (ticker: string) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            setChartData([]);
            const res = await fetch(`${API_URL}/history/${ticker}`);
            const data = await res.json();
            const formatted = data.map((d: any) => ({
                time: d.time,
                value: d.close,
            }));
            setChartData(formatted);
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
    }, []);

    const fetchAccount = useCallback(async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/account/summary`);
            if (!res.ok) return;
            const data = await res.json();
            setAccountSummary(data);
        } catch (e) { console.error(e); }
    }, []);

    const fetchActiveTrades = useCallback(async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/trades/active`);
            if (!res.ok) return;
            const data = await res.json();
            setActiveTrades(data);
        } catch (e) { console.error(e); }
    }, []);

    const fetchTradeHistory = useCallback(async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/trades/history`);
            if (!res.ok) return;
            const data = await res.json();
            setTradeHistory(data);
        } catch (e) { console.error(e); }
    }, []);

    const openTrade = async (data: { amount: number; sl?: number; tp?: number }) => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        setIsTrading(true);
        try {
            await fetch(`${API_URL}/trades/open`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker: selectedAsset.ticker,
                    direction: modalDirection,
                    amount: data.amount,
                    stop_loss: data.sl,
                    take_profit: data.tp
                })
            });
            await fetchActiveTrades();
            await fetchAccount();
            setIsModalOpen(false);
        } finally {
            setIsTrading(false);
        }
    };

    const closeTrade = async (id: number) => {
        try {
            await fetch(`http://localhost:8000/trades/close/${id}`, { method: 'POST' });
            await fetchActiveTrades();
            await fetchTradeHistory();
            await fetchAccount();
        } catch (e) { console.error(e); }
    };

    const fetchBacktests = useCallback(async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/backtests`);
            if (!res.ok) return;
            const data = await res.json();
            setBacktestResults(data);
        } catch (e) { console.error(e); }
    }, []);

    const fetchProAnalysis = useCallback(async (ticker: string) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/analysis/suggestion/${ticker}`);
            if (!res.ok) return;
            const data = await res.json();
            setProAnalysis(data);
            if (data.reasoning?.includes('high volatility')) setVolatility(85);
            else setVolatility(Math.floor(Math.random() * 40) + 10);
        } catch (e) { console.error(e); }
    }, []);

    const refreshData = async () => {
        setIsScanning(true);
        try {
            await fetch(`http://localhost:8000/scan/${selectedAsset.ticker}`, { method: 'POST' });
            await fetchSignals();
            await fetchHistory(selectedAsset.ticker);
            await fetchProAnalysis(selectedAsset.ticker);
        } finally {
            setIsScanning(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        const savedWatchlist = localStorage.getItem('smark_watchlist');
        if (savedWatchlist) {
            setWatchlist(JSON.parse(savedWatchlist));
        } else {
            setWatchlist(['BTC-USD', 'NVDA']);
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;
        fetchSignals();
        fetchHistory(selectedAsset.ticker);
        fetchAccount();
        fetchActiveTrades();
        fetchTradeHistory();
        fetchProAnalysis(selectedAsset.ticker);
        fetchBacktests();

        const interval = setInterval(() => {
            fetchAccount();
            fetchActiveTrades();
            fetchTradeHistory();
            fetchSignals();
            fetchProAnalysis(selectedAsset.ticker);
            fetchBacktests();
        }, 10000);
        return () => clearInterval(interval);
    }, [mounted, selectedAsset.ticker, fetchSignals, fetchHistory, fetchAccount, fetchActiveTrades, fetchTradeHistory, fetchProAnalysis, fetchBacktests]);

    const filteredAssets = useMemo(() => {
        const all = [...ASSETS.CRYPTO, ...ASSETS.STOCKS];
        if (!searchQuery) return all;
        return all.filter(a =>
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.ticker.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    if (!mounted) return null;

    return (
        <main className="min-h-screen bg-[#020617] text-slate-200 pt-20">
            {!isApiOnline && (
                <div className="fixed top-0 left-0 right-0 bg-rose-600/90 backdrop-blur-md text-white py-2 px-4 z-[100] text-center text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                    <XCircle size={14} />
                    Backend Offline - Start backend server to restore live analysis
                    <button
                        onClick={() => {
                            setIsApiOnline(true);
                            fetchSignals();
                        }}
                        className="ml-4 px-3 py-1 bg-white text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        Retry Connection
                    </button>
                </div>
            )}

            <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">

                {/* Header Section: Account Summary & Search */}
                <header className="flex flex-col lg:flex-row gap-8 lg:items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 rounded-[32px] flex items-center gap-6 shadow-2xl">
                            <div className="p-4 bg-blue-600/10 rounded-2xl text-blue-500 border border-blue-500/20">
                                <Wallet size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Portfolio Value</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-white tracking-tight">${accountSummary.balance.toLocaleString()}</span>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg",
                                        accountSummary.total_pnl >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                    )}>
                                        {accountSummary.total_pnl >= 0 ? '+' : ''}{accountSummary.total_pnl.toFixed(2)} PnL
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Searchable Command Menu */}
                        <div className="relative group w-full lg:w-96">
                            <div
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className="bg-slate-950/80 border border-slate-800 p-5 rounded-3xl flex items-center justify-between cursor-pointer hover:border-slate-600 transition-all shadow-inner group"
                            >
                                <div className="flex items-center gap-3">
                                    <Search size={18} className="text-slate-500 group-hover:text-blue-500 transition-colors" />
                                    <span className="text-sm font-black text-slate-300 uppercase tracking-tight">
                                        {selectedAsset.name} ({selectedAsset.ticker})
                                    </span>
                                    {watchlist.includes(selectedAsset.ticker) && <span className="text-yellow-500">★</span>}
                                </div>
                                <ChevronDown size={18} className={cn("text-slate-500 transition-transform", isSearchOpen && "rotate-180")} />
                            </div>

                            <AnimatePresence>
                                {isSearchOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full left-0 right-0 mt-4 bg-[#0a0f1d] border border-slate-800 rounded-[32px] shadow-2xl z-[100] overflow-hidden"
                                    >
                                        <div className="p-4 border-b border-slate-800">
                                            <input
                                                autoFocus
                                                placeholder="Search symbols or names..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-2xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
                                            {filteredAssets.map((asset) => (
                                                <button
                                                    key={asset.ticker}
                                                    onClick={() => {
                                                        setSelectedAsset(asset);
                                                        setIsSearchOpen(false);
                                                        setSearchQuery('');
                                                    }}
                                                    className="w-full text-left p-4 rounded-2xl hover:bg-slate-900 flex items-center justify-between group transition-colors"
                                                >
                                                    <div>
                                                        <p className="text-xs font-black text-white uppercase">{asset.name}</p>
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{asset.ticker}</p>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center transition-colors hover:bg-slate-900"
                                                        onClick={(e) => toggleWatchlist(e, asset.ticker)}>
                                                        {watchlist.includes(asset.ticker) ? (
                                                            <span className="text-yellow-500">★</span>
                                                        ) : (
                                                            <PlusCircle size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-slate-900/40 p-1.5 rounded-2xl flex gap-2 border border-slate-800 shadow-inner">
                            <button className="p-3 bg-slate-950 text-slate-500 rounded-xl hover:text-white transition-colors relative">
                                <Bell size={18} />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#020617]" />
                            </button>
                            <button className="p-3 bg-slate-950 text-slate-500 rounded-xl hover:text-white transition-colors">
                                <Settings size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex flex-col xl:flex-row gap-8 items-start">

                    {/* Left Sidebar: Analysis & Signals */}
                    <aside className="xl:w-96 space-y-6 w-full xl:sticky xl:top-24 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-hide pb-20">

                        {/* High-Conviction Analysis */}
                        <AnimatePresence mode="wait">
                            {proAnalysis && proAnalysis.recommendation !== 'NEUTRAL' ? (
                                <motion.div
                                    key={selectedAsset.ticker}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group"
                                >
                                    <div className="absolute -right-6 -top-6 text-blue-500/10 group-hover:scale-110 transition-transform duration-1000">
                                        <Zap size={160} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-8">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Target size={16} className="text-blue-400" />
                                                    <h2 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">Live Edge</h2>
                                                </div>
                                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">{proAnalysis.strategy}</h3>
                                            </div>
                                            <div className={cn(
                                                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg",
                                                proAnalysis.recommendation === 'BUY' ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-rose-500 text-white shadow-rose-500/20"
                                            )}>
                                                {proAnalysis.recommendation === 'BUY' ? 'LONG' : 'SHORT'}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 mb-8">
                                            <MetricTile label="Entry" value={proAnalysis.entry} />
                                            <MetricTile label="Profit" value={proAnalysis.tp} color="text-emerald-400" />
                                            <MetricTile label="Loss" value={proAnalysis.sl} color="text-rose-400" />
                                        </div>

                                        <div className="bg-slate-950/60 p-5 rounded-3xl border border-white/5 mb-8">
                                            <p className="text-xs text-slate-300 leading-relaxed font-semibold italic">
                                                "{proAnalysis.reasoning}"
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setModalDirection(proAnalysis.recommendation === 'BUY' ? 'buy' : 'sell');
                                                setIsModalOpen(true);
                                            }}
                                            className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 transform hover:-translate-y-1"
                                        >
                                            Execute Prediction
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-[40px] p-12 text-center space-y-4">
                                    <Activity className="mx-auto text-slate-700 animate-pulse" size={40} />
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Awaiting Synchronized Alpha Signal...</p>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* Recent Alerts (UI STUB) */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] p-6 shadow-xl">
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                                Priority Alerts
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            </h2>
                            <div className="space-y-4">
                                {alerts.map(alert => (
                                    <div key={alert.id} className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all cursor-default">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-[10px] font-black text-white uppercase">{alert.title}</h4>
                                            <span className="text-[9px] font-black text-slate-600 uppercase">{alert.time}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{alert.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Live Signal Feed */}
                        <div className="space-y-4">
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center justify-between">
                                Intelligence Data
                                <button onClick={fetchSignals} className="text-blue-500 hover:underline">Refresh</button>
                            </h2>
                            {signals.length === 0 ? (
                                <div className="p-12 text-center"><Activity className="animate-spin mx-auto text-slate-800" /></div>
                            ) : (
                                signals.map((signal, idx) => (
                                    <SignalCard key={idx} signal={signal} />
                                ))
                            )}
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <section className="flex-1 space-y-8 min-w-0">

                        {/* Operations Center */}
                        <div className="bg-slate-900/40 rounded-[48px] p-8 md:p-12 border border-slate-800 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] -z-10" />

                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-8">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">{selectedAsset.ticker}</h3>
                                        <div className="h-8 w-[1px] bg-slate-800" />
                                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Terminal</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 font-black uppercase tracking-[0.3em]">{selectedAsset.name} Infrastructure</p>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <div className="bg-slate-950/80 p-2 rounded-[24px] flex gap-3 border border-slate-800 shadow-inner">
                                        <OperationButton
                                            label="Market Buy"
                                            icon={TrendingUp}
                                            color="emerald"
                                            onClick={() => { setModalDirection('buy'); setIsModalOpen(true); }}
                                            disabled={isTrading}
                                        />
                                        <OperationButton
                                            label="Market Short"
                                            icon={TrendingDown}
                                            color="rose"
                                            onClick={() => { setModalDirection('sell'); setIsModalOpen(true); }}
                                            disabled={isTrading}
                                        />
                                    </div>

                                    <button
                                        onClick={refreshData}
                                        disabled={isScanning}
                                        className={cn(
                                            "px-10 py-5 rounded-[24px] text-[10px] font-black transition-all flex items-center gap-3 uppercase shadow-2xl disabled:opacity-50",
                                            isScanning ? "bg-slate-800 text-slate-500" : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20"
                                        )}
                                    >
                                        {isScanning ? <Activity className="animate-spin" size={16} /> : <Zap size={16} />}
                                        {isScanning ? "Scanning Matrix..." : "Scan Alpha"}
                                    </button>
                                </div>
                            </div>

                            {/* Chart & Orderbook Split */}
                            <div className="h-[600px] w-full flex flex-col lg:flex-row gap-4">
                                {/* Main Chart */}
                                <div className="flex-1 rounded-[32px] overflow-hidden border border-white/5 bg-slate-950/40 shadow-inner p-4 relative group/chart">
                                    {chartData.length > 0 ? (
                                        <ChartComponent data={chartData} />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-4">
                                            <Activity size={40} className="animate-pulse" />
                                            <p className="font-black uppercase tracking-[0.4em] text-[10px] opacity-30">Calibrating Market Feed...</p>
                                        </div>
                                    )}
                                </div>

                                {/* Live Orderbook (Visible on lg screens) */}
                                <div className="hidden lg:block w-72 rounded-[32px] overflow-hidden">
                                    {/* Dynamic Orderbook Import/Component */}
                                    {/* To avoid circular dep issues or complex imports if file not ready, we use inline logic or assume component exists */}
                                    {/* We will assume OrderBook is imported at top level */}
                                    <OrderBook ticker={selectedAsset.ticker} currentPrice={chartData.length > 0 ? chartData[chartData.length - 1].value : 0} />
                                </div>
                            </div>
                        </div>

                        {/* Strategy Benchmarks */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-900/40 border border-slate-800 rounded-[40px] p-8">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                    <BarChart4 size={16} className="text-blue-500" />
                                    Historical Performance
                                </h3>
                                <div className="space-y-4">
                                    {backtestResults.slice(0, 3).map((res, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-slate-950/60 rounded-[20px] border border-white/5">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{res.strategy}</p>
                                                <p className="text-sm font-black text-white">{res.ticker}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-emerald-500 uppercase">{Math.round(res.win_rate * 100)}% WR</p>
                                                <p className="text-[10px] font-mono text-slate-400">PF: {res.profit_factor.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900/40 border border-slate-800 rounded-[40px] p-8">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                    <PieChart size={16} className="text-teal-500" />
                                    Logic Configuration
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <LogicBox title="Divergence" status="ACTIVE" active />
                                    <LogicBox title="MACD Cross" status="ACTIVE" active />
                                    <LogicBox title="Ichimoku" status="STANDBY" />
                                    <LogicBox title="Sentiment" status="ACTIVE" active />
                                </div>
                            </div>
                        </div>

                        {/* Activity Ledger */}
                        <div className="bg-slate-900/40 rounded-[40px] border border-slate-800 overflow-hidden shadow-2xl p-2">
                            <TradeHistory trades={tradeHistory} />
                        </div>

                        {/* Advanced Processing */}
                        <DataProcessor />
                    </section>
                </div>
            </div>

            <TradeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                asset={selectedAsset}
                direction={modalDirection}
                onConfirm={openTrade}
                currentPrice={chartData.length > 0 ? chartData[chartData.length - 1].value : 0}
                suggestedSL={proAnalysis?.sl || signals.find(s => s.ticker === selectedAsset.ticker)?.sl}
                suggestedTP={proAnalysis?.tp || signals.find(s => s.ticker === selectedAsset.ticker)?.tp}
            />
        </main>
    );
}

function MetricTile({ label, value, color = "text-white" }: { label: string, value: number, color?: string }) {
    return (
        <div className="bg-slate-950/40 p-4 rounded-3xl border border-white/5">
            <span className="text-[9px] uppercase text-slate-500 font-black block mb-1 tracking-widest">{label}</span>
            <span className={cn("font-mono text-sm font-bold tracking-tighter", color)}>${value?.toFixed(2)}</span>
        </div>
    );
}

function OperationButton({ label, icon: Icon, color, onClick, disabled }: any) {
    const colors: any = {
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white",
        rose: "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white"
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "px-8 py-4 rounded-[20px] text-[10px] font-black border transition-all flex items-center gap-3 uppercase group",
                colors[color]
            )}
        >
            <Icon size={18} className="transition-transform group-hover:scale-110" />
            {label}
        </button>
    );
}

function LogicBox({ title, status, active }: { title: string, status: string, active?: boolean }) {
    return (
        <div className="bg-slate-950/60 p-5 rounded-[24px] border border-white/5 flex flex-col justify-between group hover:border-slate-700 transition-all">
            <p className="text-[10px] font-black text-white uppercase tracking-tight mb-4">{title}</p>
            <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-700")} />
                <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", active ? "text-emerald-500" : "text-slate-600")}>{status}</span>
            </div>
        </div>
    );
}

