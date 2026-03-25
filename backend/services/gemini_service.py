from google import genai
from .config import GEMINI_API_KEY
import json

client = genai.Client(api_key=GEMINI_API_KEY)


async def analyze_news(title: str, content: str):

    prompt = f"""
Analyze this Indian stock market news.

TITLE: {title}

CONTENT:
{content}

Extract:
Affected stocks (NSE tickers if possible)
Sectors
Sentiment (positive / negative / neutral)
Short impact summary (1-2 lines, actionable)

EVENT CLASSIFICATION:
Classify the event as one of: earnings | deal | macro | regulation | other
- earnings: Quarterly results, profit/loss news
- deal: M&A, partnerships, contract wins
- macro: Interest rates, inflation, GDP, global trends
- regulation: SEBI/RBI/Govt policy changes
- other: Management changes, lawsuits, miscellaneous

IMPACT STRENGTH:
Judge the market-moving potential on a scale of 1-5:
1 = low relevance
5 = major market-moving news

Leave stocks/sectors empty if nothing relevant

Return ONLY valid JSON. No markdown. No explanation.

{{
  "summary": "...",
  "sentiment": "positive|negative|neutral",
  "impact_summary": [](Array of strings/sentences, technical + narrative, max 3),
  "stocks": [] (Correct ticker symbols only, no company names),
  "sectors": [] (Correct sector names yfinance convention, no company names, include only if it really impacts sector-wide),
  "event_type": "earnings|deal|macro|regulation|other",
  "impact_strength": 1-5
}}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    raw = ""

    try:
        raw = response.text
    except:
        pass

    if not raw:
        try:
            raw = response.candidates[0].content.parts[0].text
        except Exception as e:
            raise ValueError(f"Gemini response parse failed: {e}")

    print("\nRAW RESPONSE:\n", raw)

    # Remove markdown fences and extract pure JSON

    raw = raw.strip()

    # Extract JSON object from anywhere in the string
    start = raw.find("{")
    end = raw.rfind("}") + 1

    if start == -1 or end == 0:
        raise ValueError("No JSON object found in Gemini output")

    raw = raw[start:end]

    return json.loads(raw)

if __name__ == "__main__":
    import asyncio

    TEST_TITLE = "Gold prices fall despite geopolitical tensions"

    TEST_CONTENT = """
    Gold prices declined as a stronger US dollar
    and rising Treasury yields weakened safe-haven demand.
    """

    async def test():
        result = await analyze_news(TEST_TITLE, TEST_CONTENT)
        print("\n=== GEMINI OUTPUT ===\n")
        print(result)

    asyncio.run(test())