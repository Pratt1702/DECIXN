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


def generate_signals(df):
    """
    3. Generate trading signals with scores and ratios instead of just booleans.
    """
    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest

    # Basic binary signals (for legacy support if needed)
    macd_hist_now = latest['MACD_Histogram']
    macd_hist_prev = prev['MACD_Histogram']
    macd_turning_bullish = (macd_hist_prev < 0 and macd_hist_now > 0)
    macd_turning_bearish = (macd_hist_prev > 0 and macd_hist_now < 0)
    macd_accelerating_bearish = (macd_hist_now < macd_hist_prev < 0)

    # Probabilistic Scores / Ratios
    breakout_strength = (latest['Close'] - latest['High20']) / latest['High20'] if latest['High20'] > 0 else 0
    volume_ratio = latest['Volume'] / latest['Vol20'] if latest['Vol20'] > 0 else 1.0
    trend_strength = (latest['MA20'] - latest['MA50']) / latest['MA50'] if latest['MA50'] > 0 else 0
    
    # Volatility Check (High ATR relative to price indicates high volatility)
    volatility_ratio = latest['ATR'] / latest['Close'] if latest['Close'] > 0 else 0

    # Gap detection
    gap_pct = (latest['Open'] - prev['Close']) / prev['Close'] * 100 if len(df) > 1 else 0

    # RSI Divergence detection (Simple version: Price higher but RSI lower or vice versa)
    # Checking over the last 15 days for peaks
    recent_df = df.iloc[-15:]
    price_uptrend = recent_df['Close'].iloc[-1] > recent_df['Close'].iloc[0]
    rsi_uptrend = recent_df['RSI'].iloc[-1] > recent_df['RSI'].iloc[0]
    
    rsi_divergence = False
    if price_uptrend and not rsi_uptrend and latest['RSI'] > 60:
        rsi_divergence = True # Bearish divergence
    elif not price_uptrend and rsi_uptrend and latest['RSI'] < 40:
        rsi_divergence = True # Bullish divergence

    signals = {
        'Price': latest['Close'],
        'RSI': latest['RSI'],
        'Breakout': breakout_strength > 0,
        'Breakout_Strength': breakout_strength,
        'Volume_Spike': volume_ratio > 2.0,
        'Volume_Ratio': volume_ratio,
        'Overbought': latest['RSI'] > 70,
        'Oversold': latest['RSI'] < 30,
        'Trend': 'Neutral',
        'Trend_Days': 1,
        'Trend_Strength': trend_strength,
        'MA20_Slope': latest['MA20_Slope'],
        'MA50_Slope': latest['MA50_Slope'],
        'Dist_MA20': latest['Dist_MA20'],
        'Dist_MA50': latest['Dist_MA50'],
        'ATR': latest['ATR'],
        'Volatility_Ratio': volatility_ratio,
        'Gap_Pct': gap_pct,
        'RSI_Divergence': rsi_divergence,
        'MA20': latest['MA20'],
        'MA50': latest['MA50'],
        'MACD_Turning_Bullish': macd_turning_bullish,
        'MACD_Turning_Bearish': macd_turning_bearish,
        'MACD_Accelerating_Bearish': macd_accelerating_bearish,
        'MACD': {
            'MACD_Line': latest['MACD'],
            'Signal_Line': latest['MACD_Signal'],
            'Histogram': latest['MACD_Histogram']
        }
    }

    # Trend Determination
    if latest['Close'] > latest['MA20'] and latest['MA20'] > latest['MA50']:
        signals['Trend'] = 'Bullish'
    elif latest['Close'] < latest['MA20'] and latest['MA20'] < latest['MA50']:
        signals['Trend'] = 'Bearish'

    # Consecutive Trend Days
    if signals['Trend'] != 'Neutral':
        count = 1
        current_trend = signals['Trend']
        for i in range(2, min(len(df), 30)):
            day = df.iloc[-i]
            day_trend = 'Neutral'
            if day['Close'] > day['MA20'] and day['MA20'] > day['MA50']:
                day_trend = 'Bullish'
            elif day['Close'] < day['MA20'] and day['MA20'] < day['MA50']:
                day_trend = 'Bearish'
            
            if day_trend == current_trend:
                count += 1
            else:
                break
        signals['Trend_Days'] = count

    return signals


