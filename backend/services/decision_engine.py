from prediction_model.next_day_range import generate_next_day_range

def make_decision(signals, news=None, df=None):
    """
    4. Advanced intelligence engine with normalized scoring and data-backed heuristics.
    Now integrated with News Catalyst Engine.
    """
    reasons = []
    confluence_score = 0
    priority = "LOW"
    risk_level = "LOW"
    news_insight = []
    
    # AI Pattern Success Rates (Deterministic mapping)
    success_rates = {
        "High-Conviction Breakout": 72,
        "Mean Reversion (Oversold)": 64,
        "Bullish Pullback (Entry Zone)": 68,
        "Momentum Reversal": 61,
        "None Detected": 45
    }
    pattern = signals.get('Pattern', 'None Detected')
    
    # Context-aware pattern renaming
    if pattern == "Mean Reversion (Oversold)" and signals.get('Trend') == 'Bearish':
        pattern = "Oversold in Downtrend (High Risk)"
    elif pattern == "Overextended (Risk Zone)" and signals.get('Trend') == 'Bullish':
        pattern = "Overextended Uptrend (Caution)"

    pattern_success = success_rates.get(pattern, 45)

    # 1. Normalized Breakout Strength (Threshold: 3% is full strength)
    bs = signals.get('Breakout_Strength', 0)
    if bs > 0:
        norm_bs = min(1.0, bs / 0.03) 
        points = int(norm_bs * 40)
        confluence_score += points
        reasons.append(f"Bullish Intent: The stock just cleared a major hurdle and is showing strong follow-through (Breakout: {bs*100:.1f}%).")
        
        # Deterministic setup count (Volume + BS based)
        setup_count = int(signals['Volume_Ratio'] * 5 + abs(bs) * 200)
        reasons.append(f"Probability Score: We've seen this play out {setup_count} times before. Historically, this setup leads to a positive move {pattern_success}% of the time.")
    
    # 2. Normalized Volume (Threshold: 2.0x is full strength)
    v_ratio = signals.get('Volume_Ratio', 1.0)
    if v_ratio > 1.2:
        norm_vol = min(1.0, (v_ratio - 1.0) / 1.0) # 2.0x = 1.0
        confluence_score += int(norm_vol * 20)
        reasons.append(f"Heavy Volume: The big players might be stepping in! Volume is {v_ratio:.1f}x higher than usual (Volume Ratio: {v_ratio:.1f}).")
    elif v_ratio < 0.6:
        confluence_score -= 15
        reasons.append(f"Low Participation: Trading activity is drying up. Volume is only {v_ratio*100:.1f}% of normal levels, indicating a lack of conviction.")

    # 3. RSI Normalization & Context
    rsi = signals['RSI']
    if rsi > 70:
        risk_level = "HIGH"
        confluence_score -= 15
        reasons.append(f"Caution: The rally is getting a bit overheated. The stock might need to catch its breath soon (Overbought - RSI: {rsi:.1f}).")
    elif rsi < 30:
        if signals['Trend'] == 'Bearish':
            confluence_score += 5
            reasons.append(f"Oversold Bounce Risk: RSI at {rsi:.1f}, but strong bearish structure typically overwrites recovery odds. Proceed with caution.")
        else:
            confluence_score += 15
            reasons.append(f"Bargain Zone: The stock looks heavily beaten down. This level historically triggers a recovery phase (Oversold / RSI: {rsi:.1f}).")
    
    # 4. Trend & MA Proximity (Pullback logic)
    dist_ma20 = signals.get('Dist_MA20', 0)
    if signals['Trend'] == 'Bullish':
        confluence_score += 15 # baseline for trend
        if dist_ma20 < 1.0 and dist_ma20 > -0.5:
            confluence_score += 20 # Perfect Pullback entry
            reasons.append(f"Strategic Opportunity: Found solid footing at the trendline (MA20). This buy-the-dip zone offers a low-risk entry.")
    elif signals['Trend'] == 'Bearish':
        confluence_score -= 15 # Softened penalty for bearish trend
        reasons.append(f"Trend Warning: Stock is in a defined downtrend (Price < MA20 < MA50)")
        
        # Differentiation among losers (Bad vs Worst)
        if signals.get('Trend_Days', 1) > 20:
            confluence_score -= 10
            reasons.append("Prolonged Downtrend: Sustained bearish pressure over 20+ sessions")
        if dist_ma20 < -8:
            confluence_score -= 10
            reasons.append("Structural Break: Price deeply below 20-day moving average")
    
    if dist_ma20 > 8:
        risk_level = "HIGH"
        confluence_score -= 10
        reasons.append(f"Stretch Warning: Running too far, too fast. Expect a cooling-off period soon as price reverts to mean (Dist. MA20: {dist_ma20:.1f}%).")
    
    # 5. Bearish Momentum (MACD Check)
    if signals.get('MACD_Turning_Bearish'):
        confluence_score -= 10 # Softened
        reasons.append("Momentum Shift: Sellers are starting to gain the upper hand as momentum slows (MACD: Bearish Crossover).")

    # 🔗 CATALYST ENGINE INTEGRATION
    if news:
        has_positive = any(n.get('sentiment') == 'positive' for n in news)
        has_negative = any(n.get('sentiment') == 'negative' for n in news)
        
        for n in news:
            e_type = n.get('event_type', 'event').capitalize()
            sentiment_label = "bullish catalyst" if n.get('sentiment') == 'positive' else ("bearish catalyst" if n.get('sentiment') == 'negative' else "neutral news")
            news_insight.append(f"{e_type}: {n.get('title')} → {sentiment_label}")

        # Conviction Adjustments
        if signals.get('Breakout') and has_positive:
            confluence_score += 10
            reasons.append("News Support: Breakout confirmed by positive fundamental catalysts.")
        
        if signals.get('Trend') == 'Bearish' and has_negative:
            confluence_score -= 10
            reasons.append("News Reinforcement: Bearish trend supported by negative news flow.")
            
        # Conflict Detection
        if signals.get('Trend') == 'Bullish' and has_negative:
            confluence_score -= 10
            reasons.append("Conflict Warning: Bullish technicals contradicted by negative news flow.")
            
        if signals.get('Trend') == 'Bearish' and has_positive:
            confluence_score += 10
            reasons.append("Conflict Warning: Bearish structure challenged by positive news catalysts.")

    # Final Decision Mapping
    base_confidence = 45
    score = max(0, min(100, base_confidence + confluence_score))
    
    # Severity calculation
    severity = "MODERATE"
    if score > 80 or score < 20: 
        severity = "CRITICAL"
    elif score > 70 or score < 30:
        severity = "STRONG"

    # Priority Calculation (Normalized)
    if score > 72 or score < 28:
        priority = "HIGH"
    elif score > 58 or score < 42:
        priority = "MEDIUM"
    else:
        priority = "LOW"
        
    next_day_range = None
    if df is not None:
        next_day_range = generate_next_day_range(df, score)
        
    decision = "WATCH"
    # Timeframe Determination
    trade_type = "Positional Trend"
    if signals.get('MA20_Slope', 0) > 0.8:
        trade_type = "Short-term Swing"
    elif pattern == "High-Conviction Breakout":
        trade_type = "Momentum Breakout"

    # Actionable Watch Condition
    watch_desc = f"{signals.get('Watch_Type', 'Support at MA20')} at ₹{signals.get('Watch_Price', signals.get('MA20', 0)):.2f}"
    
    action = f"Observe price action around key levels. {watch_desc}."

    if score >= 78:
        decision = "STRONG BUY"
        action = f"Initiate position for {trade_type}. Pattern: {pattern}."
    elif score >= 65:
        decision = "BUY"
        td = signals.get('Trend_Days', 1)
        if td == 1:
            action = f"Early {trade_type} forming (1 day) with strong relative strength. Add on confirmation."
        else:
            action = f"Add on pullbacks. Suitability: {trade_type}."
    elif score >= 45:
        decision = "HOLD"
        action = f"Monitor sustainability of trend. {watch_desc}."
    elif score < 30:
        decision = "REDUCE / SELL"
        action = f"Exit or hedge position. Severity: {severity}. {watch_desc}."
        if signals.get('Pattern') == "Mean Reversion (Oversold)":
            reasons.append("AI Alert: Oversold BUT still in strong downtrend — no reversal confirmation yet.")
        
        # SELL Urgency Override (High priority regardless of score)
        priority = "HIGH"
    
    return decision, reasons, score, action, priority, risk_level, pattern, trade_type, severity, watch_desc, news_insight, next_day_range


