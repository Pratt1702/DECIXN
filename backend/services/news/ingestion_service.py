from .pulse_news import fetch_et_articles, is_recent
from .article_parser import extract_article_text
from ..gemini_service import analyze_news
from ..db_service import insert_news, insert_stocks, insert_sectors, news_exists


async def ingest_once(limit: int = 15, company: str | None = None):

    articles = await fetch_et_articles(limit=limit)

    if not articles:
        print("No articles fetched.")
        return

    success_count = 0
    max_success = 5

    for item in articles:
        if success_count >= max_success:
            print(f"🛑 Reached limit of {max_success} successes. Stopping.")
            break

        if await news_exists(item["url"]):
            print("⏭️ Already ingested, skipping")
            continue
            
        if not is_recent(item.get("published_at")):
            print("⏭️ Too old, skipping")
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

        try:
            news_id = await insert_news(item, analysis)
        except Exception as e:
            print("❌ DB Insert failed:", e)
            continue

        # ------------------------
        # 4) Related tables
        # ------------------------

        await insert_stocks(news_id, analysis["stocks"])
        await insert_sectors(news_id, analysis["sectors"])

        print("✅ Saved:", news_id)
        success_count += 1

import asyncio
# from ingestion_service import ingest_once

if __name__ == "__main__":
    asyncio.run(
        ingest_once(
            limit=15,
            company=None
        )
    )
# python -m services.ingestion_service