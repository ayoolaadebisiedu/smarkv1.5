from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import SessionLocal, init_db, Asset, Signal, Trade, Account, BacktestResult
from .signal_engine import detect_divergence, detect_macd_cross, detect_sentiment, generate_pro_analysis, detect_ichimoku_signals
from .backtest_engine import run_nightly_backtests
from .risk_manager import RiskManager
from .data_loader import load_historical_data, get_available_tickers, get_ticker_data_summary
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from .execution.manager import ExecutionManager
from .analysis.alpha_engine import AlphaAnalyzer, FactorConverter, AlphaDataBridge

execution_manager = ExecutionManager()
alpha_analyzer = AlphaAnalyzer()

class DataPoint(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float

class MarketDataUpload(BaseModel):
    ticker: str
    data: List[DataPoint]

from fastapi.middleware.cors import CORSMiddleware
from inngest.fast_api import serve as inngest_serve
from .inngest_client import inngest_client
from .inngest_functions import sync_market_data, process_signals_workflow, nightly_backtest_cron

app = FastAPI(title="Smark Signal Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def startup_event():
    init_db()

# Register Inngest functions only if Inngest is configured
if inngest_client is not None:
    inngest_serve(
        app=app,
        client=inngest_client,
        functions=[sync_market_data, process_signals_workflow, nightly_backtest_cron]
    )
else:
    print("INFO: Inngest is not configured. Set INNGEST_SIGNING_KEY environment variable to enable Inngest functions.")


class RiskRequest(BaseModel):
    account_balance: float
    risk_per_trade: float = 0.01
    entry_price: float
    stop_loss: float
    pip_value: float = 10.0
    is_forex: bool = True

class TradeOpenRequest(BaseModel):
    ticker: str
    direction: str # buy, sell
    amount: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

@app.get("/")
def read_root():
    return {"message": "Smark API is running"}

@app.get("/account/summary")
def get_account_summary(db: Session = Depends(get_db)):
    account = db.query(Account).first()
    if not account:
        account = Account(balance=10000.0)
        db.add(account)
        db.commit()
        db.refresh(account)
    
    closed_trades = db.query(Trade).filter(Trade.status == "Closed").all()
    total_pnl = sum(t.pnl for t in closed_trades)
    
    return {
        "balance": account.balance,
        "total_pnl": total_pnl,
        "trades_count": len(closed_trades)
    }

@app.post("/trades/open")
def open_trade(req: TradeOpenRequest, db: Session = Depends(get_db)):
    df = fetch_live_data(req.ticker, period="1d", interval="1m")
    if df.empty:
        # Fallback if 1m is not available for stocks sometimes after hours
        df = fetch_live_data(req.ticker, period="5d", interval="1h")
        if df.empty:
            raise HTTPException(status_code=400, detail="Could not fetch current price")
    
    current_price = float(df['close'].iloc[-1])
    
    trade = Trade(
        ticker=req.ticker,
        direction=req.direction,
        entry_price=current_price,
        stop_loss=req.stop_loss,
        take_profit=req.take_profit,
        amount=req.amount,
        status="Open"
    )
    db.add(trade)
    db.commit()
    return {"message": "Trade opened", "entry_price": current_price}

@app.get("/trades/active")
def get_active_trades(db: Session = Depends(get_db)):
    trades = db.query(Trade).filter(Trade.status == "Open").all()
    return [
        {
            "id": t.id,
            "ticker": t.ticker,
            "direction": t.direction,
            "entry_price": t.entry_price,
            "amount": t.amount,
            "created_at": t.created_at
        } for t in trades
    ]

@app.get("/trades/history", response_model=List[dict])
def get_trade_history(db: Session = Depends(get_db)):
    trades = db.query(Trade).filter(Trade.status == "Closed").order_by(Trade.closed_at.desc()).all()
    return [
        {
            "id": t.id,
            "ticker": t.ticker,
            "direction": t.direction,
            "entry_price": t.entry_price,
            "exit_price": t.exit_price,
            "stop_loss": t.stop_loss,
            "take_profit": t.take_profit,
            "amount": t.amount,
            "pnl": t.pnl,
            "status": t.status,
            "created_at": t.created_at,
            "closed_at": t.closed_at
        } for t in trades
    ]

@app.post("/trades/close/{trade_id}")
def close_trade(trade_id: int, db: Session = Depends(get_db)):
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade or trade.status == "Closed":
        raise HTTPException(status_code=404, detail="Trade not found or already closed")
    
    df = fetch_live_data(trade.ticker, period="1d", interval="1m")
    if df.empty:
        df = fetch_live_data(trade.ticker, period="5d", interval="1h")
        if df.empty:
             raise HTTPException(status_code=400, detail="Could not fetch current price")
    
    exit_price = float(df['close'].iloc[-1])
    
    if trade.direction == "buy":
        pnl = (exit_price - trade.entry_price) * trade.amount
    else:
        pnl = (trade.entry_price - exit_price) * trade.amount
    
    trade.exit_price = exit_price
    trade.pnl = pnl
    trade.status = "Closed"
    trade.closed_at = datetime.utcnow()
    
    account = db.query(Account).first()
    if account:
        account.balance += pnl
    
    db.commit()
    return {"message": "Trade closed", "exit_price": exit_price, "pnl": pnl}

@app.get("/signals", response_model=List[dict])
def get_signals(db: Session = Depends(get_db)):
    signals = db.query(Signal).order_by(Signal.created_at.desc()).limit(20).all()
    return [
        {
            "ticker": s.asset.ticker,
            "type": s.signal_type,
            "confidence": s.confidence,
            "entry": s.entry_price,
            "sl": s.stop_loss,
            "tp": s.take_profit,
            "created_at": s.created_at
        } for s in signals
    ]

@app.get("/backtests", response_model=List[dict])
def get_backtest_results(db: Session = Depends(get_db)):
    results = db.query(BacktestResult).order_by(BacktestResult.run_at.desc()).limit(50).all()
    return [
        {
            "strategy": r.strategy_name,
            "ticker": r.ticker,
            "win_rate": r.win_rate,
            "total_trades": r.total_trades,
            "profit_factor": r.profit_factor,
            "total_pnl": r.total_pnl,
            "run_at": r.run_at
        } for r in results
    ]

@app.post("/backtests/run")
def trigger_backtests():
    run_nightly_backtests()
    return {"message": "Backtests triggered successfully"}

@app.post("/calculate-risk")
def calculate_risk(req: RiskRequest):
    rm = RiskManager(req.account_balance, req.risk_per_trade)
    pos_size = rm.calculate_position_size(req.entry_price, req.stop_loss, req.pip_value, req.is_forex)
    rr = rm.get_risk_reward_ratio(req.entry_price, req.stop_loss, req.entry_price + (abs(req.entry_price - req.stop_loss) * 2)) # Default 1:2
    return {
        "position_size": pos_size,
        "risk_reward": rr,
        "unit": "Lots" if req.is_forex else "Units"
    }

# Real data fetcher
import yfinance as yf

def fetch_live_data(ticker: str, period="1mo", interval="1h"):
    try:
        yf_ticker = ticker
        if ticker.endswith("USDT"):
             yf_ticker = ticker.replace("USDT", "-USD")
        
        # Using Ticker.history for a cleaner flat DataFrame
        ticker_obj = yf.Ticker(yf_ticker)
        df = ticker_obj.history(period=period, interval=interval)
        
        if df.empty:
            return pd.DataFrame()
            
        # Normalize columns to lowercase
        df.columns = [c.lower() for c in df.columns]
        
        # Ensure we have required columns
        required = ['open', 'high', 'low', 'close']
        if not all(col in df.columns for col in required):
            # If columns are named differently (e.g. capitalized), this handles it.
            # Ticker.history usually returns Capitalized names.
            return pd.DataFrame()
            
        return df
    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        return pd.DataFrame()

@app.get("/history/{ticker}")
def get_history(ticker: str):
    # Retrieve real historical data for charting
    df = fetch_live_data(ticker, period="6mo", interval="1d")
    
    if df.empty:
        return []
        
    # Convert to lightweight-charts format
    chart_data = []
    
    # yf.download with interval='1d' usually returns DatetimeIndex
    for index, row in df.iterrows():
        chart_data.append({
            "time": index.strftime("%Y-%m-%d"),
            "open": row['open'],
            "high": row['high'],
            "low": row['low'],
            "close": row['close']
        })
    return chart_data

@app.post("/process-data")
def process_external_data(req: MarketDataUpload, db: Session = Depends(get_db)):
    """
    Processes external market data and generates signals.
    """
    if not req.data:
        raise HTTPException(status_code=400, detail="No data provided")
    
    # Convert to DataFrame
    df_dict = {
        "time": [item.time for item in req.data],
        "open": [item.open for item in req.data],
        "high": [item.high for item in req.data],
        "low": [item.low for item in req.data],
        "close": [item.close for item in req.data]
    }
    df = pd.DataFrame(df_dict)
    
    # Ensure correct column names for signal engines
    df.columns = [c.lower() for c in df.columns]
    
    if len(df) < 50:
         return {"message": "Not enough data for processing (min 50 candles)", "signals_found": 0}

    signals = detect_divergence(df)
    signals.extend(detect_macd_cross(df))
    signals.extend(detect_ichimoku_signals(df))
    
    asset = db.query(Asset).filter(Asset.ticker == req.ticker).first()
    if not asset:
        asset = Asset(ticker=req.ticker, asset_class="Uploaded")
        db.add(asset)
        db.commit()
        db.refresh(asset)
        
    for sig in signals:
        db_sig = Signal(
            asset_id=asset.id,
            signal_type=sig["type"],
            confidence=sig["confidence"],
            entry_price=sig.get("entry_price", 0.0),
            stop_loss=sig.get("entry_price", 0.0) * 0.98,
            take_profit=sig.get("entry_price", 0.0) * 1.05,
        )
        db.add(db_sig)
        
    db.commit()
    return {"message": f"Processed {len(req.data)} bars for {req.ticker}", "signals_found": len(signals), "details": signals}

# Mock endpoint to trigger signal scan (In production this would be a background task)
@app.post("/scan/{ticker}")
def scan_ticker(ticker: str, db: Session = Depends(get_db)):
    # Fetch Live Data
    df = fetch_live_data(ticker, period="1mo", interval="1h") 
    
    if df.empty or len(df) < 50:
        return {"message": f"Not enough data found for {ticker}", "signals_found": 0}

    signals = detect_divergence(df)
    signals.extend(detect_macd_cross(df))
    signals.extend(detect_sentiment(ticker))
    signals.extend(detect_ichimoku_signals(df))
    
    asset = db.query(Asset).filter(Asset.ticker == ticker).first()
    if not asset:
        asset = Asset(ticker=ticker, asset_class="Mock")
        db.add(asset)
        db.commit()
        db.refresh(asset)
        
    for sig in signals:
        # Avoid duplicates logic (omitted for brevity)
        db_sig = Signal(
            asset_id=asset.id,
            signal_type=sig["type"],
            confidence=sig["confidence"],
            entry_price=sig.get("entry_price", 0.0),
            stop_loss=sig.get("entry_price", 0.0) * 0.98, # Mock SL
            take_profit=sig.get("entry_price", 0.0) * 1.05, # Mock TP
        )
        db.add(db_sig)
        
    db.commit()
    return {"message": f"Scan complete for {ticker}", "signals_found": len(signals), "details": signals}
@app.get("/analysis/suggestion/{ticker}")
def get_analysis_suggestion(ticker: str):
    """
    Returns a high-conviction trade setup based on Titan strategies.
    """
    df = fetch_live_data(ticker, period="1mo", interval="15m") 
    if df.empty:
        df = fetch_live_data(ticker, period="1mo", interval="1h")
        
    if df.empty:
        raise HTTPException(status_code=404, detail="No data found for asset")
        
    suggestion = generate_pro_analysis(ticker, df)
    if not suggestion:
        return {"ticker": ticker, "recommendation": "NEUTRAL", "reasoning": "Waiting for high-conviction pattern convergence."}
    
    # Use safe dictionary access with defaults
    signal_type = suggestion.get('type', '')
    return {
        "ticker": ticker,
        "recommendation": "BUY" if any(x in signal_type for x in ["Bullish", "Bull", "W-Pattern", "Long"]) else "SELL",
        "entry": suggestion.get('entry', df['close'].iloc[-1] if len(df) > 0 else 0.0),
        "tp": suggestion.get('tp', suggestion.get('entry', df['close'].iloc[-1] if len(df) > 0 else 0.0) * 1.05),
        "sl": suggestion.get('sl', suggestion.get('entry', df['close'].iloc[-1] if len(df) > 0 else 0.0) * 0.98),
        "strategy": suggestion.get('strategy', 'Unknown'),
        "reasoning": suggestion.get('reasoning', 'Pattern detected'),
        "pattern": signal_type,
        "confidence": suggestion.get('confidence', 50)
    }

# ==================== ALGO DASH ENDPOINTS ====================

class BacktestRequest(BaseModel):
    ticker: str
    strategy: str = "MACD_Cross"  # MACD_Cross, RSI_Divergence, Turtle_Breakout, Ichimoku
    initial_capital: float = 10000.0
    asset_type: str = "CS"  # CS = Common Stock, ADRC = ADR

@app.get("/algo-dash/tickers")
def get_algo_dash_tickers():
    """Get list of available tickers for Algo Dash."""
    tickers = get_available_tickers()
    # Limit to first 500 for performance
    return {
        "tickers": tickers[:500],
        "total": len(tickers),
        "strategies": ["MACD_Cross", "RSI_Divergence", "Turtle_Breakout", "Ichimoku"]
    }

@app.get("/algo-dash/historical/{ticker}")
def get_algo_dash_historical(ticker: str, asset_type: str = "CS"):
    """Get historical OHLCV data for charting."""
    try:
        df = load_historical_data(ticker, asset_type=asset_type)
        
        # Convert to chart-friendly format
        chart_data = []
        for _, row in df.iterrows():
            chart_data.append({
                "time": row["timestamp"].strftime("%Y-%m-%d"),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": float(row["volume"]) if pd.notna(row["volume"]) else 0
            })
        
        return {"ticker": ticker, "data": chart_data}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Data not found for {ticker}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/algo-dash/run-backtest")
def run_algo_backtest(req: BacktestRequest, db: Session = Depends(get_db)):
    """
    Run a backtest on historical data using specified strategy.
    Returns equity curve, trades, and Tidy Finance metrics.
    """
    try:
        df = load_historical_data(req.ticker, asset_type=req.asset_type)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Data not found for {req.ticker}")
    
    if len(df) < 50:
        raise HTTPException(status_code=400, detail="Not enough data for backtesting (min 50 bars)")
    
    # Run backtest
    capital = req.initial_capital
    equity_curve = [{"time": df.iloc[0]["timestamp"].strftime("%Y-%m-%d"), "value": capital}]
    trades = []
    position = None
    running_max = capital
    max_drawdown = 0
    
    # Calculate indicators based on strategy
    df = df.reset_index(drop=True)
    
    if req.strategy == "MACD_Cross":
        df["ema12"] = df["close"].ewm(span=12).mean()
        df["ema26"] = df["close"].ewm(span=26).mean()
        df["macd"] = df["ema12"] - df["ema26"]
        df["signal"] = df["macd"].ewm(span=9).mean()
        df["signal_buy"] = (df["macd"] > df["signal"]) & (df["macd"].shift(1) <= df["signal"].shift(1))
        df["signal_sell"] = (df["macd"] < df["signal"]) & (df["macd"].shift(1) >= df["signal"].shift(1))
    elif req.strategy == "RSI_Divergence":
        delta = df["close"].diff()
        gain = delta.where(delta > 0, 0).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss
        df["rsi"] = 100 - (100 / (1 + rs))
        df["signal_buy"] = df["rsi"] < 30
        df["signal_sell"] = df["rsi"] > 70
    elif req.strategy == "Turtle_Breakout":
        df["high_20"] = df["high"].rolling(20).max()
        df["low_20"] = df["low"].rolling(20).min()
        df["signal_buy"] = df["close"] > df["high_20"].shift(1)
        df["signal_sell"] = df["close"] < df["low_20"].shift(1)
    else:  # Ichimoku
        df["tenkan"] = (df["high"].rolling(9).max() + df["low"].rolling(9).min()) / 2
        df["kijun"] = (df["high"].rolling(26).max() + df["low"].rolling(26).min()) / 2
        df["signal_buy"] = (df["tenkan"] > df["kijun"]) & (df["tenkan"].shift(1) <= df["kijun"].shift(1))
        df["signal_sell"] = (df["tenkan"] < df["kijun"]) & (df["tenkan"].shift(1) >= df["kijun"].shift(1))
    
    # Simulate trades
    for i in range(50, len(df)):
        row = df.iloc[i]
        
        # Entry logic
        if position is None:
            if row.get("signal_buy", False):
                position = {
                    "entry_price": row["close"],
                    "entry_time": row["timestamp"].strftime("%Y-%m-%d"),
                    "direction": "long"
                }
        else:
            # Exit logic
            exit_trade = False
            if row.get("signal_sell", False):
                exit_trade = True
            
            # Simple stop-loss (5%) and take-profit (10%)
            if position["direction"] == "long":
                pnl_pct = (row["close"] - position["entry_price"]) / position["entry_price"]
                if pnl_pct <= -0.05 or pnl_pct >= 0.10:
                    exit_trade = True
            
            if exit_trade:
                pnl_pct = (row["close"] - position["entry_price"]) / position["entry_price"]
                pnl_dollars = capital * 0.1 * pnl_pct  # 10% position size
                capital += pnl_dollars
                
                trades.append({
                    "entry_time": position["entry_time"],
                    "exit_time": row["timestamp"].strftime("%Y-%m-%d"),
                    "entry_price": position["entry_price"],
                    "exit_price": row["close"],
                    "pnl": round(pnl_dollars, 2),
                    "pnl_pct": round(pnl_pct * 100, 2),
                    "direction": position["direction"]
                })
                position = None
        
        # Track equity curve
        equity_curve.append({
            "time": row["timestamp"].strftime("%Y-%m-%d"),
            "value": round(capital, 2)
        })
        
        # Track max drawdown
        running_max = max(running_max, capital)
        drawdown = (running_max - capital) / running_max
        max_drawdown = max(max_drawdown, drawdown)
    
    # Calculate Tidy Finance metrics
    returns = []
    for i in range(1, len(equity_curve)):
        prev = equity_curve[i-1]["value"]
        curr = equity_curve[i]["value"]
        if prev > 0:
            returns.append((curr - prev) / prev)
    
    returns_arr = np.array(returns)
    total_return = (capital - req.initial_capital) / req.initial_capital
    ann_return = np.mean(returns_arr) * 252 if len(returns_arr) > 0 else 0
    ann_volatility = np.std(returns_arr) * np.sqrt(252) if len(returns_arr) > 0 else 0
    sharpe_ratio = ann_return / ann_volatility if ann_volatility > 0 else 0
    
    # Win rate and profit factor
    wins = [t for t in trades if t["pnl"] > 0]
    losses = [t for t in trades if t["pnl"] < 0]
    win_rate = len(wins) / len(trades) * 100 if trades else 0
    total_wins = sum(t["pnl"] for t in wins)
    total_losses = abs(sum(t["pnl"] for t in losses))
    profit_factor = total_wins / total_losses if total_losses > 0 else float('inf')
    
    # Save backtest result to database
    result = BacktestResult(
        ticker=req.ticker,
        strategy_name=req.strategy,
        win_rate=win_rate,
        total_trades=len(trades),
        profit_factor=min(profit_factor, 999),  # Cap for DB
        total_pnl=capital - req.initial_capital,
        max_drawdown=max_drawdown
    )
    db.add(result)
    db.commit()
    
    return {
        "ticker": req.ticker,
        "strategy": req.strategy,
        "initial_capital": req.initial_capital,
        "final_capital": round(capital, 2),
        "total_return_pct": round(total_return * 100, 2),
        "metrics": {
            "sharpe_ratio": round(sharpe_ratio, 2),
            "max_drawdown_pct": round(max_drawdown * 100, 2),
            "win_rate_pct": round(win_rate, 2),
            "profit_factor": round(min(profit_factor, 999), 2),
            "total_trades": len(trades),
            "ann_return_pct": round(ann_return * 100, 2),
            "ann_volatility_pct": round(ann_volatility * 100, 2)
        },
        "equity_curve": equity_curve,
        "trades": trades[-20:]  # Return last 20 trades
    }

@app.get("/algo-dash/ticker-summary/{ticker}")
def get_ticker_summary(ticker: str, asset_type: str = "CS"):
    """Get summary statistics for a ticker."""
    return get_ticker_data_summary(ticker, asset_type)

# ==================== EXECUTION ENDPOINTS ====================

@app.get("/execution/status")
def get_execution_status():
    """Get current execution engines status."""
    return execution_manager.get_status()

@app.post("/execution/platform")
def set_execution_platform(platform: str):
    """Switch active trading platform (mt5/alpaca)."""
    success = execution_manager.set_active_platform(platform)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid platform. Use 'mt5' or 'alpaca'.")
    return {"message": f"Platform switched to {platform}"}

class TradeRequest(BaseModel):
    symbol: str
    side: str  # buy/sell
    volume: float
    price: Optional[float] = None
    sl: Optional[float] = None
    tp: Optional[float] = None

@app.post("/execution/trade")
def execute_trade(req: TradeRequest):
    """Execute a trade on the active platform."""
    result = execution_manager.execute_trade(
        req.symbol, req.side, req.volume, req.price, req.sl, req.tp
    )
    if not result:
        raise HTTPException(status_code=500, detail="Trade execution failed.")
    return {"message": "Trade executed", "result": result}

@app.get("/execution/positions")
def get_execution_positions():
    """Get active positions from the current platform."""
    return execution_manager.get_positions()

@app.post("/execution/close/{ticket_or_symbol}")
def close_execution_position(ticket_or_symbol: str):
    """Close an active position."""
    # Try as integer first (MT5 ticket)
    try:
        val = int(ticket_or_symbol)
    except ValueError:
        val = ticket_or_symbol
        
    success = execution_manager.close_position(val)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to close position.")
    return {"message": "Position closed successfully"}

# ==================== ANALYSIS ENDPOINTS ====================

@app.post("/analysis/alpha/{strategy_type}")
def run_alpha_analysis(strategy_type: str, db: Session = Depends(get_db)):
    """Run Alphalens analysis on a specific strategy type."""
    # 1. Fetch signals for this strategy
    signals = db.query(Signal).filter(Signal.signal_type.contains(strategy_type)).all()
    if not signals:
        raise HTTPException(status_code=404, detail="No signals found for this strategy.")
    
    # 2. Convert to factor DF
    signals_df = FactorConverter.signals_to_factor_df(signals)
    
    # 3. Fetch historical prices
    tickers = list(signals_df['asset'].unique())
    start_date = signals_df['date'].min().strftime('%Y-%m-%d')
    end_date = (signals_df['date'].max() + timedelta(days=10)).strftime('%Y-%m-%d')
    
    prices_df = AlphaDataBridge.fetch_historical_prices(tickers, start_date, end_date)
    
    if prices_df.empty:
        raise HTTPException(status_code=500, detail="Failed to fetch historical prices for analysis.")
    
    # 4. Run Analysis
    results = alpha_analyzer.run_full_analysis(signals_df, prices_df)
    
    return results
