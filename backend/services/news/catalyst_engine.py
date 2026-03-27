from datetime import datetime, timedelta, timezone
from ..db_service import supabase

async def get_relevant_news(symbol: str, context: str = None, portfolio_symbols: list = []):
    """
    MODE 2: ACTIVE INTELLIGENCE
    Deterministic scoring of news catalysts for a given symbol.
    """
    # Calculate cutoff time (last 48h)
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()

    try:
        # Fetch news items related to the symbol within the last 48h
        # Join news_stocks and news tables
        res = supabase.table("news_stocks") \
            .select("news:news_id(*)") \
            .eq("symbol", symbol) \
            .execute()

        if not res.data:
            return []

        # Filter manually by date if needed (Supabase join filtering can be tricky)
        news_items = []
        for row in res.data:
            item = row.get("news")
            if item and (item.get("published_at") or item.get("created_at")) >= cutoff:
                news_items.append(item)

        if not news_items:
            return []

        # 2. Score each news item
        now = datetime.now(timezone.utc)
        scored_news = []
        for item in news_items:
            # Sentiment score
            sentiment = (item.get("sentiment") or item.get("raw_json", {}).get("sentiment") or "neutral").lower()
            sentiment_score = 1 if sentiment == "positive" else (-1 if sentiment == "negative" else 0)
            
            # Impact strength
            impact_strength = item.get("impact_strength") or item.get("raw_json", {}).get("impact_strength") or 1
            
            # Recency bonus
            try:
                # Handle potential formats
                ts = item.get("published_at") or item.get("created_at")
                # fromisoformat handles +00:00 and +05:30 correctly
                created_at = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                
                # Ensure created_at is aware
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
            except:
                created_at = now - timedelta(hours=24) # fallback
                
            hours_ago = (now - created_at).total_seconds() / 3600
            
            recency_bonus = 0
            if hours_ago < 2:
                recency_bonus = 2
            elif hours_ago < 6:
                recency_bonus = 1
                
            # Portfolio boost
            portfolio_boost = 2 if symbol in portfolio_symbols else 0
            
            # Formula: (sentiment_score * impact_strength) + recency_bonus + portfolio_boost
            score = (sentiment_score * impact_strength) + recency_bonus + portfolio_boost
            
            item["catalyst_score"] = score
            scored_news.append(item)

        # 3. Context filtering
        if context:
            ctx = context.lower()
            if "bullish" in ctx:
                scored_news = [n for n in scored_news if n.get("sentiment") == "positive"]
            elif "bearish" in ctx:
                scored_news = [n for n in scored_news if n.get("sentiment") == "negative"]

        # 4. Sort and return top 2-3
        scored_news.sort(key=lambda x: x["catalyst_score"], reverse=True)
        return scored_news[:3]

    except Exception as e:
        print(f"Error in get_relevant_news: {e}")
        return []

async def get_news_by_category(ticker: str = None, sector: str = None, limit: int = 3):
    """
    Agent tool function to fetch news for a ticker OR sector from DB.
    Sorted by published_at desc, max limit 3.
    """
    try:
        if ticker:
            ticker = ticker.upper().replace(".NS", "").replace(".BO", "")
            res = supabase.table("news_stocks") \
                .select("news:news_id(*)") \
                .eq("symbol", ticker) \
                .execute()
        elif sector:
            res = supabase.table("news_sectors") \
                .select("news:news_id(*)") \
                .ilike("sector", f"%{sector}%") \
                .execute()
        else:
            # Fallback to general news
            res = supabase.table("news").select("*").order("published_at", desc=True).limit(limit).execute()
            return res.data

        if not res.data:
            return []

        news_items = []
        for row in res.data:
            item = row.get("news")
            if item:
                news_items.append(item)
        
        # Sort by published_at desc (most recent first)
        news_items.sort(key=lambda x: (x.get("published_at") or x.get("created_at") or ""), reverse=True)
        
        return news_items[:limit]

    except Exception as e:
        print(f"Error in get_news_by_category: {e}")
        return []
