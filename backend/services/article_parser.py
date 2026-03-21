# services/article_parser.py

import trafilatura
from bs4 import BeautifulSoup


def extract_article_text(url: str) -> str | None:

    downloaded = trafilatura.fetch_url(url)
    if not downloaded:
        return None

    body = trafilatura.extract(downloaded)
    if not body:
        return None

    soup = BeautifulSoup(downloaded, "lxml")

    synopsis_tag = soup.select_one(".synopsis, .artSyn, div.Synopsis")

    synopsis = ""
    if synopsis_tag:
        synopsis = synopsis_tag.get_text(" ", strip=True)

        if synopsis.lower().startswith("synopsis"):
            synopsis = synopsis[len("synopsis"):].strip()

    combined = (synopsis + "\n\n" + body).strip()

    paragraphs = [
        p.strip()
        for p in combined.split("\n")
        if len(p.strip()) > 80
    ]

    return "\n\n".join(paragraphs[:3])