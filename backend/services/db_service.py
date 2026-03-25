from supabase import create_client
from .config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import asyncio
from datetime import datetime, timedelta
import re


supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def parse_et_time(time_str: str):
    if not time_str:
        return datetime.utcnow().isoformat()
    
    now = datetime.utcnow()
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
        clean = time_str.replace("Last Updated:", "").replace("Updated:", "").replace("IST", "").strip()
        clean_norm = clean.replace(",", "") # "Mar 25 2026 08:00 PM"
        
        # Format might be "%b %d %Y %I:%M %p"
        dt = datetime.strptime(clean_norm, "%b %d %Y %I:%M %p")
        return dt.isoformat()
    except:
        return now.isoformat()

# -------------------------------
# Insert main news row
# -------------------------------

async def insert_news(item, analysis):

    res = supabase.table("news").insert({
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
    }).execute()

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
        supabase.table("news_stocks").insert(rows).execute()


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
        supabase.table("news_sectors").insert(rows).execute()

# Simulated Pulse item
TEST_ITEM = {
    "title": "Gold prices fall despite geopolitical tensions",
    "source": "Unit Test",
    "url": "https://example.com/test"
}

# Simulated Gemini output (use your real output later)
TEST_ANALYSIS = {
    "summary": "Gold prices declined due to strong USD.",
    "sentiment": "negative",
    "impact_summary": [
        "Stronger USD pressures commodities",
        "Potential FII outflows from EMs"
    ],
    "stocks": ["TITAN", "MUTHOOTFIN"],
    "sectors": ["Consumer Discretionary", "Financial Services"]
}


async def main():

    news_id = await insert_news(TEST_ITEM, TEST_ANALYSIS)

    await insert_stocks(news_id, TEST_ANALYSIS["stocks"])
    await insert_sectors(news_id, TEST_ANALYSIS["sectors"])

    print("Inserted successfully. News ID:", news_id)

async def news_exists(url: str) -> bool:

    res = (
        supabase
        .table("news")
        .select("id")
        .eq("url", url)
        .limit(1)
        .execute()
    )

    return bool(res.data)

if __name__ == "__main__":
    asyncio.run(main())