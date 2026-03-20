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

def calculate_indicators(df):
    """
    2. Calculate RSI, MAs, and Volume average.
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
    
    # Calculate MACD (12, 26, 9)
    ema12 = df['Close'].ewm(span=12, adjust=False).mean()
    ema26 = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = ema12 - ema26
    df['MACD_Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
    df['MACD_Histogram'] = df['MACD'] - df['MACD_Signal']
    
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
        'MA50': latest['MA50'],
        'MACD': {
            'MACD_Line': latest['MACD'],
            'Signal_Line': latest['MACD_Signal'],
            'Histogram': latest['MACD_Histogram']
        }
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

def make_holding_decision(signals, avg_cost, pnl):
    """
    Produce a professional portfolio decision based on current holding status (P&L) vs Market Trend.
    """
    decision = "HOLD"
    reasons = []
    
    trend = signals['Trend']
    overbought = signals['Overbought']
    oversold = signals['Oversold']
    breakout = signals['Breakout']
    
    is_profit = pnl > 0
    
    if is_profit:
        if trend == 'Bullish':
            decision = "RIDE TREND (HOLD)"
            reasons.append("Stock is in an uptrend and you are in profit. Let winners run.")
            if breakout:
                reasons.append("Breakout confirmed. Momentum is accelerating.")
        elif trend == 'Bearish':
            decision = "BOOK PROFITS"
            reasons.append("Trend has reversed downward. Lock in your gains.")
        else: # Neutral
            decision = "HOLD / TRAILING STOP"
            reasons.append("Trend is neutral but you are in profit. Watch closely and consider a trailing stoploss.")
            
        if overbought and "BOOK PROFITS" not in decision:
            decision = "PARTIAL BOOK PROFITS"
            reasons.append("Warning: RSI > 70 implies overbought conditions. Consider taking partial profits soon.")
            
    else: # Loss
        if trend == 'Bullish':
            decision = "AVERAGE DOWN / HOLD"
            reasons.append("Stock is regaining bullish momentum. Good opportunity to hold or lower your average cost.")
        elif trend == 'Bearish':
            decision = "CUT LOSSES / REDUCE"
            reasons.append("Stock is in a defined downtrend and extending losses. Capital preservation is priority.")
        else: # Neutral
            decision = "HOLD / WATCH"
            reasons.append("Trend is neutral while you are at a loss. Wait for a clear breakout before averaging down.")
            
        if oversold and "CUT LOSSES" not in decision:
            reasons.append("RSI < 30 implies deep oversold territory. A near-term bounce is possible.")
            
    return decision, reasons

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

def analyze_single_ticker(symbol: str) -> dict:
    """
    Analyzes a single ticker and returns a deep, nested dictionary of all intelligence data.
    Suitable for API responses.
    """
    def get_multi_period_charts(sym_code):
        charts = {}
        try:
            t = yf.Ticker(sym_code)
            
            # Fetch 5y data daily
            df_5y = t.history(period="5y", interval="1d")
            if not df_5y.empty:
                def make_chart(df_sliced):
                    return [{"date": d.strftime("%Y-%m-%d"), "price": float(p)} for d, p in zip(df_sliced.index, df_sliced['Close'])]
                
                charts['5Y'] = make_chart(df_5y)
                charts['All'] = charts['5Y']
                
                three_years_ago = datetime.now() - timedelta(days=3*365)
                charts['3Y'] = make_chart(df_5y[df_5y.index >= pd.Timestamp(three_years_ago, tz=df_5y.index.tz)])
                
                one_year_ago = datetime.now() - timedelta(days=365)
                charts['1Y'] = make_chart(df_5y[df_5y.index >= pd.Timestamp(one_year_ago, tz=df_5y.index.tz)])
                
                six_months_ago = datetime.now() - timedelta(days=180)
                charts['6M'] = make_chart(df_5y[df_5y.index >= pd.Timestamp(six_months_ago, tz=df_5y.index.tz)])
                
                three_months_ago = datetime.now() - timedelta(days=90)
                charts['3M'] = make_chart(df_5y[df_5y.index >= pd.Timestamp(three_months_ago, tz=df_5y.index.tz)])
                
                one_month_ago = datetime.now() - timedelta(days=30)
                charts['1M'] = make_chart(df_5y[df_5y.index >= pd.Timestamp(one_month_ago, tz=df_5y.index.tz)])
            else:
                charts.update({'1M':[], '3M':[], '6M':[], '1Y':[], '3Y':[], '5Y':[], 'All':[]})
                
            # Fetch 1wk 1h data
            df_1wk = t.history(period="5d", interval="1h")
            if not df_1wk.empty:
                charts['1W'] = [{"date": d.strftime("%b %d %H:%M"), "price": float(p)} for d, p in zip(df_1wk.index, df_1wk['Close'])]
            else:
                charts['1W'] = []
                
            # Fetch 1d 5m data
            df_1d = t.history(period="1d", interval="5m")
            if not df_1d.empty:
                charts['1D'] = [{"date": d.strftime("%H:%M:%S"), "price": float(p)} for d, p in zip(df_1d.index, df_1d['Close'])]
            else:
                charts['1D'] = []
                
        except Exception as e:
            print(f"Error fetching charts for {sym_code}: {e}")
        return charts

    symbol = symbol.upper().replace(' ', '')
    if not symbol.endswith('.NS') and not symbol.endswith('.BO'):
        symbol += '.NS'
    symbol = symbol.upper()
        
    try:
        df = fetch_data(symbol, period="1y")
        df_indicators = calculate_indicators(df)
        signals = generate_signals(df_indicators)
        decision, reasons, score = make_decision(signals)
        
        # Helper to convert numpy numbers to native Python types for JSON serialization
        def convert_numpy(obj):
            if isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, bool) or isinstance(obj, np.bool_):
                return bool(obj)
            return obj

        clean_macd = {k: convert_numpy(v) for k, v in signals['MACD'].items()}
        
        chart_data = [{"date": d.strftime("%Y-%m-%d"), "price": convert_numpy(p)} for d, p in zip(df.index, df['Close'])]
        
        try:
            info = yf.Ticker(symbol).info
        except:
            info = {}
            
        company_name = info.get("longName", info.get("shortName", symbol.replace('.NS', '').replace('.BO', '')))
            
        dy = info.get("dividendYield")
        fundamentals = {
            "market_cap": convert_numpy(info.get("marketCap", 0) or 0),
            "pe_ratio": convert_numpy(info.get("trailingPE", 0) or 0),
            "industry_pe": convert_numpy(info.get("industryPE", 0) or 0),
            "dividend_yield": convert_numpy((dy * 100) if dy is not None else 0),
            "beta": convert_numpy(info.get("beta", 0.98) or 0.98)
        }
        
        last_c = df.iloc[-2] if len(df) > 1 else df.iloc[-1]
        H, L, C = last_c['High'], last_c['Low'], last_c['Close']
        P = (H + L + C) / 3
        
        pivots = {
            "R3": convert_numpy(H + 2*(P - L)),
            "R2": convert_numpy(P + (H - L)),
            "R1": convert_numpy(2*P - L),
            "Pivot": convert_numpy(P),
            "S1": convert_numpy(2*P - H),
            "S2": convert_numpy(P - (H - L)),
            "S3": convert_numpy(L - 2*(H - P))
        }
        
        latest_df = df_indicators.iloc[-1]
        moving_averages = {
            "sma_10d": convert_numpy(latest_df['SMA10']),
            "sma_20d": convert_numpy(latest_df['SMA20']),
            "sma_50d": convert_numpy(latest_df['SMA50']),
            "sma_100d": convert_numpy(latest_df['SMA100']),
            "sma_200d": convert_numpy(latest_df['SMA200']),
            "ema_10d": convert_numpy(latest_df['EMA10']),
            "ema_20d": convert_numpy(latest_df['EMA20']),
            "ema_50d": convert_numpy(latest_df['EMA50']),
            "ema_100d": convert_numpy(latest_df['EMA100']),
            "ema_200d": convert_numpy(latest_df['EMA200'])
        }
        
        return {
            "symbol": symbol.replace('.NS', '').replace('.BO', ''),
            "success": True,
            "data": {
                "companyName": company_name,
                "price": convert_numpy(signals['Price']),
                "trend": signals['Trend'],
                "decision": decision,
                "confidence_score": score,
                "reasons": reasons,
                "chart_data": chart_data,
                "charts": get_multi_period_charts(symbol),
                "fundamentals": fundamentals,
                "pivots": pivots,
                "moving_averages": moving_averages,
                "signals": {
                    "breakout": convert_numpy(signals['Breakout']),
                    "volume_spike": convert_numpy(signals['Volume_Spike']),
                    "overbought": convert_numpy(signals['Overbought']),
                    "oversold": convert_numpy(signals['Oversold'])
                },
                "indicators": {
                    "rsi_14": convert_numpy(signals['RSI']),
                    "ma_20": convert_numpy(signals['MA20']),
                    "ma_50": convert_numpy(signals['MA50']),
                    "macd": clean_macd
                }
            }
        }
    except Exception as e:
        return {
            "symbol": symbol,
            "success": False,
            "error": str(e)
        }

def analyze_single_holding(symbol: str, avg_cost: float, qty: float, pnl: float) -> dict:
    """
    Analyzes a holding, applying advanced P&L-adjusted decision logic.
    """
    symbol = symbol.upper().replace(' ', '')
    if not symbol.endswith('.NS') and not symbol.endswith('.BO'):
        symbol += '.NS'
    symbol = symbol.upper()
        
    try:
        df = fetch_data(symbol, period="100d")
        df_indicators = calculate_indicators(df)
        signals = generate_signals(df_indicators)
        decision, reasons = make_holding_decision(signals, avg_cost, pnl)
        
        total_invested = avg_cost * qty
        current_value = signals['Price'] * qty
        pnl_pct = (pnl / total_invested * 100) if total_invested > 0 else 0.0
        
        def get_urgency_and_risk(dec, trend):
            urgency = "LOW"
            risk = "LOW"
            if "CUT LOSSES" in dec or "BOOK PROFITS" in dec:
                urgency = "HIGH"
                risk = "HIGH" if "CUT LOSSES" in dec else "LOW"
            elif "AVERAGE DOWN" in dec or "TRAILING STOP" in dec or "REDUCE" in dec:
                urgency = "MEDIUM"
                risk = "MEDIUM"
            if trend == 'Bearish' and pnl < 0:
                risk = "HIGH"
            return urgency, risk
            
        urgency_score, risk_tag = get_urgency_and_risk(decision, signals['Trend'])
        
        def convert_numpy(obj):
            if isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, bool) or isinstance(obj, np.bool_):
                return bool(obj)
            return obj

        return {
            "symbol": symbol.replace('.NS', '').replace('.BO', ''),
            "success": True,
            "holding_context": {
                "avg_cost": avg_cost,
                "quantity": qty,
                "invested_value": convert_numpy(total_invested),
                "current_value": convert_numpy(current_value),
                "current_pnl": pnl,
                "pnl_pct": convert_numpy(pnl_pct)
            },
            "data": {
                "companyName": info.get("longName", info.get("shortName", symbol.replace('.NS', '').replace('.BO', ''))) if 'info' in locals() else symbol.replace('.NS', ''),
                "price": convert_numpy(signals['Price']),
                "trend": signals['Trend'],
                "portfolio_decision": decision,
                "urgency_score": urgency_score,
                "risk_tag": risk_tag,
                "reasons": reasons,
                "signals": {
                    "breakout": convert_numpy(signals['Breakout']),
                    "volume_spike": convert_numpy(signals['Volume_Spike']),
                    "overbought": convert_numpy(signals['Overbought']),
                    "oversold": convert_numpy(signals['Oversold'])
                }
            }
        }
    except Exception as e:
        return {
            "symbol": symbol,
            "success": False,
            "error": str(e)
        }

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
    print("Welcome to the Market Intelligence Engine")
    print("Enter NSE stock tickers separated by commas (e.g., SBIN.NS, BEL.NS, TATAPOWER.NS)")
    print("Or press Enter to use the default list.")
    user_input = input("Tickers: ").strip()
    
    if user_input:
        target_stocks = [ticker.strip().upper() for ticker in user_input.split(',') if ticker.strip()]
    else:
        target_stocks = ["SBIN.NS", "BEL.NS", "TATAPOWER.NS"]
        print(f"No input provided. Using defaults: {', '.join(target_stocks)}")
        
    if target_stocks:
        run_market_intelligence(target_stocks)
    else:
        print("No valid tickers provided. Exiting.")
