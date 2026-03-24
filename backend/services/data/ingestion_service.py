from .pulse_news import fetch_pulse_articles
from .article_parser import extract_article_text
from .db_service import insert_news, insert_stocks, insert_sectors
from ..intelligence.gemini_service import analyze_news


async def ingest_once(limit: int = 5):

    articles = await fetch_pulse_articles(limit=limit)

    if not articles:
        print("No articles fetched.")
        return

    for item in articles:

        print("\nProcessing:", item["title"])

        # ------------------------
        # 1) Parse article content
        # ------------------------

        content = extract_article_text(item["url"])

        if not content:
            print("❌ Parsing failed")
            continue

        # ------------------------
        # 2) Gemini analysis
        # ------------------------

        try:
            analysis = await analyze_news(
                item["title"],
                content
            )
        except Exception as e:
            print("❌ Gemini failed:", e)
            continue

        # ------------------------
        # 3) Save main news record
        # ------------------------

        news_id = await insert_news(item, analysis)

        # ------------------------
        # 4) Save related tables
        # ------------------------

        await insert_stocks(news_id, analysis["stocks"])
        await insert_sectors(news_id, analysis["sectors"])

        print("✅ Saved:", news_id)

import asyncio
# from ingestion_service import ingest_once

if __name__ == "__main__":
    asyncio.run(ingest_once(limit=25))