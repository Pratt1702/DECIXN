from services.supabase_client import supabase
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor

def get_isin_from_db(name_or_code: str):
    """
    Search our DB to find the ISIN for a fund.
    """
    try:
        # Try finding by scheme_code first
        res = supabase.table("mf_schemes").select("isin_div_payout, isin_reinvest, scheme_name")\
            .or_(f"scheme_code.eq.{name_or_code},scheme_name.ilike.%{name_or_code}%")\
            .limit(1)\
            .execute()
        
        if res.data:
            # Prefer Payout ISIN, then Reinvest
            return res.data[0].get("isin_div_payout") or res.data[0].get("isin_reinvest")
        
        # Try fuzzy search if direct lookup fails
        search_res = supabase.rpc("search_mf_fuzzy", {"search_term": name_or_code}).execute()
        if search_res.data:
            return search_res.data[0].get("isin_div_payout") or search_res.data[0].get("isin_reinvest")
            
        return None
    except Exception as e:
        print(f"DB ISIN Lookup Error: {e}")
        return None

def analyze_single_mf_holding(name_or_isin: str, avg_cost: float, quantity: float, isin: str = None):
    """
    Analyzes a single mutual fund holding by fetching the latest NAV via yfinance.
    """
    try:
        lookup_target = isin or name_or_isin
        
        # 1. Search yfinance for this ISIN/Name
        search = yf.Search(lookup_target)
        valid_quote = None
        
        if search.quotes:
            # Prioritize Indian Mutual Funds (BSE/NSI)
            # Some global funds (Mirae, etc) might show global tickers first
            quotes = search.quotes
            # Sort: Prioritize symbols ending in .BO or .NS, then general Indian exchanges
            quotes.sort(key=lambda x: (
                1 if x.get("symbol", "").endswith((".BO", ".NS")) else
                2 if x.get("exchange") in ["BSE", "NSI"] else
                3
            ))
            
            for q in quotes:
                if q.get("exchange") in ["BSE", "NSI"] or q.get("symbol", "").endswith((".BO", ".NS")) or q.get("quoteType") == "MUTUALFUND":
                    valid_quote = q
                    break
        
        # 2. Fallback: If no Indian ticker found for ISIN, try searching by Name
        if not valid_quote and isin:
            db_scheme = supabase.table("mf_schemes").select("scheme_name").or_(f"isin_div_payout.eq.{isin},isin_reinvest.eq.{isin}").limit(1).execute()
            if db_scheme.data:
                name = db_scheme.data[0]["scheme_name"]
                search = yf.Search(name)
                if search.quotes:
                    for q in search.quotes:
                        if q.get("symbol", "").endswith((".BO", ".NS")) or q.get("exchange") in ["BSE", "NSI"]:
                            valid_quote = q
                            break
                            
        if not valid_quote:
            return {"success": False, "error": f"Invalid mapping: {lookup_target} not found on BSE/NSI"}
        
        ticker_symbol = valid_quote["symbol"]
        ticker = yf.Ticker(ticker_symbol)
        
        # Get latest price
        # yfinance history '1d' is flaky for mutual funds/NAV (often returns 'possibly delisted')
        # We use a 5-day window and take the last available NAV for robustness
        hist = ticker.history(period="5d")
        if hist.empty:
            return {"success": False, "error": f"No price data found for ticker: {ticker_symbol} (ISIN: {lookup_target})"}
            
        latest_nav = float(hist['Close'].iloc[-1])
        nav_date = hist.index[-1].strftime('%Y-%m-%d')
        
        invested_value = avg_cost * quantity
        current_value = latest_nav * quantity
        current_pnl = current_value - invested_value
        pnl_pct = (current_pnl / invested_value * 100) if invested_value > 0 else 0
        
        return {
            "success": True,
            "symbol": name_or_isin,
            "ticker": ticker_symbol,
            "isin": isin or lookup_target if len(lookup_target) == 12 else None,
            "scheme_name": valid_quote.get("shortname", name_or_isin) if not name_or_isin or len(name_or_isin) == 12 else name_or_isin,
            "holding_context": {
                "quantity": quantity,
                "avg_cost": avg_cost,
                "current_price": latest_nav,
                "current_value": current_value,
                "invested_value": invested_value,
                "current_pnl": current_pnl,
                "pnl_pct": pnl_pct,
                "nav_date": nav_date
            }
        }
    except Exception as e:
        print(f"MF Holding Analysis Error: {e}")
        return {"success": False, "error": str(e)}

def run_mf_portfolio_analysis(holdings_data: list[dict]) -> dict:
    """
    Analyzes a list of MF holdings and returns a summary.
    """
    results = []
    
    def process_holding(h):
        name = h.get("symbol")
        isin = h.get("isin")
        qty = float(h.get("quantity", 0))
        avg_price = float(h.get("avg_cost", 0))
        if not (name or isin) or qty <= 0: return None
        return analyze_single_mf_holding(name, avg_price, qty, isin=isin)

    # Note: increased workers might hit yfinance rate limits if too many
    with ThreadPoolExecutor(max_workers=5) as executor:
        batch_results = list(executor.map(process_holding, holdings_data))
        results = [r for r in batch_results if r and r.get("success")]

    if not results:
        return {
            "portfolio_summary": {
                "health": "N/A",
                "risk_level": "Unknown",
                "total_invested": 0,
                "total_value_live": 0,
                "total_pnl": 0,
                "win_rate": "0%",
                "insight": "No valid mutual fund data found via yfinance."
            },
            "portfolio_analysis": []
        }

    total_invested = sum(r['holding_context']['invested_value'] for r in results)
    total_value = sum(r['holding_context']['current_value'] for r in results)
    total_pnl = total_value - total_invested
    
    winners = sum(1 for r in results if r['holding_context']['current_pnl'] > 0)
    win_rate = f"{(winners / len(results) * 100):.1f}%"

    return {
        "portfolio_summary": {
            "health": "Strong" if total_pnl >= 0 else "Weak",
            "risk_level": "Medium",
            "total_invested": round(total_invested, 2),
            "total_value_live": round(total_value, 2),
            "total_pnl": round(total_pnl, 2),
            "win_rate": win_rate,
            "insight": f"Managed to track {len(results)} funds via live data.",
            "working_capital_pct": 100,
            "trapped_capital_pct": 0
        },
        "portfolio_analysis": results
    }
