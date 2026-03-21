"""
Commit 3 — Company-aware Pulse ingestion.

Adds:
- Company alias resolution
- Relevance filtering
- CLI query input
"""

import asyncio
import httpx
from bs4 import BeautifulSoup
from datetime import datetime, UTC

PULSE_URL = "https://pulse.zerodha.com/"
HEADERS = {"User-Agent": "Mozilla/5.0"}


# --------------------------------------------------
# Company aliases (minimal starter set)
# --------------------------------------------------

COMPANY_ALIASES = {
    "SBIN": ["sbi", "state bank of india", "state bank"],
    "TCS": ["tcs", "tata consultancy services"],
    "RELIANCE": ["reliance", "ril", "reliance industries"],
    "INFY": ["infosys", "infy"],
    "HDFCBANK": ["hdfc", "hdfc bank"],
}


def resolve_symbol(user_input: str):
    text = user_input.lower()

    for symbol, aliases in COMPANY_ALIASES.items():
        if any(alias in text for alias in aliases):
            return symbol

    return None


def is_relevant(title: str, aliases):
    t = title.lower()
    return any(alias in t for alias in aliases)


# --------------------------------------------------
# Fetch Pulse feed
# --------------------------------------------------

async def fetch_pulse_articles(limit: int = 100):

    try:
        async with httpx.AsyncClient(headers=HEADERS) as client:
            resp = await client.get(PULSE_URL, timeout=30)
            resp.raise_for_status()

    except httpx.HTTPError as e:
        print(f"Network error: {e}")
        return []

    soup = BeautifulSoup(resp.text, "lxml")

    articles = []

    for item in soup.select("li.box")[:limit]:

        h2 = item.select_one("h2")
        source_tag = item.select_one(".feed")
        time_tag = item.select_one(".date")

        if not h2 or not source_tag:
            continue

        link_tag = h2.find("a")
        if not link_tag or not link_tag.get("href"):
            continue

        articles.append({
            "title": h2.get_text(strip=True),
            "url": link_tag["href"],
            "source": source_tag.get_text(strip=True),
            "time_raw": time_tag.get_text(strip=True) if time_tag else None,
            "ingested_at": datetime.now(UTC).isoformat()
        })

    return articles

def matches_query(title: str, query: str):
    title = title.lower()
    query = query.lower().strip()

    # Remove common punctuation
    for ch in "-_,.":
        title = title.replace(ch, " ")
        query = query.replace(ch, " ")

    title_words = set(title.split())
    query_words = set(query.split())

    return len(title_words & query_words) > 0

# --------------------------------------------------
# Main service
# --------------------------------------------------

async def get_company_news(query: str):

    raw_articles = await fetch_pulse_articles()

    filtered = [
        a for a in raw_articles
        if matches_query(a["title"], query)
    ]

    return filtered


# --------------------------------------------------
# CLI ENTRY POINT
# --------------------------------------------------

async def main():
    company = input("Enter company/stock name: ")

    results = await get_company_news(company)

    if not results:
        print("No relevant articles found.")
        return

    print(f"\nFound {len(results)} relevant articles:\n")

    for i, a in enumerate(results, 1):
        print(f"{i}. {a['title']}")
        print(f"   Source: {a['source']}")
        print(f"   Time:   {a['time_raw']}")
        print(f"   URL:    {a['url']}\n")


if __name__ == "__main__":
    asyncio.run(main())
# pip install httpx beautifulsoup4 lxml