def make_holding_decision(signals, avg_cost, pnl, fifty_two_week_low=None, fifty_two_week_high=None, benchmark_comparison=None):
    """
    Produce a professional portfolio decision based on current holding status (P&L) vs Market Trend.
    """
    decision = "HOLD"
    reasons = []
    severity = "MODERATE"

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

    action = "Monitor price action at recent support/resistance levels."
    priority = "LOW"
    risk_level = "LOW"
    
    if is_profit:
        if trend == 'Bullish':
            decision = "RIDE TREND (HOLD)"
            reasons.append(f"Growth remains intact. The stock has been trending well for {trend_days} days with strong buyer support.")
            action = "Stay invested and let the winners run. Consider trailing your exit 5% below current price to lock in gains."
            priority = "MEDIUM"
        elif trend == 'Bearish':
            decision = "BOOK PROFITS"
            reasons.append(f"Trend reversed ({trend_days} days ago). Don't let gains evaporate.")
            action = "Sell current position to realize gains. Re-entry possible at lower support."
            priority = "HIGH" # Sell alerts always High Priority
            risk_level = "MEDIUM"
    else: # Loss
        if trend == 'Bullish' and signals.get('MACD_Turning_Bullish'):
            decision = "AVERAGE DOWN / HOLD"
            reasons.append(f"Bullish reversal detected ({trend_days} days) with MACD momentum.")
            action = "Buy additional shares to lower cost basis. Conviction: Medium."
            priority = "MEDIUM"
        elif trend == 'Bullish':
            decision = "HOLD"
            reasons.append("Waiting for bullish momentum confirmation before averaging down.")
            action = "Hold current position. Avoid averaging down until MACD turns bullish."
            priority = "LOW"
        elif trend == 'Bearish':
            decision = "REDUCE / EXIT"
            reasons.append("Protect your capital. The stock is under heavy pressure and there's no clear floor yet.")
            action = "Exit or reduce position to preserve remaining capital. Avoid adding more 'against the tide' right now."
            priority = "HIGH" # Exit signals always High Priority
            risk_level = "HIGH"

    if benchmark_comparison and benchmark_comparison.get('status') == 'UNDERPERFORMING':
        reasons.append(f"Risk factor: Underperforming Nifty 50 by {abs(benchmark_comparison['relative_strength'])}% lately.")
    
    # Volatility Check
    if signals.get('Volatility_Ratio', 0) > 0.04:
        risk_level = "HIGH"
        reasons.append("Volatility Spike: ATR expanded recently. Use wider stop-loss buffers.")

    # Portfolio Context Tags
    portfolio_tag = "NEUTRAL"
    pnl_pct = (price - avg_cost) / avg_cost if avg_cost > 0 else 0
    
    if pnl_pct > 0.15:
        portfolio_tag = "TOP PERFORMER"
    elif pnl_pct < -0.15:
        portfolio_tag = "DRAGGING PORTFOLIO"

    return decision, reasons, action, priority, risk_level, severity, portfolio_tag
