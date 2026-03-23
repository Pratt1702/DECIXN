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

    # --- PATTERN RECOGNITION (AI HEURISTICS) ---
    pattern = "None Detected"
    if breakout_strength > 0 and volume_ratio > 1.1:
        pattern = "High-Conviction Breakout"
    elif latest['Dist_MA20'] < -5 and latest['RSI'] < 30:
        pattern = "Mean Reversion (Oversold)"
    elif latest['MA20_Slope'] > 0.3 and latest['Dist_MA20'] < 1:
        pattern = "Bullish Pullback (Entry Zone)"
    elif latest['Dist_MA20'] > 8 and latest['RSI'] > 75:
        pattern = "Overextended (Risk Zone)"
    elif macd_turning_bullish and trend_strength > -0.02:
        pattern = "Momentum Reversal"

    # --- WATCH CONDITIONS ---
    watch_price = latest['MA20']
    watch_type = "Baseline support (MA20)"
    if latest['Close'] > latest['MA20']:
        watch_price = latest['MA20']
        watch_type = "Solid cushion (MA20)"
    if breakout_strength > -0.02 and breakout_strength < 0:
        watch_price = latest['High20']
        watch_type = "Major hurdle (Resistance)"
    elif latest['RSI'] < 35:
        watch_price = latest['MA20']
        watch_type = "Trend reclaim level (MA20)"

    # --- SIGNAL DETERMINATION ---
    signal = "Hold"
    if pattern != "None Detected":
        if "Breakout" in pattern or "Momentum" in pattern or "Bullish" in pattern or "Oversold" in pattern:
            signal = "Buy"
        elif "Overextended" in pattern:
            signal = "Sell"
    elif latest['RSI'] < 25:
        signal = "Buy"
    elif latest['RSI'] > 75:
        signal = "Sell"

    signals = {
        'Price': latest['Close'],
        'RSI': latest['RSI'],
        'Prev_RSI': prev['RSI'],
        'Signal': signal,
        'Pattern': pattern,
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
        'Pattern': pattern,
        'Watch_Price': watch_price,
        'Watch_Type': watch_type,
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
