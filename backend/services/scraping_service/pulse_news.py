# pulse_news.py

"""
Basic Pulse ingestion.
Fetches the Zerodha Pulse homepage and extracts a few articles.
"""

import httpx
from bs4 import BeautifulSoup

PULSE_URL = "https://pulse.zerodha.com/"
HEADERS = {"User-Agent": "Mozilla/5.0"}


async def fetch_pulse_articles(limit: int = 5):
    """
    Fetch a small number of articles from Pulse.

    Returns:
        List[dict] with title, url, source, time
    """

    async with httpx.AsyncClient(headers=HEADERS) as client:
        resp = await client.get(PULSE_URL, timeout=30)

    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")

    articles = []

    for item in soup.select("li.box")[:limit]:

        h2 = item.select_one("h2")
        source_tag = item.select_one(".feed")
        time_tag = item.select_one(".date")

        if not h2 or not source_tag:
            continue

        title = h2.get_text(strip=True)
        url = h2.find("a")["href"]  # original article link
        source = source_tag.get_text(strip=True)
        time_text = time_tag.get_text(strip=True) if time_tag else None

        articles.append({
            "title": title,
            "url": url,
            "source": source,
            "time": time_text
        })

    return articles
# pip install httpx beautifulsoup4 lxml