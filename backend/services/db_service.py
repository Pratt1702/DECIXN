from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import asyncio


supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# -------------------------------
# Insert main news row
# -------------------------------

async def insert_news(item, analysis):

    res = supabase.table("news").insert({
        "title": item["title"],
        "source": item["source"],
        "url": item["url"],
        "published_at": None,
        "summary": analysis["summary"],
        "sentiment": analysis["sentiment"],
        "impact_summary": " | ".join(analysis["impact_summary"])
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


if __name__ == "__main__":
    asyncio.run(main())