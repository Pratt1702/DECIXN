import re
import asyncio
import httpx
from bs4 import BeautifulSoup
from datetime import datetime, UTC

PULSE_URL = "https://pulse.zerodha.com/"
HEADERS = {"User-Agent": "Mozilla/5.0"}


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

def tokenize(text: str):
    """
    Extract lowercase alphanumeric words.
    """
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def matches_query(title: str, query: str):
    title_words = tokenize(title)
    query_words = tokenize(query)

    return len(title_words & query_words) > 0


def is_recent(time_raw: str | None):
    """
    Heuristic: keep articles from roughly last 24 hours.
    """

    if not time_raw:
        return False

    t = time_raw.lower()

    # Minutes or hours → recent
    if "min" in t or "hour" in t:
        return True

    # Yesterday → recent
    if "yesterday" in t:
        return True

    # Handle "1 day ago"
    if "1 day" in t:
        return True

    return False

# --------------------------------------------------
# Main service
# --------------------------------------------------

async def get_company_news(query: str):

    raw_articles = await fetch_pulse_articles()

    filtered = [
        a for a in raw_articles
        if matches_query(a["title"], query)
        and is_recent(a["time_raw"])
    ]

    return filtered



# pip install httpx beautifulsoup4 lxml