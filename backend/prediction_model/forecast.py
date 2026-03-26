import math
import numpy as np
import pandas as pd
from services.data_fetcher import fetch_data
from services.technical_indicators import calculate_indicators

def generate_price_forecast(df, confidence_score, horizon_days=5):
    backtest_shift = 10
    horizon_days = 20
    if df is None or df.empty or "ATR" not in df or "HV20" not in df or len(df) <= backtest_shift: return None
    idx = -1 - backtest_shift
    atr = df["ATR"].iloc[idx]
    hv20 = df["HV20"].iloc[idx]
    current_price = df["Close"].iloc[idx]
    try: start_date = df.index[idx].strftime("%Y-%m-%d")
    except: start_date = None
    if pd.isna(atr) or pd.isna(hv20) or pd.isna(current_price): return None
    hf = math.sqrt(horizon_days) * 0.85
    base_width = atr * hf
    mean_offset = ((confidence_score - 50) / 50.0) * base_width * 0.4
    mean_price = current_price + mean_offset
    forecast_high = min(mean_price + base_width, current_price * 1.20)
    forecast_low = max(mean_price - base_width, current_price * 0.80)
    if hv20 > 0 and current_price > 0:
        expected_move_ann = (base_width / current_price) / math.sqrt(horizon_days/252)
        diff_ratio = abs(expected_move_ann - hv20) / hv20
        confidence_pct = 85.0 - (diff_ratio * 50.0)
    else: confidence_pct = 50.0
    confidence_pct = max(50.0, min(85.0, confidence_pct))
    bias = "Bullish" if confidence_score > 50 else ("Bearish" if confidence_score < 50 else "Neutral")
    return {
        "horizon_days": int(horizon_days),
        "start_date": start_date,
        "current_price": round(float(current_price), 2),
        "forecast_high": round(float(forecast_high), 2),
        "forecast_mean": round(float(mean_price), 2),
        "forecast_low": round(float(forecast_low), 2),
        "base_width": round(float(base_width), 2),
        "mean_offset": round(float(mean_offset), 2),
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
        # Annualized std dev of logarithmic returns
        df_indicators['Log_Ret'] = np.log(df_indicators['Close'] / df_indicators['Close'].shift(1))
        df_indicators['HV20'] = df_indicators['Log_Ret'].rolling(window=20).std() * math.sqrt(252)
        
        forecast = generate_price_forecast(df_indicators, confidence_score, horizon_days)
        
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
