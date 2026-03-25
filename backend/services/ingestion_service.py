from .pulse_news import fetch_et_articles
from .article_parser import extract_article_text
from .gemini_service import analyze_news
from .db_service import insert_news, insert_stocks, insert_sectors, news_exists


async def ingest_once(limit: int = 5, company: str | None = None):

    articles = await fetch_et_articles(limit=limit)

    if not articles:
        print("No articles fetched.")
        return

    for item in articles:
        if await news_exists(item["url"]):
            print("⏭️ Already ingested, skipping")
            continue
            
        # 🔎 Company filter
        if company:
            text = f"{item['title']} {item.get('summary','')}".lower()
            if company.lower() not in text:
                continue

        print("\nProcessing:", item["title"])

        # ------------------------
        # 1) Content selection
        # ------------------------

        content = item.get("summary")

        if not content or len(content) < 80:
            print("↪️ Using article parser fallback")
            content = extract_article_text(item["url"])

        if not content:
            print("❌ No usable content, skipping")
            continue

        # ------------------------
        # 2) Gemini analysis
        # ------------------------

        try:
            analysis = await analyze_news(item["title"], content)
        except Exception as e:
            print("❌ Gemini failed:", e)
            continue

        # ------------------------
        # 3) Save main record
        # ------------------------

        news_id = await insert_news(item, analysis)

        # ------------------------
        # 4) Related tables
        # ------------------------

        await insert_stocks(news_id, analysis["stocks"])
        await insert_sectors(news_id, analysis["sectors"])

        print("✅ Saved:", news_id)

import asyncio
# from ingestion_service import ingest_once

if __name__ == "__main__":
    asyncio.run(
        ingest_once(
            limit=25,          # scan enough items
            company="HDFC"  # 🔎 change this
        )
    )
# python -m services.ingestion_service