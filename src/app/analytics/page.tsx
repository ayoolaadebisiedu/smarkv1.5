"use client"
import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    PieChart as PieChartIcon,
    Activity,
    ShieldCheck,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    Calendar,
    MousePointer2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function AnalyticsPage() {
    const [mounted, setMounted] = useState(false);
    const [stats, setStats] = useState({
        total_pnl: +2450.50,
        win_rate: 68.4,
        total_trades: 124,
        avg_profit: 45.20,
        best_trade: 850.00,
        drawdown: 12.5
    });

    useEffect(() => {
        setMounted(true);
        // In a real app, fetch statistics here
    }, []);

    if (!mounted) return null;

    return (
        <main className="min-h-screen bg-[#020617] text-slate-200 pt-24 pb-20 px-4 md:px-8">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header */}
                <header className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-8 bg-blue-600 rounded-full" />
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Performance Analytics</h1>
                    </div>
                    <p className="text-slate-400 max-w-2xl font-medium">
                        Deep dive into your trading performance. Monitor equity curves, risk metrics, and strategy efficiency with institutional-grade precision.
                    </p>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Net Profit"
                        value={`+$${stats.total_pnl.toLocaleString()}`}
                        trend="+12.4%"
                        isPositive={true}
                        icon={TrendingUp}
                    />
                    <StatCard
                        title="Win Rate"
                        value={`${stats.win_rate}%`}
                        trend="+2.1%"
                        isPositive={true}
                        icon={PieChartIcon}
                    />
                    <StatCard
                        title="Total Trades"
                        value={stats.total_trades.toString()}
                        trend="Normal"
                        isPositive={null}
                        icon={Activity}
                    />
                    <StatCard
                        title="Max Drawdown"
                        value={`${stats.drawdown}%`}
                        trend="-0.5%"
                        isPositive={false}
                        icon={ShieldCheck}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Performance Chart Placeholder */}
                    <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -z-10" />
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                                <BarChart3 size={20} className="text-blue-500" />
                                Equity Growth
                            </h2>
                            <div className="flex gap-2">
                                {['1D', '1W', '1M', 'ALL'].map(t => (
                                    <button key={t} className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-950/60 border border-slate-800 text-slate-500 hover:text-white transition-colors">{t}</button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[400px] w-full bg-slate-950/50 rounded-2xl border border-slate-800 flex items-center justify-center relative group/canvas">
                            <div className="text-slate-700 font-black uppercase tracking-[0.3em] text-[10px] flex flex-col items-center gap-4">
                                <Activity size={32} className="animate-pulse" />
                                Rendering High-Precision Data...
                            </div>
                            {/* SVG Simulation for now */}
                            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 400 100">
                                <path
                                    d="M0 80 Q 50 20, 100 70 T 200 40 T 300 60 T 400 30"
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth="2"
                                />
                            </svg>
                        </div>
                    </div>

                    {/* Side Metrics */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] p-6 shadow-xl">
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Strategy Breakdown</h2>
                            <div className="space-y-4">
                                <StrategyRow name="MACD Momentum" winRate={72} profit={1240} />
                                <StrategyRow name="Ichimoku Cloud" winRate={64} profit={850} />
                                <StrategyRow name="Sentiment Alpha" winRate={58} profit={360} />
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-600/20 to-blue-600/20 border border-blue-500/30 rounded-[32px] p-6 shadow-2xl relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 text-blue-500/10 group-hover:rotate-12 transition-transform duration-700">
                                <Zap size={140} />
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-sm font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                                    <Zap size={16} className="text-blue-400" />
                                    AI Insight
                                </h2>
                                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                    "Your win-rate is highest during the London session with MACD Momentum on BTC/USD. Consider increasing position sizes by 15% on high-confidence signals."
                                </p>
                                <button className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                    Download Full Report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Calendar size={20} className="text-emerald-500" />
                            <h3 className="font-black text-white uppercase tracking-tight">Time Efficiency</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <span>Day</span>
                                <span>Performance</span>
                            </div>
                            <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex">
                                <div className="h-full bg-emerald-500 w-[70%]" title="Positive" />
                                <div className="h-full bg-rose-500 w-[30%]" title="Negative" />
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase pt-2">70% Profitable Days</p>
                        </div>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Filter size={20} className="text-blue-500" />
                            <h3 className="font-black text-white uppercase tracking-tight">Risk Distribution</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Avg Risk/Reward</p>
                                <p className="text-lg font-black text-white">1 : 2.4</p>
                            </div>
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Profit Factor</p>
                                <p className="text-lg font-black text-blue-400">1.82</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <MousePointer2 size={20} className="text-teal-500" />
                            <h3 className="font-black text-white uppercase tracking-tight">Active Signals</h3>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase">Execution Speed</p>
                                <p className="text-2xl font-black text-white tracking-tighter">120ms</p>
                            </div>
                            <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-400 border border-teal-400/20">
                                <TrendingUp size={24} />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    );
}

function StatCard({ title, value, trend, isPositive, icon: Icon }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[32px] p-6 shadow-2xl group hover:border-blue-500/30 transition-all"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 group-hover:scale-110 transition-transform">
                    <Icon size={20} className="text-blue-500" />
                </div>
                {isPositive !== null && (
                    <div className={cn(
                        "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest",
                        isPositive ? "text-emerald-500" : "text-rose-500"
                    )}>
                        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {trend}
                    </div>
                )}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{title}</p>
                <p className="text-3xl font-black text-white tracking-tight leading-none">{value}</p>
            </div>
        </motion.div>
    );
}

function StrategyRow({ name, winRate, profit }: any) {
    return (
        <div className="flex justify-between items-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800 group hover:border-white/10 transition-all">
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                <p className="text-xs font-black text-slate-200 uppercase tracking-tight">{name}</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-emerald-500">{winRate}% Win</p>
                <p className="text-xs font-mono text-white tracking-tighter">+${profit}</p>
            </div>
        </div>
    );
}
