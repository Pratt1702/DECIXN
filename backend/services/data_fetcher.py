import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime
import warnings

warnings.filterwarnings('ignore')

def fetch_data(symbol, period="100d"):
    """
    1. Fetch historical OHLCV data using yfinance, with fallback to mock data.
    """
    # Sanitize symbol: remove '$', '#', and handle common typos
    symbol = symbol.strip().upper().replace('$', '').replace('#', '')
    
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period)
        if df.empty or len(df) < 2:
            raise ValueError("Insufficient data fetched")
        
        # Keep only required columns and drop rows with NaN Close prices
        df = df[['Open', 'High', 'Low', 'Close', 'Volume']].dropna(subset=['Close'])
        
        if df.empty or len(df) < 2:
            raise ValueError("Insufficient data after dropping NaNs")
            
        return df
    except Exception as e:
        print(f"Failed to fetch data for {symbol} ({e}).")
        raise e

def fetch_ticker_metadata(symbol):
    """
    Fetch rich metadata: info, calendar, and news from yfinance.
    """
    symbol = symbol.strip().upper().replace('$', '').replace('#', '')
    try:
        t = yf.Ticker(symbol)
        
        # Calendar: can be empty for many stocks
        calendar = {}
        try:
            if not t.calendar.empty:
                calendar = t.calendar.to_dict()
        except:
            pass

        # News: yfinance specific news
        news_list = t.news if t.news else []
        
        # Info: expensive but contains dividends
        info = {}
        try:
            info = t.info
        except:
            pass

        return {
            "symbol": symbol,
            "info": info,
            "calendar": calendar,
            "news": news_list
        }
    except Exception as e:
        print(f"Error fetching metadata for {symbol}: {e}")
        return {"symbol": symbol, "error": str(e)}

def generate_mock_data(days=100):
    """Generate generic mock OHLCV data as fallback."""
    dates = pd.date_range(end=datetime.today(), periods=days)
    np.random.seed(42)  # For reproducibility in fallback
    
    close = np.random.normal(0, 5, days).cumsum() + 500 # start around 500
    high = close + np.random.uniform(1, 10, days)
    low = close - np.random.uniform(1, 10, days)
    open_price = close - np.random.uniform(-5, 5, days)
    volume = np.random.randint(100000, 5000000, days)
    
    df = pd.DataFrame({
        'Open': open_price,
        'High': high,
        'Low': low,
        'Close': close,
        'Volume': volume
    }, index=dates)
    return df
