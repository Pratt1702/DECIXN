import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings

warnings.filterwarnings('ignore')

def fetch_data(symbol, period="100d"):
    """
    1. Fetch historical OHLCV data using yfinance, with fallback to mock data.
    """
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period)
        if df.empty or len(df) < 50:
            raise ValueError("Insufficient data fetched")
        
        # Keep only required columns
        df = df[['Open', 'High', 'Low', 'Close', 'Volume']]
        return df
    except Exception as e:
        print(f"Failed to fetch data for {symbol} ({e}). Using mock data fallback.")
        return generate_mock_data()

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

def calculate_indicators(df):
    """
    2. Calculate RSI, MA20, MA50, and Volume average.
    """
    df = df.copy()
    
    # Calculate Moving Averages (MA20, MA50)
    df['MA20'] = df['Close'].rolling(window=20).mean()
    df['MA50'] = df['Close'].rolling(window=50).mean()
    
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
    
    return df

def generate_signals(df):
    """
    3. Generate trading signals based on calculated indicators.
    """
    latest = df.iloc[-1]
    
    signals = {
        'Price': latest['Close'],
        'RSI': latest['RSI'],
        'Breakout': False,
        'Volume_Spike': False,
        'Overbought': False,
        'Oversold': False,
        'Trend': 'Neutral',
        'MA20': latest['MA20'],
        'MA50': latest['MA50']
    }
    
    # Breakout: Current price > highest close of last 20 days
    if latest['Close'] > latest['High20']:
        signals['Breakout'] = True
        
    # Volume Spike: Current volume > 2 * 20-day average volume
    if latest['Volume'] > 2 * latest['Vol20']:
        signals['Volume_Spike'] = True
        
    # Overbought / Oversold
    if latest['RSI'] > 70:
        signals['Overbought'] = True
    elif latest['RSI'] < 30:
        signals['Oversold'] = True
        
    # Trend
    if latest['Close'] > latest['MA20'] and latest['MA20'] > latest['MA50']:
        signals['Trend'] = 'Bullish'
    elif latest['Close'] < latest['MA20'] and latest['MA20'] < latest['MA50']:
        signals['Trend'] = 'Bearish'
        
    return signals

def make_decision(signals):
    """
    4. Make human-readable trading decision based on signals.
    """
    decision = "WATCH"
    reasons = []
    score = 50 # Base score out of 100
    
    trend = signals['Trend']
    breakout = signals['Breakout']
    vol_spike = signals['Volume_Spike']
    overbought = signals['Overbought']
    oversold = signals['Oversold']
    
    # Rules Processing
    if trend == 'Bullish':
        reasons.append("Price above key moving averages (bullish trend)")
        score += 20
        if breakout and vol_spike:
            decision = "BUY"
            reasons.append("Strong breakout supported by high volume")
            score += 20
        elif not breakout:
            decision = "HOLD"
            reasons.append("Strong uptrend continuation without breakout")
            score += 10
        else: # breakout without volume spike
            decision = "HOLD"
            reasons.append("Breakout observed, but lacks volume confirmation")
            score += 15
    elif trend == 'Bearish':
        reasons.append("Price below key moving averages (bearish trend)")
        decision = "REDUCE"
        score -= 20
    else:
        reasons.append("Neutral trend configuration")
        decision = "WATCH"

    # RSI Adjustments
    if overbought:
        reasons.append("RSI > 70 implies overbought conditions, exercise caution / partial book")
        if decision == "BUY":
            decision = "HOLD"
        score -= 15
    
    if oversold:
        decision = "WATCH"
        reasons.append("RSI < 30 implies oversold conditions, watch for potential reversal")
        score += 15
        
    if vol_spike and not breakout and trend != "Bullish":
        reasons.append("Volume spike observed in neutral/bearish zone")
        score += 5
        
    # Boundary limiting for score
    score = max(0, min(100, int(score)))
    
    return decision, reasons, score

def format_output(symbol, signals, decision, reasons, score):
    """
    5. Output Format
    """
    clean_symbol = symbol.replace('.NS', '')
    output_lines = []
    output_lines.append(f"---")
    output_lines.append(f"{clean_symbol} (₹{signals['Price']:.2f})")
    output_lines.append(f"Trend: {signals['Trend']}")
    
    active_signals = []
    if signals['Breakout']: active_signals.append("Breakout")
    if signals['Volume_Spike']: active_signals.append("High Volume")
    if signals['Overbought']: active_signals.append("Overbought")
    if list(filter(None, [signals['Oversold']])): active_signals.append("Oversold")
    if not active_signals: active_signals.append("None")
    
    output_lines.append(f"Signals: {', '.join(active_signals)}")
    output_lines.append("")
    output_lines.append(f"Decision: {decision} (Confidence: {score}/100)")
    output_lines.append(f"Reason:")
    for reason in reasons:
        output_lines.append(f" * {reason}")
    output_lines.append(f"---")
    
    return "\n".join(output_lines)

def run_market_intelligence(stocks):
    results = {}
    print("========================================")
    print("Market Intelligence Engine")
    print("========================================\n")
    
    for symbol in stocks:
        # 1. Fetch data
        df = fetch_data(symbol, period="100d")
        
        # 2. Calculate indicators
        df_indicators = calculate_indicators(df)
        
        # 3. Generate signals
        signals = generate_signals(df_indicators)
        
        # 4. Decision Engine
        decision, reasons, score = make_decision(signals)
        
        # Store for ranking
        results[symbol] = {
            'signals': signals,
            'decision': decision,
            'reasons': reasons,
            'score': score
        }
        
        # 5. Output
        print(format_output(symbol, signals, decision, reasons, score))
        print("\n")
        
    # Final Summary
    print("Top Opportunities Today:")
    
    # Sort stocks by confidence score descending
    ranked_stocks = sorted(results.items(), key=lambda x: x[1]['score'], reverse=True)
    
    for symbol, data in ranked_stocks:
        clean_symbol = symbol.replace('.NS', '')
        # Generate short summary text
        if data['decision'] == "BUY":
            summary = "Strong trend continuation & breakout"
        elif data['decision'] == "HOLD":
            summary = "Steady performance with potential for upside"
        elif data['decision'] == "WATCH":
            summary = "Potential reversal watch or consolidation"
        else:
            summary = "Weakness observed, consider reducing exposure"
            
        print(f"* {clean_symbol} (Score: {data['score']}) -> {summary}")

if __name__ == "__main__":
    target_stocks = ["SBIN.NS", "BEL.NS", "TATAPOWER.NS"]
    run_market_intelligence(target_stocks)
