import numpy as np
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from services.supabase_client import supabase

# Global cache to prevent redundant yfinance calls
TICKER_CACHE = {}
DETAILS_CACHE = {}

def get_benchmark_performance(period: str = "5y"):
    """
    Fetch NIFTY 50 performance as a benchmark.
    """
    try:
        nifty = yf.Ticker("^NSEI")
        hist = nifty.history(period=period)
        if hist.empty:
            return []
        
        benchmark_data = []
        for date, row in hist.iterrows():
            benchmark_data.append({
                "date": date.strftime('%Y-%m-%d'),
                "nav": round(float(row['Close']), 2)
            })
        return benchmark_data
    except Exception as e:
        print(f"Benchmark fetch error: {e}")
        return []

def calculate_mf_risk_metrics(fund_history, benchmark_history):
    """
    Calculates Standard Deviation, Sharpe Ratio, Beta, Alpha, CAGR, and Max Drawdown.
    """
    try:
        if not fund_history or not benchmark_history:
            return {}
            
        fund_df = pd.DataFrame(fund_history).set_index("date")
        bench_df = pd.DataFrame(benchmark_history).set_index("date")
        
        # Sync dates
        combined = pd.merge(fund_df, bench_df, left_index=True, right_index=True, suffixes=('_fund', '_bench'))
        if len(combined) < 20: # Need enough data points
            return {}

        # Daily Returns
        combined['returns_fund'] = combined['nav_fund'].pct_change()
        combined['returns_bench'] = combined['nav_bench'].pct_change()
        combined = combined.dropna()

        # Risk Free Rate (Monthly ~0.5% for 6% annual)
        rfr_daily = 0.06 / 252 

        # 1. Volatility (Annualized Standard Deviation)
        std_dev = combined['returns_fund'].std() * np.sqrt(252)
        
        # 2. Sharpe Ratio (Annualized)
        excess_return = combined['returns_fund'].mean() - rfr_daily
        sharpe = (excess_return * 252) / std_dev if std_dev != 0 else 0
        
        # 3. Beta
        covariance = combined['returns_fund'].cov(combined['returns_bench'])
        variance = combined['returns_bench'].var()
        beta = covariance / variance if variance != 0 else 1
        
        # 4. Alpha (Jenson's Alpha)
        fund_ann_return = combined['returns_fund'].mean() * 252
        bench_ann_return = combined['returns_bench'].mean() * 252
        alpha = fund_ann_return - (rfr_daily * 252 + beta * (bench_ann_return - rfr_daily * 252))

        # 5. CAGR (Total Period)
        start_nav = float(combined['nav_fund'].iloc[0])
        end_nav = float(combined['nav_fund'].iloc[-1])
        days = (pd.to_datetime(combined.index[-1]) - pd.to_datetime(combined.index[0])).days
        years = days / 365.25
        cagr = (end_nav / start_nav) ** (1 / years) - 1 if years > 0 else 0

        # 6. Max Drawdown
        rolling_max = combined['nav_fund'].cummax()
        drawdown = (combined['nav_fund'] - rolling_max) / rolling_max
        max_drawdown = drawdown.min()

        # 7. Sortino Ratio
        downside_returns = combined[combined['returns_fund'] < 0]['returns_fund']
        downside_std_dev = downside_returns.std() * np.sqrt(252)
        sortino = (excess_return * 252) / downside_std_dev if downside_std_dev > 0 else sharpe

        return {
            "volatility": round(float(std_dev * 100), 2),
            "sharpe_ratio": round(float(sharpe), 2),
            "sortino_ratio": round(float(sortino), 2),
            "beta": round(float(beta), 2),
            "alpha": round(float(alpha * 100), 2),
            "cagr": round(float(cagr * 100), 2),
            "max_drawdown": round(float(max_drawdown * 100), 2)
        }
    except Exception as e:
        print(f"Risk calculation error: {e}")
        return {}

def calculate_momentum_metrics(fund_history, benchmark_history):
    """
    Calculates returns and alpha for different time windows (30d, 90d, 180d)
    to detect acceleration/deceleration trends.
    """
    try:
        if not fund_history or not benchmark_history:
            return {}
            
        fund_df = pd.DataFrame(fund_history).set_index("date")
        bench_df = pd.DataFrame(benchmark_history).set_index("date")
        
        # Sync dates
        combined = pd.merge(fund_df, bench_df, left_index=True, right_index=True, suffixes=('_fund', '_bench'))
        if len(combined) < 30: # Need at least a month of data
            return {}

        results = {}
        windows = [30, 90, 180]
        
        for w in windows:
            if len(combined) >= w:
                subset = combined.tail(w)
                start_f = subset['nav_fund'].iloc[0]
                end_f = subset['nav_fund'].iloc[-1]
                start_b = subset['nav_bench'].iloc[0]
                end_b = subset['nav_bench'].iloc[-1]
                
                f_ret = (end_f / start_f - 1) * 100
                b_ret = (end_b / start_b - 1) * 100
                alpha = f_ret - b_ret
                
                results[f"return_{w}d"] = round(float(f_ret), 2)
                results[f"alpha_{w}d"] = round(float(alpha), 2)
        
        # Trend detection: Is 30d alpha better than 180d/active mean?
        current_alpha = results.get("alpha_30d", 0)
        long_term_alpha = results.get("alpha_180d", results.get("alpha_90d", 0))
        
        results["momentum_score"] = round(current_alpha - long_term_alpha, 2)
        results["trend"] = "Accelerating" if results["momentum_score"] > 0.5 else ("Decelerating" if results["momentum_score"] < -0.5 else "Steady")
        
        return results
    except Exception as e:
        print(f"Momentum calculation error: {e}")
        return {}

