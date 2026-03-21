from bs4 import BeautifulSoup
import trafilatura

def extract_with_synopsis(url):
    downloaded = trafilatura.fetch_url(url)

    text = trafilatura.extract(downloaded)

    soup = BeautifulSoup(downloaded, "lxml")

    synopsis_tag = soup.select_one(".synopsis, .artSyn, div.Synopsis")

    synopsis = synopsis_tag.get_text(" ", strip=True)

    if synopsis.lower().startswith("synopsis"):
        synopsis = synopsis[len("synopsis"):].strip()

    combined = synopsis + "\n\n" + (text or "")

    paragraphs = [
        p.strip()
        for p in combined.split("\n")
        if len(p.strip()) > 80
    ]

    return "\n\n".join(paragraphs[:3])



