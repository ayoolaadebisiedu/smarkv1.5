"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../../../components/Navbar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Position {
    ticket?: number;
    symbol: string;
    volume: number;
    type: number | string;
    price_open: number;
    tp: number;
    sl: number;
    profit: number;
}

interface ExecutionStatus {
    active_platform: string;
    mt5: { connected: boolean; account: number };
    alpaca: { connected: boolean; paper: boolean };
}

interface AnalysisResults {
    ic_metrics: {
        ic_mean: Record<number, number>;
        ic_std: Record<number, number>;
        ic_t_stat: Record<number, number>;
    };
    return_metrics: {
        mean_return_by_quantile: Record<string, Record<number, number>>;
        cumulative_returns: Record<string, number>;
    };
}

export default function UnifiedDashboard() {
    const [activeTab, setActiveTab] = useState<"execution" | "analysis">("execution");
    const [status, setStatus] = useState<ExecutionStatus | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch initial status and positions
    useEffect(() => {
        fetchStatus();
        if (activeTab === "execution") {
            fetchPositions();
        }
    }, [activeTab]);

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${API_URL}/execution/status`);
            const data = await res.json();
            setStatus(data);
        } catch (err) {
            console.error(err);
        }
    };

    const triggerAnalysis = async (strategy: string) => {
        setAnalyzing(true);
        setAnalysisResults(null);
        try {
            const res = await fetch(`${API_URL}/analysis/alpha/${strategy}`, { method: "POST" });
            if (!res.ok) throw new Error("Analysis failed");
            const data = await res.json();
            setAnalysisResults(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const fetchPositions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/execution/positions`);
            const data = await res.json();
            setPositions(data);
        } catch (err) {
            console.error(err);
            setError("Failed to fetch positions");
        } finally {
            setLoading(false);
        }
    };

    const switchPlatform = async (platform: string) => {
        try {
            await fetch(`${API_URL}/execution/platform?platform=${platform}`, { method: "POST" });
            fetchStatus();
            fetchPositions();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30">
            <Navbar />

            <main className="max-w-[1400px] mx-auto px-6 py-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-400 to-slate-600 bg-clip-text text-transparent">
                            Terminal Alpha
                        </h1>
                        <p className="mt-2 text-slate-500 font-medium">Unified Execution & Factor Analysis Hub</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-3 p-1.5 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl"
                    >
                        {["execution", "analysis"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 capitalize ${activeTab === tab
                                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/20"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </motion.div>
                </div>

                {/* Content Section */}
                <AnimatePresence mode="wait">
                    {activeTab === "execution" ? (
                        <motion.div
                            key="execution"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 xl:grid-cols-12 gap-8"
                        >
                            {/* Left Column: Platform & Account */}
                            <div className="xl:col-span-4 space-y-8">
                                <div className="group relative bg-[#0f172a]/80 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] p-8 overflow-hidden shadow-2xl transition-all hover:border-cyan-500/30">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[60px] rounded-full -translate-y-12 translate-x-12 group-hover:bg-cyan-500/20 transition-all duration-700" />
                                    <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                                        Platform Control
                                    </h3>

                                    <div className="space-y-4">
                                        {["mt5", "alpaca"].map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => switchPlatform(p)}
                                                className={`w-full group/btn p-6 rounded-[2rem] border-2 transition-all duration-500 ${status?.active_platform === p
                                                    ? "bg-cyan-500/10 border-cyan-500 shadow-xl shadow-cyan-500/10"
                                                    : "bg-slate-900/30 border-slate-800 hover:border-slate-700"
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="text-left">
                                                        <span className="block text-xs uppercase tracking-[0.2em] font-black text-slate-500 mb-1 group-hover/btn:text-slate-400 transition-colors">Broker</span>
                                                        <span className="text-2xl font-black uppercase text-white tracking-tight">{p}</span>
                                                    </div>
                                                    <div className={`p-4 rounded-2xl transition-all duration-500 ${status?.active_platform === p ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-500"}`}>
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {status && (
                                        <div className="mt-10 pt-8 border-t border-slate-800/50 space-y-4">
                                            <div className="flex justify-between items-center text-sm font-bold">
                                                <span className="text-slate-500 uppercase tracking-widest">Status</span>
                                                <span className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-tighter ${status.mt5.connected || status.alpaca.connected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
                                                    {status.mt5.connected || status.alpaca.connected ? "Active Connection" : "Offline"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm font-bold">
                                                <span className="text-slate-500 uppercase tracking-widest">Account</span>
                                                <span className="text-white tabular-nums">{status.active_platform === "mt5" ? status.mt5.account : "Paper-001"}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Positions */}
                            <div className="xl:col-span-8 space-y-8">
                                <div className="bg-[#0f172a]/80 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl h-full">
                                    <div className="flex justify-between items-center mb-10">
                                        <h3 className="text-2xl font-black text-white tracking-tight">Active Positions</h3>
                                        <button
                                            onClick={fetchPositions}
                                            className="p-3 bg-slate-800/50 hover:bg-slate-700 rounded-2xl transition-all text-slate-400 hover:text-white"
                                        >
                                            <svg className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        </button>
                                    </div>

                                    <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
                                        {positions.length > 0 ? positions.map((pos, idx) => (
                                            <div key={idx} className="group p-8 bg-slate-900/30 hover:bg-slate-900/60 border border-slate-800/50 hover:border-cyan-500/30 rounded-3xl transition-all duration-500">
                                                <div className="grid grid-cols-2 md:grid-cols-4 items-center gap-8">
                                                    <div>
                                                        <span className="block text-[10px] uppercase tracking-[0.25em] font-black text-slate-500 mb-2">Instrument</span>
                                                        <span className="text-xl font-black text-white">{pos.symbol}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] uppercase tracking-[0.25em] font-black text-slate-500 mb-2">Volume</span>
                                                        <span className="text-xl font-bold text-slate-300 tabular-nums">{pos.volume} Lots</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] uppercase tracking-[0.25em] font-black text-slate-500 mb-2">Return</span>
                                                        <span className={`text-xl font-black tabular-nums ${pos.profit >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                                                            {pos.profit >= 0 ? "+" : ""}{pos.profit.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <button className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white rounded-2xl font-bold transition-all duration-300">
                                                            Terminate
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-[2.5rem]">
                                                <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6">
                                                    <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                </div>
                                                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No Active Positions Observed</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="analysis"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                                {/* Strategy Selector */}
                                <div className="xl:col-span-4 space-y-6">
                                    <div className="bg-[#0f172a]/80 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
                                        <h3 className="text-xl font-bold mb-6">Select Alpha Source</h3>
                                        <div className="space-y-3">
                                            {["MACD", "RSI", "Turtle", "Ichimoku"].map((strat) => (
                                                <button
                                                    key={strat}
                                                    onClick={() => triggerAnalysis(strat)}
                                                    disabled={analyzing}
                                                    className="w-full p-4 bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl flex justify-between items-center transition-all group"
                                                >
                                                    <span className="font-bold text-slate-400 group-hover:text-white">{strat} Strategy</span>
                                                    <svg className="w-5 h-5 text-slate-600 group-hover:text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Results View */}
                                <div className="xl:col-span-8">
                                    {analyzing ? (
                                        <div className="bg-[#0f172a]/80 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] p-20 shadow-2xl flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-6" />
                                            <p className="font-black uppercase tracking-widest text-slate-500">Processing Factor History...</p>
                                        </div>
                                    ) : analysisResults ? (
                                        <div className="space-y-8">
                                            <div className="bg-[#0f172a]/80 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
                                                <h3 className="text-xl font-bold mb-8">Information Coefficient (IC)</h3>
                                                <div className="grid grid-cols-3 gap-6">
                                                    {Object.entries(analysisResults.ic_metrics.ic_mean).map(([period, value]) => (
                                                        <div key={period} className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl">
                                                            <span className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-2">Period {period}D</span>
                                                            <span className={`text-3xl font-black ${value > 0 ? "text-emerald-400" : "text-rose-500"}`}>
                                                                {value.toFixed(4)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="bg-[#0f172a]/80 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
                                                <h3 className="text-xl font-bold mb-8">Mean Return by Quantile</h3>
                                                <div className="h-64 flex items-end gap-4 px-4">
                                                    {Object.entries(analysisResults.return_metrics.mean_return_by_quantile["1"] || {}).map(([q, val]: [any, any]) => (
                                                        <div key={q} className="flex-1 flex flex-col items-center gap-4">
                                                            <motion.div
                                                                initial={{ height: 0 }}
                                                                animate={{ height: `${Math.abs(val) * 1000}%` }}
                                                                className={`w-full rounded-2xl ${val >= 0 ? "bg-cyan-500" : "bg-rose-500"}`}
                                                            />
                                                            <span className="text-xs font-black text-slate-500">Q{q}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-[#0f172a]/80 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] p-20 shadow-2xl text-center">
                                            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                                <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                            </div>
                                            <h3 className="text-2xl font-black text-white mb-2">Alpha Intelligence Ready</h3>
                                            <p className="text-slate-500 font-medium">Select a strategy on the left to begin factor validation.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