def get_mf_ticker_from_isin(isin: str):
    """
    Search yfinance to find the ticker symbol for an ISIN.
    """
    if not isin: return None
    if isin in TICKER_CACHE: return TICKER_CACHE[isin]
    
    try:
        search = yf.Search(isin)
        if search.quotes:
            # Sort by exchange priority (NSE/BSE first)
            for q in search.quotes:
                if q.get("exchange") in ["BSE", "NSI"] or q.get("quoteType") in ["MUTUALFUND", "EQUITY", "ETF"]:
                    TICKER_CACHE[isin] = q["symbol"]
                    return q["symbol"]
            # Fallback to the first quote if no exchange match
            TICKER_CACHE[isin] = search.quotes[0]["symbol"]
            return search.quotes[0]["symbol"]
        return None
    except Exception as e:
        print(f"Ticker lookup error for {isin}: {e}")
        return None

def get_mf_historical_nav(scheme_code: str, period: str = "1y"):
    """
    Fetch historical NAV for a mutual fund scheme.
    Uses our DB to find the ISIN, then yfinance to get history.
    """
    try:
        # 1. Determine if we have an ISIN or a Scheme Code
        is_isin = len(scheme_code) == 12 and any(c.isdigit() for c in scheme_code)
        
        if is_isin:
            res = supabase.table("mf_schemes").select("isin_div_payout, isin_reinvest, scheme_name")\
                .or_(f"isin_div_payout.eq.{scheme_code},isin_reinvest.eq.{scheme_code}")\
                .limit(1)\
                .execute()
        else:
            res = supabase.table("mf_schemes").select("isin_div_payout, isin_reinvest, scheme_name")\
                .eq("scheme_code", scheme_code)\
                .limit(1)\
                .execute()
        
        if not res.data:
            # Fallback: Treat the scheme_code as a direct ticker or ISIN even if not in DB
            isin = scheme_code if is_isin else None
            scheme_name = isin if isin else "Unknown Asset"
        else:
            scheme = res.data[0]
            isin = scheme.get("isin_div_payout") or scheme.get("isin_reinvest")
            scheme_name = scheme.get("scheme_name")
        
        if not isin and not is_isin:
            return {"success": False, "error": "No ISIN available and code is not an ISIN."}
            
        # 2. Map ISIN to yfinance ticker
        ticker_symbol = get_mf_ticker_from_isin(isin or scheme_code)
        
        # Fallback: Search by Name if ISIN search failed
        if not ticker_symbol and scheme_name:
            print(f"ISIN search failed for {isin}. Trying name-based search: {scheme_name}")
            ticker_symbol = get_mf_ticker_from_isin(scheme_name)
            
        if not ticker_symbol:
            # Final fallback: Try the code itself as a ticker
            ticker_symbol = scheme_code if not is_isin else None
            
        if not ticker_symbol:
            return {"success": False, "error": f"Could not resolve {scheme_code} to a valid market ticker."}
            
        # 3. Fetch history
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period=period)
        
        if hist.empty:
            return {"success": False, "error": "No historical data found for this ticker."}
            
        # Format for frontend (ApexCharts/Recharts compatible)
        history_data = []
        for date, row in hist.iterrows():
            history_data.append({
                "date": date.strftime('%Y-%m-%d'),
                "nav": round(float(row['Close']), 4)
            })
            
        # 4. Fetch Benchmark for comparison
        benchmark_history = get_benchmark_performance(period=period)
        
        # 5. Calculate Metrics
        risk_metrics = calculate_mf_risk_metrics(history_data, benchmark_history)
        momentum_metrics = calculate_momentum_metrics(history_data, benchmark_history)
        
        # 6. Extract Info
        info = ticker.info if hasattr(ticker, 'info') else {}
        
        return {
            "success": True,
            "scheme_name": scheme_name or info.get("longName") or info.get("shortName") or isin,
            "ticker": ticker_symbol,
            "isin": isin,
            "history": history_data,
            "benchmark_history": benchmark_history,
            "metrics": risk_metrics,
            "momentum": momentum_metrics,
            "stats": {
                "expense_ratio": info.get("expenseRatio", 0.012), # Fallback to 1.2% if missing
                "aum": info.get("totalAssets", 24500000000), # Fallback to dummy
                "exit_load": info.get("exitLoad", "1.0% (within 1Y)"),
                "category": info.get("category", "Mutual Fund")
            },
            "info": info
        }
    except Exception as e:
        print(f"Historical NAV error: {e}")
        return {"success": False, "error": str(e)}

def get_mf_latest_details(scheme_code: str):
    """
    Get everything we know about a fund: Current NAV, historical points, info.
    """
    if scheme_code in DETAILS_CACHE:
        return DETAILS_CACHE[scheme_code]
        
    res = get_mf_historical_nav(scheme_code, period="5y")
    if res.get("success"):
        DETAILS_CACHE[scheme_code] = res
    return res
