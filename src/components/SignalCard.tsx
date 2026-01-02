import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SignalProps {
  signal: {
    ticker: string;
    type: string;
    confidence: number;
    entry: number;
    sl: number;
    tp: number;
    reasoning?: string;
    created_at: string;
  };
}

export const SignalCard: React.FC<SignalProps> = ({ signal }) => {
  const isBullish = signal.type.toLowerCase().includes('bullish');
  const statusColor = signal.confidence > 80 ? 'text-emerald-400' : 'text-amber-400';

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/50 mb-4 hover:border-blue-500/30 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 blur-2xl -z-10 group-hover:bg-blue-600/10 transition-colors" />

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-2xl shadow-lg transition-transform group-hover:scale-110",
            isBullish ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
          )}>
            {isBullish ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>
          <div>
            <span className="font-black text-white text-lg tracking-tight uppercase">{signal.ticker}</span>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(signal.created_at).toLocaleTimeString()}</p>
          </div>
        </div>
        <div className={cn(
          "text-[9px] font-black px-3 py-1.5 rounded-xl bg-slate-950 border border-white/5 uppercase tracking-[0.15em] shadow-inner",
          statusColor
        )}>
          {signal.confidence}% Accuracy
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-black text-white uppercase tracking-tight mb-1">{signal.type.replace(/_/g, ' ')}</h4>
        <p className="text-[10px] text-slate-400 leading-relaxed font-medium line-clamp-2">
          {signal.reasoning || "Algorithm detecting strategic momentum shifts based on convergence logic."}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 py-3 border-t border-white/5">
        <MetricBox label="Entry" value={signal.entry} color="text-white" />
        <MetricBox label="S. Loss" value={signal.sl} color="text-rose-400" />
        <MetricBox label="T. Profit" value={signal.tp} color="text-emerald-400" />
      </div>

      <button className="w-full mt-2 py-2 bg-slate-950/60 hover:bg-slate-800 border border-white/5 rounded-xl text-[9px] font-black text-blue-400 uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/btn">
        Full Strategy Analysis <AlertCircle size={12} className="group-hover/btn:rotate-12 transition-transform" />
      </button>
    </div>
  );
};

function MetricBox({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5 shadow-inner">
      <p className="text-[8px] text-slate-500 uppercase font-black mb-0.5">{label}</p>
      <p className={cn("font-mono text-[11px] font-bold tracking-tighter", color)}>${value.toFixed(2)}</p>
    </div>
  );
}
