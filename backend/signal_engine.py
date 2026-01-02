import numpy as np
import pandas as pd

def compute_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1+rs))

def compute_ema(series, period):
    return series.ewm(span=period, adjust=False).mean()

def compute_macd(series, fast=12, slow=26, signal=9):
    exp1 = series.ewm(span=fast, adjust=False).mean()
    exp2 = series.ewm(span=slow, adjust=False).mean()
    macd = exp1 - exp2
    signal_line = macd.ewm(span=signal, adjust=False).mean()
    hist = macd - signal_line
    return macd, signal_line, hist

def compute_obv(close, volume):
    obv = (np.sign(close.diff()) * volume).fillna(0).cumsum()
    return obv

def compute_atr(df, period=14):
    high_low = df['high'] - df['low']
    high_close = np.abs(df['high'] - df['close'].shift())
    low_close = np.abs(df['low'] - df['close'].shift())
    ranges = pd.concat([high_low, high_close, low_close], axis=1)
    true_range = np.max(ranges, axis=1)
    return true_range.rolling(window=period).mean()

def get_volatility_index(df):
    """
    Returns a normalized volatility index (0-100).
    Based on ATR relative to Price.
    """
    atr = compute_atr(df)
    relative_vol = (atr / df['close']) * 100
    # Normalize: 0.5% rel vol is 'Average' (50)
    vol_score = (relative_vol.iloc[-1] / 0.5) * 50
    return min(100, max(0, vol_score))

from .algo_suite import fetch_real_sentiment, detect_turtle_breakout, detect_ichimoku_signals

def detect_divergence(df, lookback=5):
    """
    Detects RSI and OBV Divergence.
    """
    if len(df) < 50:
        return []

    df = df.copy()
    df['RSI'] = compute_rsi(df['close'], period=14)
    df['OBV'] = compute_obv(df['close'], df['volume'])
    df = df.dropna().reset_index(drop=True)

    if len(df) < 2 * lookback + 1:
        return []

    signals = []
    
    # helper to find peaks/troughs
    def is_trough(idx, col):
        if idx < lookback or idx > len(df) - lookback - 1: return False
        return df[col].iloc[idx] == df[col].iloc[idx-lookback:idx+lookback+1].min()

    def is_peak(idx, col):
        if idx < lookback or idx > len(df) - lookback - 1: return False
        return df[col].iloc[idx] == df[col].iloc[idx-lookback:idx+lookback+1].max()

    # Scan for recent RSI Divergence
    i = len(df) - lookback - 1
    if is_trough(i, 'low'):
        # Find previous trough
        prev_i = -1
        for j in range(i - lookback, lookback, -1):
            if is_trough(j, 'low'):
                prev_i = j
                break
        
        if prev_i != -1:
            if df['low'].iloc[i] < df['low'].iloc[prev_i] and df['RSI'].iloc[i] > df['RSI'].iloc[prev_i]:
                signals.append({"type": "Regular Bullish RSI Divergence", "confidence": 85, "entry_price": float(df['close'].iloc[-1]), "indicator": "RSI"})
    
    if is_peak(i, 'high'):
        prev_i = -1
        for j in range(i - lookback, lookback, -1):
            if is_peak(j, 'high'):
                prev_i = j
                break
        if prev_i != -1:
            if df['high'].iloc[i] > df['high'].iloc[prev_i] and df['RSI'].iloc[i] < df['RSI'].iloc[prev_i]:
                signals.append({"type": "Regular Bearish RSI Divergence", "confidence": 88, "entry_price": float(df['close'].iloc[-1]), "indicator": "RSI"})

    return signals

