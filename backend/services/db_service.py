from supabase import create_client
from .config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import asyncio
from datetime import datetime, timedelta, timezone
import re


supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def parse_et_time(time_str: str):
    if not time_str:
        return datetime.now(timezone.utc).isoformat()
    
    now = datetime.now(timezone.utc)
    t = time_str.lower()
    
    try:
        # Check relative formats first
        if "min" in t:
            m = re.search(r"(\d+)", t)
            if m: return (now - timedelta(minutes=int(m.group(1)))).isoformat()
        elif "hour" in t:
            m = re.search(r"(\d+)", t)
            if m: return (now - timedelta(hours=int(m.group(1)))).isoformat()
        elif "yesterday" in t:
            yesterday = now - timedelta(days=1)
            return yesterday.isoformat()
        elif "day" in t:
            m = re.search(r"(\d+)", t)
            if m: return (now - timedelta(days=int(m.group(1)))).isoformat()
            
        # Check for absolute format: "Mar 25, 2026, 08:00 PM IST"
        is_ist = "ist" in t
        clean = time_str.replace("Last Updated:", "").replace("Updated:", "").replace("IST", "").strip()
        clean_norm = clean.replace(",", "") # "Mar 25 2026 08:00 PM"
        
        # Format might be "%b %d %Y %I:%M %p"
        dt = datetime.strptime(clean_norm, "%b %d %Y %I:%M %p")
        
        if is_ist:
            # Add IST offset (+5:30) and convert to UTC
            ist_offset = timedelta(hours=5, minutes=30)
            aware_dt = dt.replace(tzinfo=timezone(ist_offset))
            return aware_dt.astimezone(timezone.utc).isoformat()
            
        return dt.replace(tzinfo=timezone.utc).isoformat()
    except:
        return now.isoformat()

# -------------------------------
# Insert main news row
# -------------------------------

async def insert_news(item, analysis):
    query = supabase.table("news").insert({
        "title": item["title"],
        "source": item["source"],
        "url": item["url"],
        "published_at": parse_et_time(item.get("published_at")),
        "summary": analysis["summary"],
        "sentiment": analysis["sentiment"],
        "impact_summary": " | ".join(analysis["impact_summary"]),
        "event_type": analysis.get("event_type", "other"),
        "impact_strength": analysis.get("impact_strength", 1),
        "raw_json": analysis
    })
    res = await asyncio.to_thread(query.execute)
    return res.data[0]["id"]


# -------------------------------
# Insert stock impacts
# -------------------------------

async def insert_stocks(news_id, stocks):
    rows = [
        {
            "news_id": news_id,
            "symbol": s,
            "impact": None,
            "relevance_score": None
        }
        for s in stocks
    ]

    if rows:
        query = supabase.table("news_stocks").insert(rows)
        await asyncio.to_thread(query.execute)


# -------------------------------
# Insert sector impacts
# -------------------------------

async def insert_sectors(news_id, sectors):
    rows = [
        {
            "news_id": news_id,
            "sector": s,
            "impact": None
        }
        for s in sectors
    ]

    if rows:
        query = supabase.table("news_sectors").insert(rows)
        await asyncio.to_thread(query.execute)

async def news_exists(url: str, title: str) -> bool:
    """Check if an article already exists by URL or Title."""
    try:
        # Check by URL first
        q_url = supabase.table("news").select("id").eq("url", url).limit(1)
        res_url = await asyncio.to_thread(q_url.execute)
        if res_url.data:
            return True

        # Then check by Title
        q_title = supabase.table("news").select("id").eq("title", title).limit(1)
        res_title = await asyncio.to_thread(q_title.execute)
        return bool(res_title.data)
    except Exception as e:
        print(f"Error checking news existence: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(main())