import pandas as pd
import numpy as np
import math

def generate_next_day_range(df, confidence_score):
    if df is None or df.empty:
        return {}

    latest = df.iloc[-1]
    
    current_price = latest.get('Close', 0)
    atr = latest.get('ATR', 0)
    
    # base_range = ATR
    adjusted_range = atr
    
    # Volume adjustment
    vol20 = latest.get('Vol20', 1.0)
    if not vol20 or pd.isna(vol20) or vol20 == 0:
        vol20 = 1.0
    volume_ratio = latest.get('Volume', 0) / vol20
    
    if volume_ratio > 1.5:
        adjusted_range *= 1.15
        volume_effect = "expanded"
    elif volume_ratio < 0.7:
        adjusted_range *= 0.85
        volume_effect = "compressed"
    else:
        adjusted_range *= 1.0
        volume_effect = "neutral"
        
    # RSI placement skew
    rsi = latest.get('RSI', 50)
    if rsi > 65:
        placement_offset = adjusted_range * -0.15
        rsi_skew = "skewed_lower"
    elif rsi < 35:
        placement_offset = adjusted_range * 0.15
        rsi_skew = "skewed_higher"
    else:
        placement_offset = 0
        rsi_skew = "neutral"
        
    # Directional mean offset
    mean_offset = ((confidence_score - 50) / 50.0) * adjusted_range * 0.3
    
    # MACD tilt (small nudge)
    macd_hist = latest.get('MACD_Histogram', 0)
    macd_tilt = 0
    if atr != 0:
        macd_ratio = macd_hist / atr
        macd_ratio = max(-0.1, min(0.1, macd_ratio))
        macd_tilt = macd_ratio * adjusted_range
        
    if macd_tilt > 0:
        macd_label = "bullish"
    elif macd_tilt < 0:
        macd_label = "bearish"
    else:
        macd_label = "neutral"
        
    # Assemble
    expected_mean = current_price + mean_offset + placement_offset + macd_tilt
    range_high = expected_mean + (adjusted_range * 0.5)
    range_low = expected_mean - (adjusted_range * 0.5)
    
    # Cap: HIGH and LOW never more than ±8% from current_price
    max_dev = current_price * 0.08
    if range_high > current_price + max_dev:
        range_high = current_price + max_dev
    if range_low < current_price - max_dev:
        range_low = current_price - max_dev
        
    if range_high < range_low:
        range_high, range_low = range_low, range_high
        
    # Confidence label
    hv20 = latest.get('HV20', np.nan)
    if pd.isna(hv20):
        if len(df) >= 20:
            returns = np.log(df['Close'] / df['Close'].shift(1))
            hv20 = returns.tail(20).std() * math.sqrt(252)
        else:
            hv20 = atr / current_price * math.sqrt(252) if current_price else 0

    if hv20 < 0.20 and (0.8 <= volume_ratio <= 1.3) and (40 <= rsi <= 60):
        range_confidence = "High"
    elif hv20 > 0.45 or volume_ratio > 2.0:
        range_confidence = "Low"
    else:
        range_confidence = "Medium"

    bias = "Bullish" if expected_mean > current_price else ("Bearish" if expected_mean < current_price else "Neutral")

    return {
        "current_price": float(current_price),
        "range_high": float(range_high),
        "range_low": float(range_low),
        "expected_mean": float(expected_mean),
        "adjusted_range": float(adjusted_range),
        "bias": bias,
        "range_confidence": range_confidence,
        "modifiers": {
            "volume_effect": volume_effect,
            "rsi_skew": rsi_skew,
            "macd_tilt": macd_label
        }
    }
