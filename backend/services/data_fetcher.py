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
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period)
        if df.empty or len(df) < 2:
            raise ValueError("Insufficient data fetched")
        
        # Keep only required columns
        df = df[['Open', 'High', 'Low', 'Close', 'Volume']]
        return df
    except Exception as e:
        print(f"Failed to fetch data for {symbol} ({e}).")
        raise e

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
