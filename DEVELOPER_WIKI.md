# 🛠️ DECIXN - Developer Wiki (Technical Architecture)

Welcome to the **DECIXN** Technical Wiki. This document provides a deep-dive into the platform's architecture, logic engines, and data orchestration.

---

## 📂 Repository Structure

The project is divided into a **FastAPI backend** and a **React/Vite frontend**.

### **Backend (`/backend`)**
*   `main.py`: Entry point, API routing, and Rate Limiting (10 msgs / 30 mins).
*   `market_intelligence.py`: High-level orchestration for single-ticker analysis, portfolio holdings, and market overview. Contains the 15-minute overview cache.
*   `portfolio_logic.py`: Algorithms for win-rate, total P&L, and **Working vs. Trapped Capital** segmentation.
*   `services/`:
    *   `chat_service.py`: Foxy v1 (Gemini 2.5 Flash) orchestration with tool-calling capabilities.
    *   `decision_engine.py`: The core "AI" logic. Implements normalized confluence scoring and deterministic pattern recognition.
    *   `technical_indicators.py`: TA-Lib style calculations (RSI, MACD, SMA/EMA, ATR).
    *   `signal_generator.py`: Converts raw indicators into primary Bullish/Bearish signals.
    *   `data_fetcher.py`: Standardized wrapper for `yfinance` with period handling.
    *   `pulse_news.py`: News scraping and Gemini-based sentiment analysis.
    *   `supabase_client.py`: Auth and persistence integration.

### **Frontend (`/frontend`)**
*   `src/store/`: Zustand state management (`useAuthStore`, `usePortfolioStore`, `useWatchlistStore`, `useExploreStore`).
*   `src/services/api.ts`: Centralized Axios client with a 5-minute local cache for portfolio data.
*   `src/pages/`: Page components (Holdings, Explore, Chat, StockDetails, etc.).
*   `src/components/`: Reusable UI elements, Layouts, and Dashboard widgets.

---

## 🧠 Technical Logic Engines

### 1. **Decision Engine (The Brain)**
The decision engine uses a **Normalized Confluence Score (0-100)** to determine ratings.
*   **Base Score**: 45.
*   **Boosters**:
    *   **Breakout Strength**: Up to +40 points (normalized to 3% move threshold).
    *   **Volume Ratio**: Up to +20 points (normalized to 2.0x volume spike).
    *   **Trend Proximity**: +20 points for "Buy the Dip" setups near the 20-day SMA.
    *   **RSI Oversold**: +15 points if RSI < 30 in a bullish structure.
*   **Penalty Factors**:
    *   **Overbought**: -15 points if RSI > 70.
    *   **Structural Breakdown**: -10 points if price is >8% below 20-day SMA.
    *   **Momentum Loss**: -10 points for MACD bearish crossovers.

### 2. **Portfolio Health Algorithm**
Categorizes capital based on trend alignment:
*   **Working Capital**: Total value of holdings where the Trend is 'Bullish'.
*   **Trapped Capital**: Total value of holdings where the Trend is 'Bearish'.
*   **Status Logic**:
    *   **STRONG**: Win rate > 50% and positive aggregate P&L.
    *   **FAIR**: Negative P&L but < 30% "Cut Loss" alerts.
    *   **WEAK**: Win rate < 50% or > 30% of holdings marked as "REDUCE / EXIT".

---

## 🔄 Core Data Workflows

### **CSV Ingestion Workflow**
1.  **Frontend**: User uploads CSV (Zerodha Kite format).
2.  **API**: Client calls `POST /analyze/portfolio` with raw holding data.
3.  **Backend**: `run_portfolio_analysis` spawns `ThreadPoolExecutor(max_workers=10)` to analyze each holding in parallel.
4.  **Enrichment**: Each ticker is fetched via `yfinance`, passed through `calculate_indicators` -> `generate_signals` -> `make_holding_decision`.
5.  **Output**: Aggregated JSON containing health metrics and individual actionable insights.

### **Foxy v1 (AI Assistant) Pipeline**
1.  **Request**: User sends message + (Optional) Portfolio Context.
2.  **Model**: Gemini 2.5 Flash evaluates the prompt.
3.  **Tool Call**: Model may call `analyze_ticker(symbol)` or `get_user_position(symbol)`.
4.  **Execution**: `ChatEngine` executes the corresponding Python function locally.
5.  **Streaming**: Final narrative + metadata (charts, summaries) is streamed back via nd-json.

---

## 📡 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/analyze/{ticker}` | GET | Full technical & fundamental deep-dive for a symbol. |
| `/analyze/portfolio` | GET/POST | Processes holdings (CSV or JSON) and returns health audit. |
| `/market/overview` | GET | Fetches Nifty, Sensex, and Gainers/Losers (15m cache). |
| `/quotes/batch` | POST | Efficient lightweight retrieval for Watchlists (inc. sparklines). |
| `/search/{query}` | GET | Real-time Indian equity symbols autocomplete. |
| `/chat` | POST | Streaming endpoint for Foxy v1 Assistant. |
| `/chat/history/{id}` | GET | Retrieve user-specific session history. |

---

## 🛠️ Setup & Environment

**Backend (.env)**:
*   `GEMINI_API_KEY`: Required for Foxy v1 and News Sentiment.
*   `SUPABASE_URL` / `SUPABASE_KEY`: Required for Auth and Chat history.

**Frontend (.env/config)**:
*   `VITE_API_BASE_URL`: Defaults to `http://localhost:8000`.
*   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

---

## 🧪 Technical Quality Standards
*   **Numerical Safety**: `sanitize_data()` recursively cleans all API responses to handle `NaN` and `Inf` values common in financial datasets.
*   **Concurrency**: Uses `ThreadPoolExecutor` for batch processing to minimize wait times during portfolio loads.
*   **Sustainability**: Implements a `RateLimiter` class to prevent API key exhaustion while maintaining a generous free tier (10 msgs / 30 mins).
