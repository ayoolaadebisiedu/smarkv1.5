"use client"
import React, { useState } from 'react';
import { Upload, FileCode, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export function DataProcessor() {
    const [jsonInput, setJsonInput] = useState('');
    const [ticker, setTicker] = useState('BTCUSDT');
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    const handleProcess = async () => {
        setIsProcessing(true);
        setStatus({ type: null, message: '' });
        try {
            let parsedData;
            try {
                parsedData = JSON.parse(jsonInput);
            } catch (e) {
                throw new Error("Invalid JSON format. Please provide an array of OHLCV objects.");
            }

            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/process-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker: ticker,
                    data: parsedData
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.detail || "Processing failed");

            setStatus({
                type: 'success',
                message: `Successfully processed ${result.message}. Signals found: ${result.signals_found}`
            });
            setJsonInput('');
        } catch (e: any) {
            setStatus({ type: 'error', message: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-slate-900/60 rounded-3xl p-8 border border-slate-800 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-600/10 rounded-2xl text-indigo-500 border border-indigo-500/20">
                    <Upload size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">External Data Integration</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Connect external sources to Smark Engine</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Ticker</label>
                        <input
                            type="text"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value.toUpperCase())}
                            placeholder="e.g. BTCUSDT"
                            className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 px-5 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Data (JSON Array)</label>
                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Format: {"{time, open, high, low, close}"}[]</span>
                    </div>
                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder='[{"time": "2025-01-01", "open": 50000, "high": 51000, "low": 49000, "close": 50500}, ...]'
                        className="w-full h-48 bg-slate-950/80 border border-slate-800 text-slate-200 px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-xs resize-none"
                    />
                </div>

                <div className="flex flex-col gap-4">
                    {status.type && (
                        <div className={cn(
                            "flex items-start gap-3 p-4 rounded-2xl border mb-2",
                            status.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        )}>
                            {status.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
                            <p className="text-xs font-bold leading-tight uppercase tracking-tight">{status.message}</p>
                        </div>
                    )}

                    <button
                        onClick={handleProcess}
                        disabled={isProcessing || !jsonInput}
                        className={cn(
                            "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3",
                            isProcessing || !jsonInput
                                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20 transform hover:-translate-y-1"
                        )}
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <FileCode size={18} />}
                        {isProcessing ? "Ingesting Data..." : "Process External Data"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