def make_decision(signals):
    """
    4. Advanced scoring engine with confluence logic and action layer.
    """
    reasons = []
    confluence_score = 0
    
    # 1. Breakout Strength (High weight)
    if signals.get('Breakout_Strength', 0) > 0:
        points = min(25, int(signals['Breakout_Strength'] * 1000)) # e.g. 2% breakout = 20 points
        confluence_score += points
        reasons.append(f"Confirmed Breakout above 20-day high ({signals['Breakout_Strength']*100:.1f}%)")
    
    # 2. Volume Confirmation
    v_ratio = signals.get('Volume_Ratio', 1.0)
    if v_ratio > 1.2:
        points = min(20, int((v_ratio - 1) * 10))
        confluence_score += points
        reasons.append(f"Volume is {v_ratio:.1f}x higher than average")
    elif v_ratio < 0.7:
        confluence_score -= 10
        reasons.append(f"Caution: Low trading volume ({v_ratio:.1f}x)")

    # 3. RSI Context
    rsi = signals['RSI']
    if 40 < rsi < 65:
        confluence_score += 10
        reasons.append(f"RSI in healthy bullish zone ({rsi:.1f})")
    elif rsi > 75:
        confluence_score -= 15
        reasons.append(f"Overbought conditions detected (RSI: {rsi:.1f})")
    elif rsi < 30:
        confluence_score += 5 # value buy potential
        reasons.append(f"Oversold conditions (RSI: {rsi:.1f}) — potential reversal")

    # 4. Trend & Momentum (MA Slopes)
    if signals['Trend'] == 'Bullish':
        confluence_score += 15
        if signals.get('MA20_Slope', 0) > 0.5:
            confluence_score += 10
            reasons.append("Short-term momentum (MA20) is sloping UP")
        if signals.get('MA50_Slope', 0) > 0.2:
            confluence_score += 5
            reasons.append("Long-term trend (MA50) is confirmed UP")
    elif signals['Trend'] == 'Bearish':
        confluence_score -= 20
        reasons.append("Stock is in a Bearish trend (Price < MA20 < MA50)")
    
    # 5. Gap detection
    gap = signals.get('Gap_Pct', 0)
    if gap > 1.5:
        confluence_score += 10
        reasons.append(f"Significant Gap Up ({gap:.1f}%) detected at open")
    elif gap < -1.5:
        confluence_score -= 15
        reasons.append(f"Gap Down ({gap:.1f}%) signals opening weakness")

    # 6. Divergence
    if signals.get('RSI_Divergence', False):
        confluence_score += 15 if rsi < 50 else -15
        reasons.append("RSI Divergence detected — potential trend shift imminent")

    # Final Decision Mapping
    # 0-30: Sell/Avoid, 30-50: Watch, 50-70: Hold, 70-100: Buy/Strong Buy
    score = max(0, min(100, 40 + confluence_score)) # Base 40
    
    decision = "WATCH"
    action = "Wait for clearer price action"
    
    if score >= 80:
        decision = "STRONG BUY"
        action = "Initiate long position with high conviction"
    elif score >= 65:
        decision = "BUY"
        action = "Look for entry on minor pullbacks"
    elif score >= 45:
        decision = "HOLD"
        action = "Maintain current position; monitor trend strength"
    elif score < 30:
        decision = "REDUCE"
        action = "Trim exposure or exit position"
    
    return decision, reasons, score, action