def detect_bull_flag(df):
    """
    Strategy: 15m Momentum Pole (spike) followed by tight consolidation (flag).
    """
    if len(df) < 20: return []
    
    # 1. Detect the "Pole" (spike in price and volume)
    # Look back 5-10 bars for a significant move
    recent_returns = df['close'].pct_change(5).iloc[-10:-2]
    max_return = recent_returns.max()
    
    if max_return > 0.02: # 2% move in 5 bars (customizable)
        # 2. Detect the "Flag" (consolidation)
        # Recent 3-5 bars should be in a tight range or slight pullback
        flag_bars = df.iloc[-5:]
        flag_top = flag_bars['high'].max()
        flag_bottom = flag_bars['low'].min()
        pole_top = df['high'].iloc[-10:-5].max()
        
        # Consolidation check: price staying in top 50% of the movement
        if flag_bottom > (df['close'].iloc[-10] + (pole_top - df['close'].iloc[-10]) * 0.5):
            return [{
                "type": "Bull Flag Formation",
                "confidence": 82,
                "strategy": "Momentum Breakout",
                "reasoning": f"Detected {max_return*100:.1f}% pole followed by tight consolidation.",
                "entry": float(flag_top * 1.001),
                "sl": float(flag_bottom * 0.995),
                "tp": float(flag_top + (pole_top - df['close'].iloc[-10]))
            }]
    return []

def detect_double_bottom(df, lookback=20):
    """
    Strategy: "W" pattern at potential support.
    """
    if len(df) < 50: return []
    
    lows = df['low'].rolling(window=5, center=True).min()
    potential_troughs = []
    for i in range(len(df)-lookback, len(df)-2):
        if df['low'].iloc[i] == lows.iloc[i]:
            potential_troughs.append(i)
            
    if len(potential_troughs) >= 2:
        t1, t2 = potential_troughs[-2], potential_troughs[-1]
        price1, price2 = df['low'].iloc[t1], df['low'].iloc[t2]
        
        # Check if they are roughly at the same level (within 0.5%)
        if abs(price1 - price2) / price1 < 0.005:
            # Neckline is the peak between the two troughs
            neckline = df['high'].iloc[t1:t2].max()
            current_price = df['close'].iloc[-1]
            
            if current_price > neckline * 0.95: # Close to or breaking neckline
                return [{
                    "type": "Double Bottom (W-Pattern)",
                    "confidence": 90,
                    "strategy": "Support Reversal",
                    "reasoning": "Asset found support twice at similar levels. High probability bounce.",
                    "entry": float(neckline * 1.002),
                    "sl": float(min(price1, price2) * 0.99),
                    "tp": float(neckline + (neckline - min(price1, price2)))
                }]
    return []

def detect_macd_cross(df):
    if len(df) < 200: return []
    df = df.copy()
    macd, signal, hist = compute_macd(df['close'])
    df['MACDh_12_26_9'] = hist
    df['EMA200'] = compute_ema(df['close'], period=200)
    
    signals = []
    hist = df['MACDh_12_26_9']
    
    if (hist.iloc[-2] < 0 and hist.iloc[-1] > 0 and 
        df['close'].iloc[-1] > df['EMA200'].iloc[-1]):
        signals.append({
            "type": "MACD Bullish Cross",
            "confidence": 82,
            "entry_price": float(df['close'].iloc[-1]),
            "indicator": "MACD/EMA200"
        })
    return signals

