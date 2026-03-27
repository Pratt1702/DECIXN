from datetime import datetime, timedelta
from .db_service import supabase
from .data_fetcher import fetch_ticker_metadata
import asyncio

async def get_market_opportunities(symbols: list = None):
    """
    Scans for high-conviction opportunities:
    1. High Impact News from DB.
    2. Upcoming Dividends from yfinance.
    """
    opportunities = []
    
    # 1. High Impact News (Catalyst Engine)
    try:
        # Get news from the last 72 hours with impact >= 4
        cutoff = (datetime.utcnow() - timedelta(days=3)).isoformat()
        if symbols:
            res = supabase.table("news") \
                .select("*, news_stocks!inner(symbol)") \
                .in_("news_stocks.symbol", symbols) \
                .gte("impact_strength", 4) \
                .gte("published_at", cutoff) \
                .order("impact_strength", desc=True) \
                .order("published_at", desc=True) \
                .limit(10) \
                .execute()
        else:
            res = supabase.table("news") \
                .select("*, news_stocks(symbol)") \
                .gte("impact_strength", 4) \
                .gte("published_at", cutoff) \
                .order("impact_strength", desc=True) \
                .order("published_at", desc=True) \
                .limit(10) \
                .execute()
            
        for item in res.data:
            stocks = [s["symbol"] for s in item.get("news_stocks", [])]
            opportunities.append({
                "type": "NEWS_CATALYST",
                "title": item["title"],
                "sentiment": item["sentiment"],
                "impact": item["impact_strength"],
                "stocks": stocks,
                "url": item["url"],
                "summary": item["impact_summary"],
                "published_at": item["published_at"]
            })
    except Exception as e:
        print(f"Error fetching radar news: {e}")

    # 2. Upcoming Dividends (Opportunity Radar)
    # If no symbols provided, use a default high-liquidity list (NIFTY 10)
    if not symbols:
        symbols = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "LT.NS", "HINDUNILVR.NS"]
    
    async def check_dividend(sym):
        try:
            meta = await asyncio.to_thread(fetch_ticker_metadata, sym)
            cal = meta.get("calendar", {})
            ex_date = cal.get("Ex-Dividend Date")
            
            if ex_date:
                # ex_date is often a date object or a string
                if isinstance(ex_date, str):
                    try:
                        ex_date = datetime.strptime(ex_date, "%Y-%m-%d").date()
                    except:
                        return None
                
                today = datetime.now().date()
                diff = (ex_date - today).days
                
                # Highlight if ex-date is within next 14 days
                if 0 <= diff <= 14:
                    return {
                        "type": "DIVIDEND_EVENT",
                        "symbol": sym.replace(".NS", ""),
                        "ex_date": ex_date.isoformat(),
                        "days_to_go": diff,
                        "yield": meta.get("info", {}).get("dividendYield", 0) * 100,
                        "amount": meta.get("info", {}).get("dividendRate", 0),
                        "priority": "HIGH" if diff <= 3 else "MEDIUM"
                    }
        except:
            pass
        return None

    div_tasks = [check_dividend(s) for s in symbols[:20]] # Limit to 20 for performance
    div_results = await asyncio.gather(*div_tasks)
    
    for r in div_results:
        if r:
            opportunities.append(r)

    # 3. Alpha Signals (Insiders & Filings)
    from .alpha_signals import alpha_service
    # If no symbols, use NIFTY 10
    if not symbols:
        symbols = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "LT.NS", "HINDUNILVR.NS"]
    
    for sym in symbols[:15]:
        sym_clean = sym.replace(".NS", "").replace(".BO", "")
        insider = alpha_service.get_insider_trades(sym_clean)
        if insider.get("success"):
            opportunities.append({
                "type": "INSIDER_ALPHA",
                "symbol": sym_clean,
                "title": insider["signal"],
                "details": insider["details"],
                "impact": "POSITIVE" if insider["sentiment_score"] > 0 else "NEGATIVE",
                "priority": "HIGH"
            })
        
        filing = alpha_service.get_corporate_filings(sym_clean)
        if filing.get("success") and filing.get("signals"):
            for sig in filing["signals"]:
                opportunities.append({
                    "type": "CORPORATE_ALPHA",
                    "symbol": sym_clean,
                    "title": sig["title"],
                    "details": sig["summary"],
                    "impact": "POSITIVE" if sig["relevance"] == "High" else "NEUTRAL",
                    "priority": "HIGH" if sig["relevance"] == "High" else "MEDIUM"
                })

    # Sort opportunities: High priority/impact first
    # (Custom sorting logic can be added here)
    
    return opportunities
