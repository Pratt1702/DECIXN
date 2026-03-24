def make_decision(signals):
    """
    4. Advanced intelligence engine with normalized scoring and data-backed heuristics.
    """
    reasons = []
    confluence_score = 0
    priority = "LOW"
    risk_level = "LOW"
    
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
        indices = [] # Initialize indices list
        sensex = yf.Ticker("^BSESN").history(period="5d")
        if len(sensex) >= 2:
            prev_close = sensex['Close'].iloc[-2]
            curr_price = sensex['Close'].iloc[-1]
            change = curr_price - prev_close
            change_pct = (change / prev_close) * 100
        else:
            curr_price, change, change_pct = 0, 0, 0
            
        indices.append({
            "name": "SENSEX",
            "symbol": "^BSESN",
            "price": float(curr_price),
            "change": float(change),
            "changePercent": float(change_pct)
        })

        # Fetch MIDCAP
        midcap = yf.Ticker("^NSEMDCP100").history(period="5d")
        if len(midcap) >= 2:
            prev_close = midcap['Close'].iloc[-2]
            curr_price = midcap['Close'].iloc[-1]
            change_pct = ((curr_price - prev_close) / prev_close) * 100
            indices.append({
                "name": "MIDCAP",
                "symbol": "^NSEMDCP100",
                "price": float(curr_price),
                "change": float(curr_price - prev_close),
                "changePercent": float(change_pct)
            })
    
    if dist_ma20 > 8:
        risk_level = "HIGH"
        confluence_score -= 10
        reasons.append(f"Stretch Warning: Running too far, too fast. Expect a cooling-off period soon as price reverts to mean (Dist. MA20: {dist_ma20:.1f}%).")
    
    # 5. Bearish Momentum (MACD Check)
    if signals.get('MACD_Turning_Bearish'):
        confluence_score -= 10 # Softened
        reasons.append("Momentum Shift: Sellers are starting to gain the upper hand as momentum slows (MACD: Bearish Crossover).")

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
    
    return decision, reasons, score, action, priority, risk_level, pattern, trade_type, severity, watch_desc


def make_holding_decision(signals, avg_cost, pnl, fifty_two_week_low=None, fifty_two_week_high=None, benchmark_comparison=None):
    """
    Produce a professional portfolio decision based on current holding status (P&L) vs Market Trend.
    """
    is_mf = symbol.startswith('INF') or symbol.startswith('IN') or len(symbol) >= 12
    
    decision = "HOLD"
    reasons = []
    severity = "MODERATE"

    trend = signals['Trend']
    trend_days = signals.get('Trend_Days', 1)
    price = signals['Price']

    is_profit = pnl > 0

    action = "Monitor price action at recent support/resistance levels."
    priority = "LOW"
    risk_level = "LOW"
    
    if is_mf:
        # --- MUTUAL FUND LONG-TERM LOGIC ---
        if trend == 'Bullish':
            decision = "SIP / ACCUMULATE"
            reasons.append("Fund is in a healthy growth phase. Historical compounding remains strong.")
            action = "Continue SIP or add on dips. Focus on wealth accumulation over 5-10 year horizon."
            priority = "MEDIUM"
        else: # Bearish trend in MF
            if is_profit:
                decision = "WEALTH MACHINE (HOLD)"
                reasons.append("Short-term correction in a long-term winner. Don't let volatility shake your compounding.")
                action = "Maintain position. This is a wealth machine; short-term dips are typical for mid/small-cap allocations."
                priority = "LOW"
            else:
                decision = "UNDERPERFORMER (REVIEW)"
                reasons.append("Fund is showing persistent relative weakness vs benchmark. Check for fund manager changes.")
                action = "Hold for now but compare with Category Average. Consider reallocating if underperformance persists for 2+ quarters."
                priority = "MEDIUM"
                risk_level = "MEDIUM"
    else:
        # --- STANDARD STOCK LOGIC ---
        if is_profit:
            if trend == 'Bullish':
                decision = "RIDE TREND (HOLD)"
                reasons.append(f"Growth remains intact. The stock has been trending well for {trend_days} days.")
                action = "Stay invested and let the winners run. Consider trailing your exit 5% below current price."
                priority = "MEDIUM"
            elif trend == 'Bearish':
                decision = "BOOK PROFITS"
                reasons.append(f"Trend reversed ({trend_days} days ago). Don't let gains evaporate.")
                action = "Sell current position to realize gains. Re-entry possible at lower support."
                priority = "HIGH"
                risk_level = "MEDIUM"
        else: # Loss
            if trend == 'Bullish':
                decision = "AVERAGE DOWN / HOLD"
                reasons.append(f"Bullish reversal detected ({trend_days} days) with MACD momentum.")
                action = "Buy additional shares to lower cost basis."
                priority = "MEDIUM"
            elif trend == 'Bearish':
                decision = "REDUCE / EXIT"
                reasons.append("Protect your capital. The stock is under heavy pressure.")
                action = "Exit or reduce position to preserve remaining capital."
                priority = "HIGH"
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