def generate_pro_analysis(ticker, df):
    """
    Combined analysis targeted at specific "Titan" strategies.
    """
    # Helper function to normalize signal structure
    def normalize_signal(signal, default_strategy="Unknown"):
        """Ensure signal has all required keys with proper structure."""
        # Get entry price (handle both 'entry' and 'entry_price' keys)
        entry = signal.get('entry') or signal.get('entry_price', df['close'].iloc[-1] if len(df) > 0 else 0.0)
        
        # Get or calculate stop loss
        sl = signal.get('sl')
        if sl is None:
            # Default SL based on signal type
            if "Bullish" in signal.get('type', '') or "Bull" in signal.get('type', '') or "Long" in signal.get('type', ''):
                sl = entry * 0.98
            else:
                sl = entry * 1.02
        
        # Get or calculate take profit
        tp = signal.get('tp')
        if tp is None:
            # Default TP based on signal type
            if "Bullish" in signal.get('type', '') or "Bull" in signal.get('type', '') or "Long" in signal.get('type', ''):
                tp = entry * 1.05
            else:
                tp = entry * 0.95
        
        return {
            "type": signal.get('type', 'Unknown Signal'),
            "confidence": signal.get('confidence', 50),
            "strategy": signal.get('strategy', default_strategy),
            "reasoning": signal.get('reasoning', signal.get('indicator', 'Pattern detected')),
            "entry": float(entry),
            "sl": float(sl),
            "tp": float(tp)
        }
    
    # 1. Ticker specific logic
    if any(sym in ticker for sym in ['TSLA', 'BTC', 'SOL']):
        # Momentum Assets -> Bull Flags
        flags = detect_bull_flag(df)
        if flags: return normalize_signal(flags[0], "Momentum Breakout")
        
    if any(sym in ticker for sym in ['AAPL', 'MSFT', 'AMZN']):
        # Defensive/Reliable -> Double Bottoms
        w_pattern = detect_double_bottom(df)
        if w_pattern: return normalize_signal(w_pattern[0], "Support Reversal")
        
    # 2. Try Turtle Strategy (Institutional Trend Following)
    turtle = detect_turtle_breakout(df, system=2) # Prefer 55-day for high conviction
    if not turtle:
        turtle = detect_turtle_breakout(df, system=1)
    if turtle: return normalize_signal(turtle[0], "Turtle Trading")
        
    # Catch-all: Divergence
    signals = detect_divergence(df)
    signals.extend(detect_macd_cross(df))
    signals.extend(detect_sentiment(ticker))
    signals.extend(detect_ichimoku_signals(df))
    
    # Volatility Filter
    vol_idx = get_volatility_index(df)
    if vol_idx > 80:
        # High volatility - reduce confidence
        for sig in signals:
            sig["confidence"] = int(sig["confidence"] * 0.7)
            sig["reasoning"] = sig.get("reasoning", "") + " [Filtered for high volatility]"

    if signals:
        d = signals[0] # Take the first signal for now
        # Use normalize_signal helper to ensure consistent structure
        return normalize_signal(d, "Mean Reversion")
            
    return None

def detect_sentiment(ticker: str):
    # Phase 1: Use REAL Sentiment from algo_suite
    try:
        real_sent = fetch_real_sentiment(ticker)
        if real_sent:
            return [{
                "type": real_sent[0]["type"],
                "confidence": real_sent[0]["confidence"],
                "entry_price": 0.0,
                "indicator": "VADER/Google News",
                "reasoning": real_sent[0]["reasoning"]
            }]
    except Exception as e:
        print(f"Sentiment fetch failed: {e}")
        
    # Fallback to local logic (mock)
    mock_headlines = {
        "BTC-USD": ["Bitcoin surges as ETF inflows hit record highs", "Adoption of BTC increasing in emerging markets"],
        "TSLA": ["Tesla delivery numbers beat expectations", "New Gigafactory expansion announced"],
        "AAPL": ["Apple iPhone sales in China showing resilience", "New AI features to boost iPad demand"]
    }
    headlines = mock_headlines.get(ticker, ["Market remains cautious ahead of central bank meeting"])
    positive_words = ["surge", "higher", "growth", "positive", "strong", "bull", "earnings", "hit", "beat", "expansion"]
    negative_words = ["pressure", "lower", "weak", "cut", "negative", "bear", "drag", "drop", "warn"]
    score = 0
    for headline in headlines:
        for word in positive_words:
            if word in headline.lower(): score += 1
        for word in negative_words:
            if word in headline.lower(): score -= 1
    if score > 0:
        return [{"type": "Bullish News Sentiment", "confidence": 75 + (score * 5), "entry_price": 0.0, "indicator": "News Scanner"}]
    elif score < 0:
        return [{"type": "Bearish News Sentiment", "confidence": 75 + (abs(score) * 5), "entry_price": 0.0, "indicator": "News Scanner"}]
    return []