def make_holding_decision(signals, avg_cost, pnl, fifty_two_week_low=None, fifty_two_week_high=None, benchmark_comparison=None):
    """
    Produce a professional portfolio decision based on current holding status (P&L) vs Market Trend.
    """
    decision = "HOLD"
    reasons = []

    trend = signals['Trend']
    trend_days = signals.get('Trend_Days', 1)
    overbought = signals['Overbought']
    oversold = signals['Oversold']
    breakout = signals['Breakout']
    price = signals['Price']
    macd_turning_bullish = signals.get('MACD_Turning_Bullish', False)
    macd_turning_bearish = signals.get('MACD_Turning_Bearish', False)
    macd_accel_bearish = signals.get('MACD_Accelerating_Bearish', False)

    is_profit = pnl > 0

    # 52-week proximity context
    near_52w_low = fifty_two_week_low and price <= fifty_two_week_low * 1.08
    near_52w_high = fifty_two_week_high and price >= fifty_two_week_high * 0.95

    if is_profit:
        if trend == 'Bullish':
            decision = "RIDE TREND (HOLD)"
            reasons.append(f"Stock is in an uptrend ({trend_days} days) and you are in profit. Let winners run.")
            if breakout:
                reasons.append("Breakout confirmed — momentum is accelerating.")
            if macd_turning_bullish:
                reasons.append("MACD histogram just turned bullish — fresh momentum.")
            if near_52w_high:
                reasons.append("Caution: near 52-week high — use a trailing stop.")
        elif trend == 'Bearish':
            decision = "BOOK PROFITS"
            reasons.append(f"Trend has reversed downward ({trend_days} days). Lock in your gains.")
            if macd_accel_bearish:
                reasons.append("MACD momentum is deepening downward. Exit promptly.")
        else:
            decision = "HOLD / TRAILING STOP"
            reasons.append("Trend is neutral. Consider a trailing stop-loss to protect gains.")

        if overbought and "BOOK PROFITS" not in decision:
            decision = "PARTIAL BOOK PROFITS"
            reasons.append("RSI > 70: overbought conditions — consider taking partial profits.")

    else:  # Loss
        if trend == 'Bullish':
            decision = "AVERAGE DOWN / HOLD"
            reasons.append(f"Stock is regaining bullish momentum ({trend_days} days). Potential reversal forming.")
            if macd_turning_bullish:
                reasons.append("MACD bullish crossover supports averaging down here.")
            if near_52w_low:
                reasons.append("Price is near 52-week low — strong historical support.")
        elif trend == 'Bearish':
            decision = "CUT LOSSES / REDUCE"
            reasons.append(f"Stock is in a defined downtrend ({trend_days} days). Capital preservation is priority.")
            if macd_accel_bearish:
                reasons.append("Bearish momentum is accelerating. High urgency to exit.")
            if near_52w_low:
                reasons.append("Price is at 52-week low — no technical floor. Do not average down.")
        else:
            decision = "HOLD / WATCH"
            reasons.append("Trend is neutral while at a loss. Wait for a clear breakout.")

    if benchmark_comparison and benchmark_comparison.get('status') == 'UNDERPERFORMING':
        reasons.append(f"Underperforming Nifty 50 by {abs(benchmark_comparison['relative_strength'])}% lately.")

    if macd_turning_bearish and is_profit and "BOOK" not in decision:
        reasons.append("MACD just crossed bearish — monitor for exit.")

    # Volatility Check
    if signals.get('Volatility_Ratio', 0) > 0.04: # High relative ATR
        reasons.append("Caution: High volatility detected. Expect wider price swings.")

    action = "Monitor price action at recent support/resistance levels."
    if "BOOK" in decision:
        action = "Sell current position to realize gains."
    elif "CUT LOSSES" in decision or "REDUCE" in decision:
        action = "Sell to preserve remaining capital."
    elif "AVERAGE" in decision:
        action = "Buy additional shares at current levels to lower cost basis."
    elif "RIDE" in decision:
        action = "Hold position and trail stop-loss 5% below current price."

    return decision, reasons, action


