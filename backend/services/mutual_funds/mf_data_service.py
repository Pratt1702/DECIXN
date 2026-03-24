import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from services.supabase_client import supabase

def get_mf_ticker_from_isin(isin: str):
    """
    Search yfinance to find the ticker symbol for an ISIN.
    """
    try:
        search = yf.Search(isin)
        if search.quotes:
            for q in search.quotes:
                if q.get("exchange") in ["BSE", "NSI"] or q.get("quoteType") == "MUTUALFUND":
                    return q["symbol"]
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
        # 1. Get ISIN from our DB
        res = supabase.table("mf_schemes").select("isin_div_payout, isin_reinvest, scheme_name")\
            .eq("scheme_code", scheme_code)\
            .limit(1)\
            .execute()
        
        if not res.data:
            return {"success": False, "error": "Scheme not found in database."}
        
        scheme = res.data[0]
        isin = scheme.get("isin_div_payout") or scheme.get("isin_reinvest")
        
        if not isin:
            return {"success": False, "error": "No ISIN available for this scheme."}
            
        # 2. Map ISIN to yfinance ticker
        ticker_symbol = get_mf_ticker_from_isin(isin)
        if not ticker_symbol:
            return {"success": False, "error": f"Could not map ISIN {isin} to yfinance ticker."}
            
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
            
        return {
            "success": True,
            "scheme_name": scheme.get("scheme_name"),
            "ticker": ticker_symbol,
            "isin": isin,
            "history": history_data,
            "info": ticker.info if hasattr(ticker, 'info') else {}
        }
    except Exception as e:
        print(f"Historical NAV error: {e}")
        return {"success": False, "error": str(e)}

def get_mf_latest_details(scheme_code: str):
    """
    Get everything we know about a fund: Current NAV, historical points, info.
    """
    return get_mf_historical_nav(scheme_code, period="5y")
