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
        res = supabase.table("news") \
            .select("*, news_stocks(symbol)") \
            .gte("impact_strength", 4) \
            .gte("published_at", cutoff) \
            .order("published_at", desc=True) \
            .limit(5) \
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

    # Sort opportunities: Dividends soon first, then high impact news
    # (Custom sorting logic can be added here)
    
    return opportunities
