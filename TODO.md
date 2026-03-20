# ET Markets GenAI - Development TODO

## 1. Scraping Service (Python)

- [x] **Research Zerodha Pulse Selectors**: Inspect `https://pulse.zerodha.com/` to find CSS/XPath for article links.
- [ ] **Init Project**: Create `requirements.txt` with `trafilatura`, `sumy`, `requests`, `sqlalchemy`.
- [ ] **URL Discovery**: Write script to parse the main feed and extract article URLs + headlines.
- [ ] **Content Extraction**: Implement `body_extractor` using `trafilatura` to strip boilerplate/ads.
- [ ] **LSA Summarization**: Configure `sumy` LsaSummarizer to reduce body text to 3-5 key sentences.
- [ ] **Supabase Setup**: Create a new Supabase project and define `raw_news` table schema via SQL Editor.
- [ ] **DB Client**: Install `supabase-py` and configure environment variables for `SUPABASE_URL` and `SUPABASE_KEY`.
- [ ] **Persistence Layer**: Implement logic to upsert articles into Supabase, using URLs as unique keys to prevent duplicates.
- [ ] **Health Check**: Add a simple logger to track success/failure rates of extraction per run.

## 2. Model/AI Service (The AI Agent Hub)

- [ ] **FastAPI Agent Server**: Setup the core server to handle conversational `/chat` requests.
- [ ] **Gemini Function Calling**: Configure Gemini 1.5 Flash to support native Function Calling for tool selection.
- [ ] **Tool: `search_pulse_news`**: Build a tool that performs keyword or semantic search on the Supabase `raw_news` table.
- [ ] **Ticker Domain Logic**: Implement a "Ticker Resolver" that maps common stock names to NSE symbols (e.g., "Reliance" -> "RELIANCE.NS").
- [ ] **Impact Analysis Flow**: Create a multi-step logic where the agent fetches news, then calls Gemini again to assess _Impact Score_ and _Sentiment_.
- [ ] **Result Persistence**: Store processed impact results in a Supabase `news_intelligence` table.
- [ ] **Streaming Responses**: Implement Server-Sent Events (SSE) for real-time AI response streaming in the frontend.

## 3. Backend/API Gateway (FastAPI)

- [ ] **Watchlist CRUD**: Add `GET /watchlist`, `POST /watchlist/{ticker}`, `DELETE /watchlist/{ticker}` endpoints.
- [ ] **Data Export for Agent**: Create secure internal endpoints for the Model Service to fetch `Portfolio` and `Market Indicator` data.
- [ ] **News Retrieval API**: Build an endpoint that serves latest `processed_news` from the DB to the frontend.
- [ ] **"Ask Why?" Integration**: Create an endpoint that forwards "Why" requests to the Model Service Agent.
- [ ] **CORS/Security**: Ensure all services can communicate securely over the internal network.

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
