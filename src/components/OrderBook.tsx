import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderBookProps {
    ticker: string;
    currentPrice: number;
}

export const OrderBook: React.FC<OrderBookProps> = ({ ticker, currentPrice }) => {
    const [asks, setAsks] = useState<{ price: number; amount: number; total: number }[]>([]);
    const [bids, setBids] = useState<{ price: number; amount: number; total: number }[]>([]);

    useEffect(() => {
        // Mock data generator
        const generateLevel = (basePrice: number, type: 'ask' | 'bid', index: number) => {
            const spread = basePrice * 0.0005; // 0.05% spread
            const step = basePrice * 0.0002;
            const price = type === 'ask'
                ? basePrice + spread + (index * step)
                : basePrice - spread - (index * step);

            const amount = Math.random() * 2 + 0.1;
            return {
                price,
                amount,
                total: amount * price
            };
        };

        const updateBook = () => {
            const newAsks = Array.from({ length: 8 }).map((_, i) => generateLevel(currentPrice, 'ask', i)).reverse();
            const newBids = Array.from({ length: 8 }).map((_, i) => generateLevel(currentPrice, 'bid', i));
            setAsks(newAsks);
            setBids(newBids);
        };

        updateBook();
        const interval = setInterval(updateBook, 1500 + Math.random() * 1000); // Live-ish updates

        return () => clearInterval(interval);
    }, [currentPrice, ticker]);

    return (
        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden shadow-inner flex flex-col h-full">
            <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Order Book</h3>
                <span className="text-[9px] font-mono text-slate-600">Spread: 0.12%</span>
            </div>

            <div className="flex-1 overflow-hidden relative font-mono text-[10px]">
                {/* Asks (Sells) - Red */}
                <div className="flex flex-col justify-end p-1 space-y-0.5">
                    <AnimatePresence>
                        {asks.map((ask, i) => (
                            <OrderRow key={`ask-${i}`} type="ask" data={ask} />
                        ))}
                    </AnimatePresence>
                </div>

                {/* Spread / Current Price Indicator */}
                <div className="py-2 px-4 bg-slate-900/80 border-y border-slate-800 flex justify-between items-center my-1 backdrop-blur-sm sticky top-1/2 -translate-y-1/2 z-10">
                    <div className="flex items-center gap-2 text-emerald-400">
                        <ArrowUp size={12} className={currentPrice > (asks[7]?.price || 0) ? "text-emerald-500" : "text-rose-500 rotate-180"} />
                        <span className="text-xl font-bold tracking-tighter text-white">${currentPrice.toFixed(2)}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase">USD</span>
                </div>

                {/* Bids (Buys) - Green */}
                <div className="flex flex-col justify-start p-1 space-y-0.5">
                    <AnimatePresence>
                        {bids.map((bid, i) => (
                            <OrderRow key={`bid-${i}`} type="bid" data={bid} />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

const OrderRow = ({ type, data }: { type: 'ask' | 'bid', data: { price: number; amount: number; total: number } }) => {
    const bgWidth = Math.min((data.amount / 3) * 100, 100); // Scale bar width

    return (
        <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="flex justify-between items-center px-3 py-1 relative z-0 group hover:bg-white/5 cursor-crosshair"
        >
            {/* Volume Bar Background */}
            <div
                className={`absolute top-0 ${type === 'ask' ? 'right-0 bg-rose-500/10' : 'right-0 bg-emerald-500/10'} h-full -z-10 transition-all duration-300`}
                style={{ width: `${bgWidth}%` }}
            />

            <span className={`font-bold ${type === 'ask' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {data.price.toFixed(2)}
            </span>
            <span className="text-slate-500 font-medium">
                {data.amount.toFixed(4)}
            </span>
            <span className="text-slate-600 w-12 text-right">
                {(data.total / 1000).toFixed(1)}k
            </span>
        </motion.div>
    );
};
