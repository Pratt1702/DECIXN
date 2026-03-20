# ET Markets GenAI - Development TODO

## 1. Scraping Service (Python)
- [ ] **Research Zerodha Pulse Selectors**: Inspect `https://pulse.zerodha.com/` to find CSS/XPath for article links.
- [ ] **Init Project**: Create `requirements.txt` with `trafilatura`, `sumy`, `requests`, `sqlalchemy`.
- [ ] **URL Discovery**: Write script to parse the main feed and extract article URLs + headlines.
- [ ] **Content Extraction**: Implement `body_extractor` using `trafilatura` to strip boilerplate/ads.
- [ ] **LSA Summarization**: Configure `sumy` LsaSummarizer to reduce body text to 3-5 key sentences.
- [ ] **DB Setup**: Create a SQLite `raw_news` table to track scraped articles and prevent re-processing.
- [ ] **Cron Integration**: Use `APScheduler` inside a Docker container (or local script) to trigger every 120 mins.
- [ ] **Health Check**: Add a simple logger to track success/failure rates of extraction per run.

## 2. Model/AI Service (Python FastAPI)
- [ ] **FastAPI Boilerplate**: Set up `main.py` and environment variable management for `GEMINI_API_KEY`.
- [ ] **Gemini Integration**: Implement a client class using `google-generativeai` library.
- [ ] **Structured Prompting**: Craft a prompt that forces Gemini 1.5 Flash to return *only* valid JSON.
  - *Fields: sentiment (String), impact_score (Int 1-10), affected_tickers (List), why_it_matters (String).*
- [ ] **Tickers/Sectors Mapping**: Implement a lookup or LLM-based extraction for NSE stock symbols.
- [ ] **Processing Pipeline**: Create an internal queue to process `raw_news` into `processed_news`.
- [ ] **API Endpoint**: `POST /process` – takes summary text, returns the enriched JSON object.
- [ ] **Result Persistence**: Store processed JSON in a `news_intelligence` table for frontend retrieval.

## 3. Backend/API Gateway (FastAPI)
- [ ] **Watchlist CRUD**: Add `GET /watchlist`, `POST /watchlist/{ticker}`, `DELETE /watchlist/{ticker}` endpoints.
- [ ] **"Ask Why?" Logic**: Implement an endpoint that aggregates:
  - Latest news for ticker + Technical Signals (RSI/MA) + Gemini reasoning.
- [ ] **Portfolio-Aware News**: Optimize `/news` endpoint to filter by `holdings_kite.csv` symbols by default.
- [ ] **Agent Orchestration**: Build a simple router that decides if a user query needs `yfinance` or `news` data.
- [ ] **Prompt Context Assembly**: Script to inject P&L and technical signals into the AI Chat prompt.
- [ ] **CORS/Security**: Ensure frontend Vite dev server can securely hit the Backend and Model services.

## 4. Frontend (React + TS + Vite)
- [ ] **Watchlist Management**: Build a side-panel or page to manually type and add NSE tickers.
- [ ] **Smart News Feed**: Create a component to render news cards with color-coded sentiment badges.
- [ ] **"Ask Why?" Button**: Add a primary button next to signals in `StockDetails.tsx`.
- [ ] **Intelligence Sidebar**: Implement a drawer component that opens when "Ask Why?" is clicked.
- [ ] **Chat UI**: Design a conversational interface with `ChatBubble` and `Markdown` support for AI responses.
- [ ] **Vite Proxy Config**: Update `vite.config.ts` to proxy requests to different microservices.
- [ ] **Data Hooking**: Update `api.ts` to include fetchers for the new Watchlist and News intelligence endpoints.
- [ ] **Refine "Nudges"**: Link existing Nudges to the news sentiment for "Positive Momentum" alerts.

## 5. Integration & Testing
- [ ] **E2E Flow Test**: Scrape a sample article -> Process via Gemini -> View in Frontend dashboard.
- [ ] **NSE Symbol Validation**: Verify that "affected_tickers" from Gemini match actual NSE symbols.
- [ ] **Performance Audit**: Check latency of Gemini processing to ensure the "Ask Why?" button isn't too slow.
