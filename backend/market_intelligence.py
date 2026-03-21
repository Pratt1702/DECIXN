import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings

# Import from modules
from services.data_fetcher import fetch_data
from services.technical_indicators import calculate_indicators, get_benchmark_comparison
from services.signal_generator import generate_signals
from services.decision_engine import make_decision, make_holding_decision

warnings.filterwarnings('ignore')

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
                    if df_sliced.empty: return []
                    return [{
                        "time": int(d.timestamp()),
                        "date": d.strftime("%Y-%m-%d"), 
                        "price": float(p),
                        "open": float(o),
                        "high": float(h),
                        "low": float(l),
                        "volume": float(v)
                    } for d, o, h, l, p, v in zip(df_sliced.index, df_sliced['Open'], df_sliced['High'], df_sliced['Low'], df_sliced['Close'], df_sliced['Volume'])]
                
                # Fetch different granularities to optimize performance and look
                df_max = t.history(period="max", interval="1mo")
                charts['All'] = make_chart(df_max)

                df_5y = t.history(period="5y", interval="1wk")
                charts['5Y'] = make_chart(df_5y)
                
                df_3y = t.history(period="3y", interval="1wk")
                charts['3Y'] = make_chart(df_3y)
                
                df_1y = t.history(period="1y", interval="1d")
                charts['1Y'] = make_chart(df_1y)
                
                df_6m = t.history(period="6mo", interval="1d")
                charts['6M'] = make_chart(df_6m)
                
                df_3m = t.history(period="3mo", interval="1d")
                charts['3M'] = make_chart(df_3m)
                
                df_1mo = t.history(period="1mo", interval="1h")
                charts['1M'] = [{
                    "time": int(d.timestamp()),
                    "date": d.strftime("%b %d %H:%M"),
                    "price": float(p),
                    "open": float(o), "high": float(h), "low": float(l), "volume": float(v)
                } for d, o, h, l, p, v in zip(df_1mo.index, df_1mo['Open'], df_1mo['High'], df_1mo['Low'], df_1mo['Close'], df_1mo['Volume'])] if not df_1mo.empty else []
            else:
                charts.update({'1M':[], '3M':[], '6M':[], '1Y':[], '3Y':[], '5Y':[], 'All':[]})
                
            # Fetch 1wk 15m data
            df_1wk = t.history(period="5d", interval="15m")
            if not df_1wk.empty:
                charts['1W'] = [{
                    "time": int(d.timestamp()),
                    "date": d.strftime("%b %d %H:%M"),
                    "price": float(p),
                    "open": float(o), "high": float(h), "low": float(l), "volume": float(v)
                } for d, o, h, l, p, v in zip(df_1wk.index, df_1wk['Open'], df_1wk['High'], df_1wk['Low'], df_1wk['Close'], df_1wk['Volume'])]
            else:
                charts['1W'] = []
                
            # Fetch 1d 5m data
            df_1d = t.history(period="1d", interval="5m")
            if not df_1d.empty:
                charts['1D'] = [{
                    "time": int(d.timestamp()),
                    "date": d.strftime("%H:%M:%S"),
                    "price": float(p),
                    "open": float(o), "high": float(h), "low": float(l), "volume": float(v)
                } for d, o, h, l, p, v in zip(df_1d.index, df_1d['Open'], df_1d['High'], df_1d['Low'], df_1d['Close'], df_1d['Volume'])]
            else:
                charts['1D'] = []
                
        except Exception as e:
            print(f"Error fetching charts for {sym_code}: {e}")
        return charts

    symbol = symbol.upper().replace(' ', '')
    original_symbol = symbol.replace('.NS', '').replace('.BO', '')
    
    # Try .NS first, then .BO as fallback
    symbols_to_try = [f"{original_symbol}.NS", f"{original_symbol}.BO"]
    
    df = None
    final_symbol = None
    fetch_error = None

    for sym in symbols_to_try:
        try:
            df = fetch_data(sym, period="1y")
            if not df.empty:
                final_symbol = sym
                break
        except Exception as e:
            fetch_error = e
            continue

    if df is None or df.empty:
        # Final attempt: try without any suffix just in case
        try:
            df = fetch_data(original_symbol, period="1y")
            final_symbol = original_symbol
        except:
            return {
                "symbol": original_symbol,
                "success": False,
                "error": f"Ticker '{original_symbol}' not found on NSE or BSE. (Last error: {fetch_error})"
            }

    symbol = final_symbol
        
    try:
        df_indicators = calculate_indicators(df)
        signals = generate_signals(df_indicators)
        decision, reasons, score, action, priority, risk_level, pattern, trade_type, severity, watch_desc = make_decision(signals)
        
        # Benchmark Comparison
        benchmark_comparison = get_benchmark_comparison(df)
        
        def convert_numpy(obj):
            if isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, (bool, np.bool_)):
                return bool(obj)
            return obj

        clean_macd = {k: convert_numpy(v) for k, v in signals['MACD'].items()}
        
        chart_data = [{
            "time": int(d.timestamp()),
            "date": d.strftime("%Y-%m-%d"), 
            "price": convert_numpy(p),
            "open": convert_numpy(o),
            "high": convert_numpy(h),
            "low": convert_numpy(l),
            "volume": convert_numpy(v)
        } for d, o, h, l, p, v in zip(df.index, df['Open'], df['High'], df['Low'], df['Close'], df['Volume'])]
        
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
            "sector": convert_numpy(info.get("sector") or "Unknown"),
            "industry": convert_numpy(info.get("industry") or "Unknown"),
            "quote_type": convert_numpy(info.get("quoteType") or "EQUITY"),
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
                "priority": priority,
                "risk_level": risk_level,
                "pattern": pattern,
                "severity": severity,
                "watch_condition": watch_desc,
                "trade_type": trade_type,
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

    original_symbol = symbol.replace('.NS', '').replace('.BO', '')
    symbols_to_try = [f"{original_symbol}.NS", f"{original_symbol}.BO"]
    
    df = None
    final_symbol = None
    for sym in symbols_to_try:
        try:
            df = fetch_data(sym, period="100d")
            if not df.empty:
                final_symbol = sym
                break
        except:
            continue
    
    # If no exchange found, create a mock-up/fallback result instead of crashing
    is_fallback = False
    if df is None:
        is_fallback = True
        dates = pd.date_range(end=datetime.today(), periods=5)
        price_est = avg_cost + (pnl / qty) if qty > 0 else avg_cost
        df = pd.DataFrame({
            'Open': [price_est]*5, 'High': [price_est]*5, 'Low': [price_est]*5, 
            'Close': [price_est]*5, 'Volume': [0]*5
        }, index=dates)
        symbol = original_symbol
    else:
        symbol = final_symbol

    try:
        df_indicators = calculate_indicators(df)
        signals = generate_signals(df_indicators)
        
        # Add warning for fallback data
        mkt_reasons = []
        if is_fallback:
            mkt_reasons.append("LIVE DATA UNAVAILABLE: Using estimated price based on your P&L history.")
            signals['Trend'] = "Neutral (No Data)"
            signals['MACD'] = {'macd':0, 'signal':0, 'hist':0}
            signals['RSI'] = 50
            signals['Price'] = avg_cost + (pnl / qty) if qty > 0 else avg_cost

        total_invested = avg_cost * qty
        current_value = signals['Price'] * qty
        live_pnl = current_value - total_invested
        pnl_pct = (live_pnl / total_invested * 100) if total_invested > 0 else 0.0

        fifty_two_week_low = None
        fifty_two_week_high = None
        sector = "Unknown"
        industry = "Unknown"
        quote_type = "EQUITY"
        company_name = symbol.replace('.NS', '').replace('.BO', '')
        
        try:
            info = yf.Ticker(symbol).info
            fifty_two_week_low = info.get('fiftyTwoWeekLow')
            fifty_two_week_high = info.get('fiftyTwoWeekHigh')
            sector = info.get('sector', 'Unknown') or "Unknown"
            industry = info.get('industry', 'Unknown') or "Unknown"
            quote_type = info.get('quoteType', 'EQUITY') or "EQUITY"
            company_name = info.get('longName', info.get('shortName', company_name))
        except:
            pass

        benchmark_comparison = get_benchmark_comparison(df)
        if not is_fallback:
            mkt_decision, mkt_reasons_raw, mkt_score, mkt_action, mkt_priority, mkt_risk, mkt_pattern, trade_type, mkt_severity, watch_desc = make_decision(signals)
            mkt_reasons.extend(mkt_reasons_raw)
        else:
            # Safe defaults for fallback
            mkt_decision, mkt_score, mkt_action, mkt_priority, mkt_risk, mkt_pattern, trade_type, mkt_severity, watch_desc = ("HOLD", 50, "WAIT", "LOW", "LOW", "Unknown", "DEBT", "LOW", "Maintain status quo")
        decision, reasons, action, priority, risk_level, _, portfolio_tag = make_holding_decision(
            signals, avg_cost, live_pnl,
            fifty_two_week_low=fifty_two_week_low,
            fifty_two_week_high=fifty_two_week_high,
            benchmark_comparison=benchmark_comparison
        )

        urgency_score = priority 
        risk_tag = risk_level

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
                "sector": sector,
                "industry": industry,
                "quote_type": quote_type,
                "price": convert_numpy(signals['Price']),
                "trend": signals['Trend'],
                "portfolio_decision": decision,
                "portfolio_action": action,
                "priority": priority,
                "risk_level": risk_level,
                "severity": mkt_severity,
                "portfolio_tag": portfolio_tag,
                "watch_condition": watch_desc,
                "pattern": mkt_pattern,
                "trade_type": trade_type,
                "urgency_score": urgency_score,
                "risk_tag": risk_tag,
                "reasons": mkt_reasons + reasons,
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
        df = fetch_data(symbol, period="100d")
        df_indicators = calculate_indicators(df)
        signals = generate_signals(df_indicators)
        decision, reasons, score, action, priority, risk, pattern, trade_type, sev, wd = make_decision(signals)
        
        results[symbol] = {
            'signals': signals,
            'decision': decision,
            'reasons': reasons,
            'score': score,
            'action': action
        }
        
        print(format_output(symbol, signals, decision, reasons, score, action))
        print("\n")
        
    print("Top Opportunities Today:")
    ranked_stocks = sorted(results.items(), key=lambda x: x[1]['score'], reverse=True)
    
    for symbol, data in ranked_stocks:
        clean_symbol = symbol.replace('.NS', '')
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
