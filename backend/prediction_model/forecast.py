import math
import numpy as np
import pandas as pd
from datetime import timedelta
from services.data_fetcher import fetch_data
from services.technical_indicators import calculate_indicators

def generate_price_forecast(df, confidence_score, horizon_days=14):
    """
    Generates a 14-day price forecast (2 days overlap, 7 days future).
    Integrates Confluence Score + Momentum (MA Slopes).
    """
    overlap_days = 2
    future_days = 7
    total_days = overlap_days + future_days
    
    if df is None or df.empty or "ATR" not in df or "MA20_Slope" not in df or len(df) <= overlap_days:
        return None
        
    # Latest data point (Today)
    latest_idx = -1
    current_price = df["Close"].iloc[latest_idx]
    current_date = df.index[latest_idx]
    atr = df["ATR"].iloc[latest_idx]
    ma20_slope = df["MA20_Slope"].iloc[latest_idx] # % change per bar in MA20
    
    # Anchor index is 2 days ago for back-test
    anchor_idx = -1 - overlap_days
    anchor_price = df["Close"].iloc[anchor_idx]
    anchor_date = df.index[anchor_idx]
    
    if pd.isna(atr) or pd.isna(current_price) or pd.isna(ma20_slope):
        return None

    # Calculate Integrated Bias: AI Score (50) + Momentum (MA Slope)
    # ma20_slope is typically in range [-2, 2]. 
    # We normalize momentum contribution.
    momentum_bias = max(-0.05, min(0.05, ma20_slope / 20.0)) # Max 5% bias from momentum
    
    # AI Confluence Bias
    max_ai_bias = 0.15 
    ai_bias = ((confidence_score - 50) / 50.0) * max_ai_bias
    
    # Total expected move over the future window (Capped at 10% for realism)
    total_expected_move_pct = max(-0.10, min(0.10, momentum_bias + ai_bias))
    daily_bias_future = total_expected_move_pct / future_days
    
    # Multiplier for cone width
    hf = 1.1 
    
    series = []
    
    # Series Generation (Honest Back-Test + Future)
    # The mean line now projects starting from the anchor_price (2 days ago)
    # to show a realistic 'What the AI thought would happen' vs 'What actually happened'
    anchor_price = float(df["Close"].iloc[anchor_idx])

    for i in range(overlap_days + future_days + 1):
        idx = anchor_idx + i
        is_future = i > overlap_days
        
        if not is_future:
            target_date = df.index[idx]
        else:
            # Calendar days for future
            target_date = current_date + timedelta(days=(i - overlap_days))

        # Mean is a pure projection from the anchor price
        mean_price = anchor_price * (1 + (daily_bias_future * i))
        
        # Volatility expands from the anchor (i=0 -> width=0)
        width = atr * hf * math.sqrt(i)
        
        series.append({
            "date": target_date.strftime("%Y-%m-%d"),
            "timestamp": int(target_date.timestamp() * 1000),
            "forecast_mean": round(float(mean_price), 2),
            "forecast_high": round(float(mean_price + width), 2),
            "forecast_low": round(float(mean_price - width), 2),
            "is_future": is_future
        })

    # Summary
    bias = "Bullish" if total_expected_move_pct > 0.01 else ("Bearish" if total_expected_move_pct < -0.01 else "Neutral")
    confidence_pct = max(50.0, min(85.0, 50.0 + abs(confidence_score - 50)))


    return {
        "series": series,
        "anchor_date": anchor_date.strftime("%Y-%m-%d"),
        "current_price": round(float(current_price), 2),
        "forecast_high": series[-1]["forecast_high"],
        "forecast_mean": series[-1]["forecast_mean"],
        "forecast_low": series[-1]["forecast_low"],
        "horizon_days": total_days,
        "confidence_pct": round(float(confidence_pct), 2),
        "bias": bias
    }



def run_prediction(symbol: str, confidence_score: int, horizon_days: int = 5):
    """
    Wrapper function that fetches data, calculates missing indicators (like HV20),
    and generates the decoupled prediction.
    """
    symbol = symbol.strip().upper().replace(' ', '').replace('$', '')
    original_symbol = symbol.replace('.NS', '').replace('.BO', '')
    
    symbols_to_try = [f"{original_symbol}.NS", f"{original_symbol}.BO"]
    
    df = None
    for sym in symbols_to_try:
        try:
            df = fetch_data(sym, period="1y")
            if not df.empty:
                break
        except Exception:
            continue

    if df is None or df.empty:
        try:
            df = fetch_data(original_symbol, period="1y")
        except Exception as e:
            return {"success": False, "error": f"Failed to fetch data: {str(e)}"}
            
    if df is None or df.empty:
        return {"success": False, "error": f"No data found for {original_symbol}"}
            
    try:
        df_indicators = calculate_indicators(df)
        
        # Calculate HV20 (Historical Volatility 20-day)
        df_indicators['Log_Ret'] = np.log(df_indicators['Close'] / df_indicators['Close'].shift(1))
        df_indicators['HV20'] = df_indicators['Log_Ret'].rolling(window=20).std() * math.sqrt(252)
        
        forecast = generate_price_forecast(df_indicators, confidence_score, horizon_days=14)
        
        if forecast:
            return {
                "success": True,
                "symbol": original_symbol,
                "forecast": forecast
            }
        else:
            return {"success": False, "error": "Not enough data to calculate forecast indicators (ATR/HV20)."}
    except Exception as e:
        return {"success": False, "error": str(e)}
