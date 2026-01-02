import pandas as pd
from .database import SessionLocal, BacktestResult, Asset
from .signal_engine import detect_divergence, detect_macd_cross, detect_turtle_breakout
import yfinance as yf
from datetime import datetime

class BacktestEngine:
    def __init__(self, db_session):
        self.db = db_session

    def run_backtest(self, ticker: str, strategy_name: str, period="1y", interval="1d"):
        """
        Runs a backtest for a specific ticker and strategy.
        """
        print(f"Running backtest for {ticker} using {strategy_name}...")
        
        # 1. Fetch data
        df = yf.download(ticker, period=period, interval=interval)
        if df.empty:
            return None
        
        df.columns = [c.lower() for c in df.columns]
        
        # 2. Simulate Trades
        trades = []
        # We simulate bar by bar (simplified)
        for i in range(50, len(df)):
            sub_df = df.iloc[:i+1]
            signals = []
            
            if strategy_name == "RSI_Divergence":
                signals = detect_divergence(sub_df)
            elif strategy_name == "MACD_Cross":
                signals = detect_macd_cross(sub_df)
            elif strategy_name == "Turtle_System_1":
                signals = detect_turtle_breakout(sub_df, system=1)
                
            for sig in signals:
                # Basic execution logic: Enter at close, Exit at 2% SL or 5% TP
                entry_price = float(df['close'].iloc[i])
                direction = "buy" if "Bull" in sig['type'] or "Long" in sig['type'] else "sell"
                
                # Simple exit simulation for backtest
                exit_price = entry_price
                pnl = 0
                for j in range(i+1, min(i+20, len(df))):
                    future_price = float(df['close'].iloc[j])
                    if direction == "buy":
                        if future_price <= entry_price * 0.98: # SL
                            exit_price = future_price
                            break
                        if future_price >= entry_price * 1.05: # TP
                            exit_price = future_price
                            break
                    else:
                        if future_price >= entry_price * 1.02: # SL
                            exit_price = future_price
                            break
                        if future_price <= entry_price * 0.95: # TP
                            exit_price = future_price
                            break
                    exit_price = future_price # End of window exit
                
                if direction == "buy":
                    pnl = exit_price - entry_price
                else:
                    pnl = entry_price - exit_price
                    
                trades.append(pnl)

        # 3. Calculate Metrics
        if not trades:
            return None
            
        wins = [t for t in trades if t > 0]
        losses = [t for t in trades if t <= 0]
        
        win_rate = len(wins) / len(trades) if trades else 0
        total_pnl = sum(trades)
        profit_factor = sum(wins) / abs(sum(losses)) if losses and sum(losses) != 0 else float('inf')
        
        result = BacktestResult(
            strategy_name=strategy_name,
            ticker=ticker,
            timeframe=interval,
            win_rate=win_rate,
            total_trades=len(trades),
            profit_factor=profit_factor,
            total_pnl=total_pnl,
            max_drawdown=0.0, # Placeholder
            run_at=datetime.utcnow()
        )
        
        self.db.add(result)
        self.db.commit()
        return result

def run_nightly_backtests():
    db = SessionLocal()
    engine = BacktestEngine(db)
    
    # Get active assets
    assets = db.query(Asset).filter(Asset.is_active == True).all()
    strategies = ["RSI_Divergence", "MACD_Cross", "Turtle_System_1"]
    
    for asset in assets:
        for strategy in strategies:
            try:
                engine.run_backtest(asset.ticker, strategy)
            except Exception as e:
                print(f"Backtest failed for {asset.ticker} {strategy}: {e}")
    
    db.close()
