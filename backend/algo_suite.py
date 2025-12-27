import feedparser
import requests
from bs4 import BeautifulSoup
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from urllib.parse import quote
import pandas as pd

def fetch_real_sentiment(ticker):
    """
    Scans Google News for the ticker and returns a sentiment-based signal.
    """
    query = ticker
    rss_url = f"https://news.google.com/rss/search?q={quote(query)}"
    feed = feedparser.parse(rss_url)
    num_articles = 5
    articles = feed.entries[:num_articles]

    if not articles:
        return []

    analyzer = SentimentIntensityAnalyzer()
    total_score = 0
    
    for item in articles:
        scores = analyzer.polarity_scores(item.title)
        total_score += scores['compound']

    avg_score = total_score / len(articles)
    
    if avg_score > 0.1:
        return [{"type": "Bullish News Sentiment", "confidence": int(70 + (avg_score * 30)), "reasoning": f"Positive news coverage detected for {ticker}."}]
    elif avg_score < -0.1:
        return [{"type": "Bearish News Sentiment", "confidence": int(70 + (abs(avg_score) * 30)), "reasoning": f"Negative news coverage detected for {ticker}."}]
    
    return []

def detect_turtle_breakout(df, system=1):
    """
    Turtle Trading Rules:
    System 1: 20-day high breakout (Entry), 10-day low breakout (Exit)
    System 2: 55-day high breakout (Entry), 20-day low breakout (Exit)
    """
    if len(df) < 60:
        return []
    
    lookback = 20 if system == 1 else 55
    exit_lookback = 10 if system == 1 else 20
    
    current_high = df['high'].iloc[-1]
    current_low = df['low'].iloc[-1]
    
    n_day_high = df['high'].iloc[-lookback-1:-1].max()
    n_day_low = df['low'].iloc[-lookback-1:-1].min()
    
    if current_high > n_day_high:
        return [{
            "type": f"Turtle System {system} Long",
            "confidence": 85 if system == 2 else 75,
            "entry_price": float(df['close'].iloc[-1]),
            "sl": float(df['low'].iloc[-exit_lookback-1:-1].min())
        }]
    elif current_low < n_day_low:
         return [{
            "type": f"Turtle System {system} Short",
            "confidence": 85 if system == 2 else 75,
            "entry_price": float(df['close'].iloc[-1]),
            "sl": float(df['high'].iloc[-exit_lookback-1:-1].max())
        }]
    
    return []

def detect_ichimoku_signals(df):
    """
    Standard Ichimoku Kinko Hyo
    """
    if len(df) < 52:
        return []
        
    df = df.copy()
    
    # Tenkan-sen (Conversion Line): (9-period high + 9-period low) / 2
    period9_high = df['high'].rolling(window=9).max()
    period9_low = df['low'].rolling(window=9).min()
    df['tenkan_sen'] = (period9_high + period9_low) / 2
    
    # Kijun-sen (Base Line): (26-period high + 26-period low) / 2
    period26_high = df['high'].rolling(window=26).max()
    period26_low = df['low'].rolling(window=26).min()
    df['kijun_sen'] = (period26_high + period26_low) / 2
    
    # T-K Cross
    if df['tenkan_sen'].iloc[-2] <= df['kijun_sen'].iloc[-2] and df['tenkan_sen'].iloc[-1] > df['kijun_sen'].iloc[-1]:
        return [{
            "type": "Ichimoku T-K Bullish Cross",
            "confidence": 80,
            "entry_price": float(df['close'].iloc[-1]),
            "indicator": "Ichimoku"
        }]
    elif df['tenkan_sen'].iloc[-2] >= df['kijun_sen'].iloc[-2] and df['tenkan_sen'].iloc[-1] < df['kijun_sen'].iloc[-1]:
        return [{
            "type": "Ichimoku T-K Bearish Cross",
            "confidence": 80,
            "entry_price": float(df['close'].iloc[-1]),
            "indicator": "Ichimoku"
        }]
        
    return []
