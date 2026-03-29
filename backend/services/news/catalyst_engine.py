import asyncio
from datetime import datetime, timedelta, timezone
from ..db_service import supabase

async def get_relevant_news(symbol: str, context: str = None, portfolio_symbols: list = []):
    """
    MODE 2: ACTIVE INTELLIGENCE
    Deterministic scoring of news catalysts for a given symbol.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()

    try:
        # Fetch news items related to the symbol (Offload blocking Supabase call)
        query = supabase.table("news_stocks").select("news:news_id(*)").eq("symbol", symbol)
        res = await asyncio.to_thread(query.execute)

        if not res.data:
            return []

        scored_news = []
        now = datetime.now(timezone.utc)
        for row in res.data:
            item = row.get("news")
            if not item: continue
            
            pub_at = item.get("published_at") or item.get("created_at")
            if pub_at < cutoff: continue

            # Sentiment score
            sentiment = (item.get("sentiment") or (item.get("raw_json") or {}).get("sentiment") or "neutral").lower()
            sentiment_score = 1 if sentiment == "positive" else (-1 if sentiment == "negative" else 0)
            impact_strength = item.get("impact_strength") or (item.get("raw_json") or {}).get("impact_strength") or 1
            
            try:
                created_at = datetime.fromisoformat((item.get("published_at") or item.get("created_at")).replace("Z", "+00:00"))
                if created_at.tzinfo is None: created_at = created_at.replace(tzinfo=timezone.utc)
            except:
                created_at = now - timedelta(hours=24)
                
            hours_ago = (now - created_at).total_seconds() / 3600
            recency_bonus = 2 if hours_ago < 2 else (1 if hours_ago < 6 else 0)
            portfolio_boost = 2 if symbol in portfolio_symbols else 0
            
            item["catalyst_score"] = (sentiment_score * impact_strength) + recency_bonus + portfolio_boost
            scored_news.append(item)

        scored_news.sort(key=lambda x: x["catalyst_score"], reverse=True)
        return scored_news[:3]

    except Exception as e:
        print(f"Error in get_relevant_news: {e}")
        return []

async def get_news_by_category(ticker: str = None, sector: str = None, limit: int = 3):
    """
    Agent tool function to fetch news for a ticker OR sector from DB.
    Offloaded to threads to prevent blocking.
    """
    try:
        if ticker:
            ticker = ticker.upper().replace(".NS", "").replace(".BO", "")
            query = supabase.table("news_stocks").select("news:news_id(*)").eq("symbol", ticker)
        elif sector:
            query = supabase.table("news_sectors").select("news:news_id(*)").ilike("sector", f"%{sector}%")
        else:
            query = supabase.table("news").select("*").order("published_at", desc=True).limit(limit)

        res = await asyncio.to_thread(query.execute)

        if not res.data:
            return []

        news_items = []
        for row in res.data:
            item = row.get("news") if (ticker or sector) else row
            if item: news_items.append(item)
        
        news_items.sort(key=lambda x: (x.get("published_at") or x.get("created_at") or ""), reverse=True)
        return news_items[:limit]

    except Exception as e:
        print(f"Error in get_news_by_category: {e}")
        return []

