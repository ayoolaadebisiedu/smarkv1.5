"""
Inngest functions for Smark backend data handling.
Includes cron jobs for market data syncing and signal processing workflows.
"""
from inngest import Inngest, TriggerCron, TriggerEvent
from .inngest_client import inngest_client
from .database import SessionLocal, Asset, Signal
from .signal_engine import detect_divergence, detect_macd_cross, detect_sentiment, detect_ichimoku_signals
import pandas as pd
import yfinance as yf
from datetime import datetime
from functools import wraps

# Helper to create a no-op decorator when Inngest is not configured
def noop_decorator(*args, **kwargs):
    # If called with arguments (like @decorator(fn_id="..."))
    if args and callable(args[0]):
        # Called without parentheses: @decorator
        return args[0]
    # Called with parentheses: @decorator(...)
    def decorator(func):
        return func
    return decorator

# Ticker lists based on user suggestions
STOCK_TICKERS = [
    # Major Indices
    "^GSPC", "^DJI", "^IXIC",
    # Magnificent 7
    "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "NVDA"
]

CRYPTO_TICKERS = [
    "BTC-USD", "ETH-USD", "USDT-USD", "BNB-USD", 
    "XRP-USD", "SOL-USD", "ADA-USD"
]

ALL_TICKERS = STOCK_TICKERS + CRYPTO_TICKERS


def fetch_live_data(ticker: str, period="1mo", interval="1h"):
    """Fetch market data using yfinance."""
    try:
        ticker_obj = yf.Ticker(ticker)
        df = ticker_obj.history(period=period, interval=interval)
        
        if df.empty:
            return pd.DataFrame()
            
        df.columns = [c.lower() for c in df.columns]
        required = ['open', 'high', 'low', 'close']
        if not all(col in df.columns for col in required):
            return pd.DataFrame()
            
        return df
    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        return pd.DataFrame()


# Use conditional decorator based on whether Inngest is configured
inngest_decorator = inngest_client.create_function if inngest_client is not None else noop_decorator

@inngest_decorator(
    fn_id="sync-market-data",
    trigger=TriggerCron(cron="0 */4 * * *")  # Every 4 hours
)
async def sync_market_data(ctx, step):
    """
    Cron job: Syncs market data for all prioritized tickers every 4 hours.
    """
    results = []
    
    for ticker in ALL_TICKERS:
        # Use step.run to make each ticker fetch retryable
        result = await step.run(
            f"fetch-{ticker}",
            lambda t=ticker: _fetch_and_store(t)
        )
        results.append(result)
    
    return {
        "message": "Market data sync complete",
        "tickers_processed": len(ALL_TICKERS),
        "results": results
    }


def _fetch_and_store(ticker: str):
    """Helper function to fetch data and trigger signal processing."""
    df = fetch_live_data(ticker, period="1mo", interval="1h")
    
    if df.empty or len(df) < 50:
        return {"ticker": ticker, "status": "insufficient_data"}
    
    # Send event to trigger signal processing (only if Inngest is configured)
    if inngest_client is not None:
        inngest_client.send({
            "name": "market/data.synced",
            "data": {
                "ticker": ticker,
                "bars_count": len(df),
                "timestamp": datetime.utcnow().isoformat()
            }
        })
    
    return {"ticker": ticker, "status": "success", "bars": len(df)}


@inngest_decorator(
    fn_id="process-signals-workflow",
    trigger=TriggerEvent(event="market/data.synced")
)
async def process_signals_workflow(ctx, step):
    """
    Workflow: Triggered when market data is synced.
    Runs signal detection algorithms and stores results in the database.
    """
    ticker = ctx.event.data.get("ticker")
    
    # Step 1: Fetch fresh data
    df = await step.run(
        "fetch-data",
        lambda: fetch_live_data(ticker, period="1mo", interval="1h")
    )
    
    if df.empty or len(df) < 50:
        return {"ticker": ticker, "status": "skipped", "reason": "insufficient_data"}
    
    # Step 2: Run signal detection
    signals = await step.run(
        "detect-signals",
        lambda: _detect_all_signals(ticker, df)
    )
    
    # Step 3: Store signals in database
    stored_count = await step.run(
        "store-signals",
        lambda: _store_signals(ticker, signals)
    )
    
    return {
        "ticker": ticker,
        "signals_detected": len(signals),
        "signals_stored": stored_count,
        "timestamp": datetime.utcnow().isoformat()
    }


def _detect_all_signals(ticker: str, df: pd.DataFrame):
    """Run all signal detection algorithms."""
    signals = []
    signals.extend(detect_divergence(df))
    signals.extend(detect_macd_cross(df))
    signals.extend(detect_sentiment(ticker))
    signals.extend(detect_ichimoku_signals(df))
    return signals


def _store_signals(ticker: str, signals: list):
    """Store detected signals in the database."""
    db = SessionLocal()
    try:
        # Get or create asset
        asset = db.query(Asset).filter(Asset.ticker == ticker).first()
        if not asset:
            asset = Asset(ticker=ticker, asset_class="Auto-Synced")
            db.add(asset)
            db.commit()
            db.refresh(asset)
        
        # Store each signal
        stored_count = 0
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
            stored_count += 1
        
        db.commit()
        return stored_count
    finally:
        db.close()


@inngest_decorator(
    fn_id="nightly-backtest-cron",
    trigger=TriggerCron(cron="0 2 * * *")  # 2 AM daily
)
async def nightly_backtest_cron(ctx, step):
    """
    Cron job: Runs nightly backtests on all strategies.
    """
    from .backtest_engine import run_nightly_backtests
    
    result = await step.run(
        "run-backtests",
        run_nightly_backtests
    )
    
    return {
        "message": "Nightly backtests complete",
        "timestamp": datetime.utcnow().isoformat()
    }
