import re
import asyncio
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin

ET_NEWS_URL = "https://economictimes.indiatimes.com/markets/stocks/news"
BASE_URL = "https://economictimes.indiatimes.com"
HEADERS = {"User-Agent": "Mozilla/5.0"}

# --------------------------------------------------
# Fetch Economic Times feed
# --------------------------------------------------

async def fetch_article_content(client: httpx.AsyncClient, url: str, title: str) -> dict:
    summary = ""
    published_at = ""

    try:
        resp = await client.get(url, timeout=15)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "lxml")

            # Clean up useless tags
            for el in soup(["script", "style", "nav", "header", "footer"]):
                el.decompose()

            # 1. Summary logic
            syn = soup.select_one("div.artSyn")
            if syn:
                summary = syn.get_text(separator=" ", strip=True)
            else:
                paras = soup.select(".artText p") or soup.find_all("p")
                for p in paras:
                    text = p.get_text(separator=" ", strip=True)
                    lw = text.lower()
                    if text and len(text) > 30 and not any(skip in lw for skip in ["download the", "click here", "read more", "subscribe"]):
                        summary = text
                        break

            # 2. Published at logic
            time_tag = soup.find("time")
            if time_tag:
                published_at = time_tag.get_text(separator=" ", strip=True)

    except Exception as e:
        print(f"Error fetching article {url}: {e}")

    return {
        "title": title,
        "url": url,
        "summary": summary,
        "published_at": published_at,
        "source": "Economic Times"
    }

async def fetch_et_articles(limit: int | None = None):
    try:
        async with httpx.AsyncClient(headers=HEADERS) as client:
            resp = await client.get(ET_NEWS_URL, timeout=30)
            resp.raise_for_status()

            soup = BeautifulSoup(resp.text, "lxml")
            
            # Find all story links
            items = soup.select("div.eachStory h3 a")
            
            tasks = []
            for item in items[:limit]:
                url = urljoin(BASE_URL, item.get("href", ""))
                title = item.get_text(strip=True)
                if url and title:
                    tasks.append(fetch_article_content(client, url, title))

            articles = await asyncio.gather(*tasks)
            return list(articles)

    except httpx.HTTPError as e:
        print(f"Network error: {e}")
        return []

def tokenize(text: str):
    """
    Extract lowercase alphanumeric words.
    """
    return set(re.findall(r"[a-z0-9]+", text.lower()))

def matches_query(article: dict, query: str):
    if not query:
        return True

    q_words = tokenize(query)

    text = f"{article['title']} {article['summary']}".lower()
    text_words = tokenize(text)

    return len(q_words & text_words) > 0

def is_recent(time_raw: str | None):
    """
    Heuristic: keep articles from roughly last 24 hours.
    Case-insensitive and regex-backed to catch:
    - 5 mins, 2 hours, YESTERDAY, 1 hour ago
    - Today's date (e.g., Mar 25, 2026)
    """
    if not time_raw:
        return False

    # 1. Matches fuzzy intervals: mins, hours, yesterday (case-insensitive)
    if re.search(r"\b(min|hour|yesterday)\b", time_raw, re.IGNORECASE):
        return True

    # 2. Strict check for "1 day" to avoid "11 days"
    if re.search(r"\b1\s+day\b", time_raw, re.IGNORECASE):
        return True

    # 3. Check for today's date in standard ET format (e.g., Mar 25, 2026)
    from datetime import datetime
    today = datetime.utcnow()
    # "Mar 25, 2026" or "Mar 25 2026"
    date_patterns = [
        today.strftime("%b %d, %Y"),
        today.strftime("%b %d %Y"),
        today.strftime("%d %b, %Y"),
        today.strftime("%d %b %Y")
    ]
    
    for p in date_patterns:
        if p.lower() in time_raw.lower():
            return True

    return False

# --------------------------------------------------
# Main service
# --------------------------------------------------

async def get_company_news(query: str):
    raw_articles = await fetch_et_articles(limit=None)

    filtered = [
        a for a in raw_articles
        if matches_query(a, query)
    ]

    return filtered

# --------------------------------------------------
# Test entry point
# --------------------------------------------------

async def main():
    query = "nifty"   # change to any company / keyword

    print(f"\nFetching recent ET news for: {query}\n")

    articles = await get_company_news(query)

    if not articles:
        print("No matching recent articles found.")
        return

    for i, a in enumerate(articles, 1):
        print(f"{i}. {a['title']}")
        print(f"   URL: {a['url']}")
        print(f"   Published: {a['published_at']}")
        print(f"   Source: {a['source']}")
        print(f"   Summary: {a['summary']}\n")


if __name__ == "__main__":
    asyncio.run(main())