def format_output(symbol, signals, decision, reasons, score, action):
    """
    5. Output Format
    """
    clean_symbol = symbol.replace('.NS', '')
    output_lines = []
    output_lines.append(f"---")
    output_lines.append(f"{clean_symbol} (₹{signals['Price']:.2f})")
    output_lines.append(f"Trend: {signals['Trend']}")
    
    output_lines.append(f"Decision: {decision} (Confidence: {score}/100)")
    output_lines.append(f"Action: {action}")
    output_lines.append(f"Reasoning:")
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
        decision, reasons, score, action = make_decision(signals)
        
        # 2.2 - Benchmark Comparison
        benchmark_comparison = get_benchmark_comparison(df)
        
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
            "beta": convert_numpy(info.get("beta", 0.98) or 0.98),
            "52w_low": convert_numpy(info.get("fiftyTwoWeekLow") or 0),
            "52w_high": convert_numpy(info.get("fiftyTwoWeekHigh") or 0),
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
                "action": action,
                "reasons": reasons,
                "chart_data": chart_data,
                "charts": get_multi_period_charts(symbol),
                "fundamentals": fundamentals,
                "pivots": pivots,
                "moving_averages": moving_averages,
                "benchmark_comparison": benchmark_comparison,
                "signals": {
                    "breakout": convert_numpy(signals['Breakout']),
                    "breakout_strength": convert_numpy(signals.get('Breakout_Strength', 0)),
                    "volume_spike": convert_numpy(signals['Volume_Spike']),
                    "volume_ratio": convert_numpy(signals.get('Volume_Ratio', 1.0)),
                    "volatility_ratio": convert_numpy(signals.get('Volatility_Ratio', 0)),
                    "overbought": convert_numpy(signals['Overbought']),
                    "oversold": convert_numpy(signals['Oversold']),
                    "macd_turning_bullish": convert_numpy(signals['MACD_Turning_Bullish']),
                    "macd_turning_bearish": convert_numpy(signals['MACD_Turning_Bearish']),
                    "trend_days": convert_numpy(signals['Trend_Days']),
                    "trend_strength": convert_numpy(signals.get('Trend_Strength', 0)),
                    "rsi_divergence": convert_numpy(signals.get('RSI_Divergence', False))
                },
                "indicators": {
                    "rsi_14": convert_numpy(signals['RSI']),
                    "ma_20": convert_numpy(signals['MA20']),
                    "ma_50": convert_numpy(signals['MA50']),
                    "atr": convert_numpy(signals.get('ATR', 0)),
                    "ma20_slope": convert_numpy(signals.get('MA20_Slope', 0)),
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
    Analyzes a holding with P&L-adjusted decisions.
    Phase 1 upgrades:
    - P&L always recalculated from live price (not CSV input)
    - 52-week high/low fetched and used in decisions
    - MACD momentum direction used in decision reasons
    """
    symbol = symbol.upper().replace(' ', '')
    if not symbol.endswith('.NS') and not symbol.endswith('.BO'):
        symbol += '.NS'
    symbol = symbol.upper()

    def convert_numpy(obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, (bool, np.bool_)):
            return bool(obj)
        return obj

    try:
        df = fetch_data(symbol, period="100d")
        df_indicators = calculate_indicators(df)
        signals = generate_signals(df_indicators)

        # --- 1.1 P&L CONSISTENCY FIX ---
        # Always compute from live price. Ignore user-supplied pnl for decision logic.
        total_invested = avg_cost * qty
        current_value = signals['Price'] * qty          # live price from Yahoo Finance
        live_pnl = current_value - total_invested       # authoritative P&L
        pnl_pct = (live_pnl / total_invested * 100) if total_invested > 0 else 0.0

        # --- 1.2 52-WEEK CONTEXT ---
        fifty_two_week_low = None
        fifty_two_week_high = None
        company_name = symbol.replace('.NS', '').replace('.BO', '')
        try:
            info = yf.Ticker(symbol).info
            fifty_two_week_low = info.get('fiftyTwoWeekLow')
            fifty_two_week_high = info.get('fiftyTwoWeekHigh')
            company_name = info.get('longName', info.get('shortName', company_name))
        except Exception:
            pass

        # --- 2.2 BENCHMARK COMPARISON ---
        benchmark_comparison = get_benchmark_comparison(df)

        # --- 1.3 MACD IN DECISIONS ---
        # make_holding_decision now receives 52w range and MACD signals are in signals dict
        decision, reasons, action = make_holding_decision(
            signals, avg_cost, live_pnl,
            fifty_two_week_low=fifty_two_week_low,
            fifty_two_week_high=fifty_two_week_high,
            benchmark_comparison=benchmark_comparison
        )

        def get_urgency_and_risk(dec, trend, pnl_val):
            urgency = "LOW"
            risk = "LOW"
            if "CUT LOSSES" in dec or "BOOK PROFITS" in dec:
                urgency = "HIGH"
                risk = "HIGH" if "CUT LOSSES" in dec else "LOW"
            elif "AVERAGE DOWN" in dec or "TRAILING STOP" in dec or "REDUCE" in dec:
                urgency = "MEDIUM"
                risk = "MEDIUM"
            if trend == 'Bearish' and pnl_val < 0:
                risk = "HIGH"
            return urgency, risk

        urgency_score, risk_tag = get_urgency_and_risk(decision, signals['Trend'], live_pnl)

        return {
            "symbol": symbol.replace('.NS', '').replace('.BO', ''),
            "success": True,
            "holding_context": {
                "avg_cost": avg_cost,
                "quantity": qty,
                "invested_value": convert_numpy(total_invested),
                "current_value": convert_numpy(current_value),
                "current_pnl": convert_numpy(live_pnl),
                "pnl_pct": convert_numpy(pnl_pct),
                "52w_low": convert_numpy(fifty_two_week_low) if fifty_two_week_low else None,
                "52w_high": convert_numpy(fifty_two_week_high) if fifty_two_week_high else None,
            },
            "data": {
                "companyName": company_name,
                "price": convert_numpy(signals['Price']),
                "trend": signals['Trend'],
                "portfolio_decision": decision,
                "portfolio_action": action,
                "urgency_score": urgency_score,
                "risk_tag": risk_tag,
                "reasons": reasons,
                "benchmark_comparison": benchmark_comparison,
                "signals": {
                    "breakout": convert_numpy(signals['Breakout']),
                    "breakout_strength": convert_numpy(signals.get('Breakout_Strength', 0)),
                    "volume_spike": convert_numpy(signals['Volume_Spike']),
                    "volume_ratio": convert_numpy(signals.get('Volume_Ratio', 1.0)),
                    "volatility_ratio": convert_numpy(signals.get('Volatility_Ratio', 0)),
                    "overbought": convert_numpy(signals['Overbought']),
                    "oversold": convert_numpy(signals['Oversold']),
                    "macd_turning_bullish": convert_numpy(signals['MACD_Turning_Bullish']),
                    "macd_turning_bearish": convert_numpy(signals['MACD_Turning_Bearish']),
                    "trend_days": convert_numpy(signals['Trend_Days']),
                    "trend_strength": convert_numpy(signals.get('Trend_Strength', 0)),
                    "rsi_divergence": convert_numpy(signals.get('RSI_Divergence', False))
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
        decision, reasons, score, action = make_decision(signals)
        
        # Store for ranking
        results[symbol] = {
            'signals': signals,
            'decision': decision,
            'reasons': reasons,
            'score': score,
            'action': action
        }
        
        # 5. Output
        print(format_output(symbol, signals, decision, reasons, score, action))
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
