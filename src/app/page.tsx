"use client"
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Signal, TrendingUp, Shield, BarChart3, Globe, Zap, Target, Activity, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [signals, setSignals] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const fetchLatest = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_URL}/signals`);
        const data = await res.json();
        setSignals(data.slice(0, 3));
      } catch (e) {
        console.error(e);
      }
    };
    fetchLatest();
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 overflow-x-hidden selection:bg-blue-500/30">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-blue-600/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-10"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" /> Institutional Grade Alpha
            </div>

            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] uppercase italic">
              Solve the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-500 animate-gradient-x">Market</span>
            </h1>

            <p className="text-xl text-slate-400 max-w-xl leading-relaxed font-medium">
              Smark transforms raw market noise into actionable precision.
              Deploying proprietary MACD convergence logic and AI sentiment scoring.
            </p>

            <div className="flex flex-wrap gap-6 pt-4">
              <Link href="/analysis" className="group relative px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-600/20">
                <span className="relative z-10 flex items-center gap-3">
                  Open Terminal <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link href="/analytics" className="px-10 py-5 bg-slate-950 border border-slate-800 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-900 hover:text-white hover:border-slate-700">
                Strategic Reports
              </Link>
            </div>

            <div className="flex gap-16 pt-10 border-t border-slate-800/50">
              <HeroMetric label="Success Rate" value="84.2%" />
              <HeroMetric label="Live Nodes" value="2.4k+" />
              <HeroMetric label="Uptime" value="100%" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative perspective-1000 hidden lg:block"
          >
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[48px] blur-3xl opacity-10 group-hover:opacity-20 transition duration-1000" />
              <div className="relative bg-[#0a0f1d] border border-white/5 rounded-[48px] p-8 shadow-2xl overflow-hidden group">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/20" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/20" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20" />
                  </div>
                  <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Matrix Scan v4.2</div>
                </div>

                <div className="space-y-6">
                  <div className="h-40 bg-slate-950 rounded-3xl border border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-blue-500/50 animate-scan" />
                    <div className="h-full w-full flex items-end p-4 gap-1">
                      {[40, 70, 45, 90, 65, 80, 50, 95].map((h, i) => (
                        <div key={i} className="flex-1 bg-blue-500/20 rounded-t-sm" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-slate-950 rounded-2xl border border-white/5 p-4">
                      <div className="w-8 h-1 bg-blue-500 rounded-full mb-2" />
                      <div className="w-full h-1 bg-slate-800 rounded-full mb-2" />
                      <div className="w-2/3 h-1 bg-slate-800 rounded-full" />
                    </div>
                    <div className="h-20 bg-slate-950 rounded-2xl border border-white/5 p-4 flex items-center justify-center">
                      <Activity size={24} className="text-blue-500 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Snippets: Live Signals */}
      <section className="py-32 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Live Intelligence</h2>
            <p className="text-slate-500 max-w-md font-medium text-lg italic">Real-time algorithmic detection of high-probability shifts.</p>
          </div>
          <Link href="/analysis" className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 group">
            Analysis Terminal <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AnimatePresence>
            {signals.length > 0 ? signals.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative p-8 bg-slate-900/40 border border-slate-800 rounded-[32px] hover:border-blue-500/30 transition-all overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl -z-10 group-hover:bg-blue-600/10 transition-colors" />
                <div className="flex justify-between items-start mb-8">
                  <span className="font-black text-white text-xl uppercase italic group-hover:text-blue-400 transition-colors tracking-tighter">{s.ticker}</span>
                  <span className="text-[9px] bg-slate-950 text-slate-500 px-3 py-1 rounded-full border border-white/5 font-black uppercase tracking-widest">{s.type.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1">Logic Confidence</p>
                    <p className="text-4xl font-black text-white leading-none tracking-tighter italic">{s.confidence}%</p>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 group-hover:scale-110 transition-transform">
                    <TrendingUp size={24} className="text-blue-500" />
                  </div>
                </div>
              </motion.div>
            )) : (
              [1, 2, 3].map(i => (
                <div key={i} className="p-8 bg-slate-900/40 border border-slate-800 rounded-[32px] animate-pulse h-48" />
              ))
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-32 px-4 md:px-8 bg-slate-950/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-20">
          <ValueCard
            icon={Shield}
            title="Risk Protocol"
            desc="Institutional filters verify every signal against historical volatility, ensuring capital preservation."
            color="blue"
          />
          <ValueCard
            icon={Target}
            title="Precision Edge"
            desc="Multi-dimensional convergence scanning across MACD, RSI, and specialized trend algorithms."
            color="teal"
          />
          <ValueCard
            icon={Globe}
            title="Sentiment Alpha"
            desc="Neural-driven sentiment analysis scans global liquidity news to predict momentum shifts."
            color="indigo"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-900 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="flex justify-center gap-8 mb-8">
            <Link href="#" className="text-slate-600 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">Protocol</Link>
            <Link href="#" className="text-slate-600 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">Infrastructure</Link>
            <Link href="#" className="text-slate-600 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">Reports</Link>
          </div>
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em]">Smark Terminal © 2025 • High-Alpha Intelligence</p>
        </motion.div>
      </footer>
    </main>
  );
}

function HeroMetric({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <div className="text-4xl font-black text-white italic tracking-tighter uppercase">{value}</div>
      <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1 opacity-50">{label}</div>
    </div>
  );
}

function ValueCard({ icon: Icon, title, desc, color }: { icon: any, title: string, desc: string, color: string }) {
  const colors: any = {
    blue: "text-blue-500 bg-blue-500/5 border-blue-500/10",
    teal: "text-teal-500 bg-teal-500/5 border-teal-500/10",
    indigo: "text-indigo-500 bg-indigo-500/5 border-indigo-500/10"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="space-y-6 group"
    >
      <div className={cn("w-16 h-16 rounded-[24px] flex items-center justify-center border transition-all group-hover:scale-110", colors[color])}>
        <Icon size={32} />
      </div>
      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{title}</h3>
      <p className="text-slate-500 text-lg leading-relaxed font-medium italic">{desc}</p>
    </motion.div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
