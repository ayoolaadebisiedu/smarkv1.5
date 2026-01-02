"""
Data Loader for Historical Market Data

Loads CSV files from Historicaldata folder with robust format:
- Time, Open, Close, Volume, High, Low, Average, Transactions
- Adjusted prices: AdjOpen, AdjClose, AdjVolume, AdjHigh, AdjLow, AdjAverage
- Corporate actions: Dividend, Split
"""

import pandas as pd
from pathlib import Path
from typing import Optional, List
import os

# Data directory relative to backend folder
DATA_DIR = Path(__file__).parent.parent / "Historicaldata"

def load_historical_data(
    ticker: str, 
    timeframe: str = "day",
    use_adjusted: bool = True,
    asset_type: str = "CS"  # CS = Common Stock, ADRC = ADR
) -> pd.DataFrame:
    """
    Load CSV data for ticker and timeframe.
    
    Args:
        ticker: Asset symbol (AAPL, MSFT, etc.) without prefix
        timeframe: Currently only 'day' supported in new format
        use_adjusted: If True, use AdjClose/AdjOpen for backtesting accuracy
        asset_type: CS (Common Stock) or ADRC (ADR)
    
    Returns:
        DataFrame with columns: timestamp, open, high, low, close, volume, vwap, transactions
    """
    # Build filename: CS_AAPL_day.csv or ADRC_BABA_day.csv
    filename = f"{asset_type}_{ticker}_{timeframe}.csv"
    filepath = DATA_DIR / filename
    
    if not filepath.exists():
        # Try alternative asset type
        alt_type = "ADRC" if asset_type == "CS" else "CS"
        alt_filepath = DATA_DIR / f"{alt_type}_{ticker}_{timeframe}.csv"
        if alt_filepath.exists():
            filepath = alt_filepath
        else:
            raise FileNotFoundError(f"Data file not found: {filename}")
    
    df = pd.read_csv(filepath, parse_dates=["Time"])
    
    # Rename columns to standard format
    df = df.rename(columns={
        "Time": "timestamp",
        "Open": "open",
        "High": "high", 
        "Low": "low",
        "Close": "close",
        "Volume": "volume",
        "Average": "vwap",
        "Transactions": "transactions"
    })
    
    # Use adjusted prices if available and requested
    if use_adjusted:
        if "AdjClose" in df.columns and df["AdjClose"].notna().any():
            df["open"] = df.get("AdjOpen", df["open"])
            df["high"] = df.get("AdjHigh", df["high"])
            df["low"] = df.get("AdjLow", df["low"])
            df["close"] = df.get("AdjClose", df["close"])
            df["volume"] = df.get("AdjVolume", df["volume"])
            df["vwap"] = df.get("AdjAverage", df["vwap"])
    
    # Add dividend and split info if present
    if "Dividend" in df.columns:
        df["dividend"] = df["Dividend"].fillna(0)
    if "Split" in df.columns:
        df["split"] = df["Split"].fillna(1)
    
    # Select final columns
    final_cols = ["timestamp", "open", "high", "low", "close", "volume"]
    if "vwap" in df.columns:
        final_cols.append("vwap")
    if "transactions" in df.columns:
        final_cols.append("transactions")
    if "dividend" in df.columns:
        final_cols.append("dividend")
    if "split" in df.columns:
        final_cols.append("split")
    
    return df[final_cols].dropna(subset=["close"])


def get_available_tickers() -> List[dict]:
    """
    Return list of available tickers with metadata.
    
    Returns:
        List of dicts with ticker, asset_type, and file info
    """
    tickers = []
    
    if not DATA_DIR.exists():
        return tickers
    
    for filepath in DATA_DIR.glob("*_day.csv"):
        filename = filepath.stem  # e.g., CS_AAPL_day
        parts = filename.split("_")
        if len(parts) >= 3:
            asset_type = parts[0]  # CS or ADRC
            ticker = "_".join(parts[1:-1])  # Handle tickers like AKO.A
            
            tickers.append({
                "ticker": ticker,
                "asset_type": asset_type,
                "type_label": "Common Stock" if asset_type == "CS" else "ADR",
                "filename": filepath.name
            })
    
    # Sort by ticker name
    return sorted(tickers, key=lambda x: x["ticker"])


def get_ticker_data_summary(ticker: str, asset_type: str = "CS") -> dict:
    """
    Get summary statistics for a ticker's data.
    """
    try:
        df = load_historical_data(ticker, asset_type=asset_type)
        return {
            "ticker": ticker,
            "asset_type": asset_type,
            "start_date": str(df["timestamp"].min()),
            "end_date": str(df["timestamp"].max()),
            "total_bars": len(df),
            "latest_close": float(df["close"].iloc[-1]) if len(df) > 0 else None
        }
    except Exception as e:
        return {"ticker": ticker, "error": str(e)}


if __name__ == "__main__":
    # Test the data loader
    print("Testing data loader...")
    
    # List available tickers
    tickers = get_available_tickers()
    print(f"Found {len(tickers)} tickers")
    
    # Test loading AAPL
    try:
        df = load_historical_data("AAPL")
        print(f"\nAAPL data loaded: {len(df)} rows")
        print(df.head())
        print(f"\nColumns: {df.columns.tolist()}")
    except Exception as e:
        print(f"Error: {e}")
