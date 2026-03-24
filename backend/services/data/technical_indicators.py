import pandas as pd
from .data_fetcher import fetch_data

def calculate_return(df, days=30):
    """Calculate percentage return over the last N days."""
    if df is None or len(df) < 2:
        return 0.0
    actual_days = min(len(df), days)
    start_price = df.iloc[-actual_days]['Close']
    end_price = df.iloc[-1]['Close']
    if start_price == 0: return 0.0
    return ((end_price - start_price) / start_price) * 100

def get_benchmark_comparison(stock_df):
    """
    2.2 - Compare stock performance vs Nifty 50 (^NSEI) over 30 days.
    """
    try:
        # Fetch Nifty 50 data
        nifty_df = fetch_data("^NSEI", period="100d")
        
        stock_30d = calculate_return(stock_df, 30)
        nifty_30d = calculate_return(nifty_df, 30)
        
        rel_strength = stock_30d - nifty_30d
        
        if rel_strength > 15: 
            status = "HEAVILY_OUTPERFORMING"
        elif rel_strength > 6:
            status = "OUTPERFORMING"
        elif rel_strength > 2:
            status = "SLIGHTLY_OUTPERFORMING"
        elif rel_strength < -15:
            status = "HEAVILY_UNDERPERFORMING"
        elif rel_strength < -6:
            status = "UNDERPERFORMING"
        elif rel_strength < -2:
            status = "SLIGHTLY_UNDERPERFORMING"
        else:
            status = "NEUTRAL"

        return {
            "stock_30d_return": float(round(stock_30d, 2)),
            "nifty_30d_return": float(round(nifty_30d, 2)),
            "relative_strength": float(round(rel_strength, 2)),
            "status": status
        }
    except Exception as e:
        print(f"Benchmark fetch failed: {e}")
        return None

def calculate_indicators(df):
    """
    2. Calculate RSI, MAs, Volume average, ATR, and MA slopes.
    """
    df = df.copy()
    
    # Calculate Moving Averages (MA20, MA50)
    df['SMA10'] = df['Close'].rolling(window=10).mean()
    df['SMA20'] = df['Close'].rolling(window=20).mean()
    df['SMA50'] = df['Close'].rolling(window=50).mean()
    df['SMA100'] = df['Close'].rolling(window=100).mean()
    df['SMA200'] = df['Close'].rolling(window=200).mean()
    
    df['EMA10'] = df['Close'].ewm(span=10, adjust=False).mean()
    df['EMA20'] = df['Close'].ewm(span=20, adjust=False).mean()
    df['EMA50'] = df['Close'].ewm(span=50, adjust=False).mean()
    df['EMA100'] = df['Close'].ewm(span=100, adjust=False).mean()
    df['EMA200'] = df['Close'].ewm(span=200, adjust=False).mean()
    
    df['MA20'] = df['SMA20']
    df['MA50'] = df['SMA50']
    
    # Calculate Volume average (20-day)
    df['Vol20'] = df['Volume'].rolling(window=20).mean()
    
    # Calculate RSI (14 period) using Wilder's Smoothing
    delta = df['Close'].diff()
    gain = delta.clip(lower=0)
    loss = -1 * delta.clip(upper=0)
    
    avg_gain = gain.ewm(com=13, min_periods=14).mean()
    avg_loss = loss.ewm(com=13, min_periods=14).mean()
    
    rs = avg_gain / avg_loss
    df['RSI'] = 100 - (100 / (1 + rs))
    df['RSI'].fillna(50, inplace=True) # Handle startup NaNs
    
    # Highest close of the last 20 days (excluding today for breakout comparison)
    df['High20'] = df['Close'].shift(1).rolling(window=20).max()
    df['Low20'] = df['Close'].shift(1).rolling(window=20).min()
    
    # Calculate MACD (12, 26, 9)
    ema12 = df['Close'].ewm(span=12, adjust=False).mean()
    ema26 = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = ema12 - ema26
    df['MACD_Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
    df['MACD_Histogram'] = df['MACD'] - df['MACD_Signal']

    # ATR (Average True Range)
    tr1 = df['High'] - df['Low']
    tr2 = (df['High'] - df['Close'].shift(1)).abs()
    tr3 = (df['Low'] - df['Close'].shift(1)).abs()
    df['TR'] = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    df['ATR'] = df['TR'].rolling(window=14).mean()

    # MA Slopes (Momentum)
    df['MA20_Slope'] = (df['MA20'] - df['MA20'].shift(3)) / df['MA20'].shift(3) * 100
    df['MA50_Slope'] = (df['MA50'] - df['MA50'].shift(5)) / df['MA50'].shift(5) * 100

    # Price distance from MAs
    df['Dist_MA20'] = (df['Close'] - df['MA20']) / df['MA20'] * 100
    df['Dist_MA50'] = (df['Close'] - df['MA50']) / df['MA50'] * 100

    return df
