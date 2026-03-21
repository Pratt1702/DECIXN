import asyncio
import httpx
from bs4 import BeautifulSoup
from datetime import datetime, UTC

PULSE_URL = "https://pulse.zerodha.com/"
HEADERS = {"User-Agent": "Mozilla/5.0"}


async def fetch_pulse_articles(limit: int = 5):
    """
    Fetch normalized articles from Pulse.

    Args:
        limit: number of articles to return

    Returns:
        List[dict]
    """

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

        # Skip incomplete items
        if not h2 or not source_tag:
            continue

        link_tag = h2.find("a")
        if not link_tag or not link_tag.get("href"):
            continue

        article = {
            "title": h2.get_text(strip=True),
            "url": link_tag["href"],  # original article URL
            "source": source_tag.get_text(strip=True),
            "time_raw": time_tag.get_text(strip=True) if time_tag else None,
            "ingested_at": datetime.now(UTC).isoformat()
        }

        articles.append(article)

    return articles


# pip install httpx beautifulsoup4 lxml