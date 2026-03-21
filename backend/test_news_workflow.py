import asyncio
import os
import sys

# Ensure services and its relative imports work
sys.path.append(os.path.join(os.path.dirname(__file__), 'services'))

from services.pulse_news import get_company_news
from services.article_parser import extract_article_text
from services.gemini_service import analyze_news

async def test_news_workflow(query="Reliance"):
    print(f"\n[STEP 1] Fetching articles for '{query}' using pulse_news.py...")
    # Get direct raw articles to debug filtering
    from services.pulse_news import fetch_pulse_articles, matches_query, is_recent
    raw_articles = await fetch_pulse_articles()
    
    print(f"    Raw articles fetched: {len(raw_articles)}")
    
    filtered = []
    skipped_recent = 0
    skipped_query = 0
    
    for a in raw_articles:
        if not matches_query(a["title"], query):
            skipped_query += 1
            continue
        if not is_recent(a["time_raw"]):
            skipped_recent += 1
            continue
        filtered += [a]

    print(f"    Skipped (not recent): {skipped_recent}")
    print(f"    Skipped (no query match): {skipped_query}")
    
    if not filtered:
        print("[X] ERROR: No matching/recent articles found.")
        if raw_articles:
            print(f"    Sample article title: '{raw_articles[0]['title']}' - Time: '{raw_articles[0]['time_raw']}'")
        return

    print(f"[✓] Found {len(filtered)} matching articles. Picking the most recent one.")
    article = filtered[0]
    print(f"    TITLE: {article['title']}")
    print(f"    SOURCE: {article['source']}")
    print(f"    TIME: {article['time_raw']}")
    print(f"    URL: {article['url']}")

    print(f"\n[STEP 2] Extracting text from article page using article_parser.py...")
    text = extract_article_text(article['url'])
    if not text:
        print("[X] ERROR: Could not extract content from URL. Site might have protections or trap/scraper blocker.")
        return

    print(f"[✓] Extracted text ({len(text)} chars):\n{text[:200]}...")

    print(f"\n[STEP 3] Sending to Gemini for analysis (may take a few seconds)...")
    try:
        # Check if API key is set
        from services.config import GEMINI_API_KEY
        if not GEMINI_API_KEY:
            print("[!] WARNING: GEMINI_API_KEY is not set. This step will likely fail.")
        
        result = await analyze_news(article['title'], text)
        print("\n[✓] FULL WORKFLOW COMPLETE. SUCCESSFULLY RECEIVED JSON:")
        import json
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"[X] GEMINI ERROR: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        q = sys.argv[1]
    else:
        q = "Reliance"
    asyncio.run(test_news_workflow(q))
