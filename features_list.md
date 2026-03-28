# DECIXN | Full Capability Matrix (Extended)
> **Engineering Depth & Feature Catalog for Hackathon Submission**

---

## 🧠 1. Agentic AI & "Foxy" Co-Pilot (System Brain)
*   **Stateful Reasoning**: Metadata-driven "Chain of Thought" rendering for full transparency in decision-making.
*   **Parallel Tool Execution**: Async dispatch of multiple tools (Market, Portfolio, News) in a single turn.
*   **Contextual @Mentions**: Heuristic parsing of `@portfolio`, `@watchlist`, and `@stock` triggers within the chat interface.
*   **Citational Narrative**: Automated `[Source](URL)` mapping with confidence scores and sentiment weighting.
*   **Reasoning Transparency**: Full "Reasoning Steps" log available in response metadata for technical auditing.
*   **Rate Limiting & Safety**: Session-based message throttling with real-time "msgs left" UI counters.
*   **Rich Media Support**: Dynamic rendering of interactive TradingView charts, graphs, and citations in chat.
*   **Threaded Memory**: Recursive context injection via `Session IDs` for high-fidelity multi-turn conversations.

---

## 📊 2. Deep Stock Intelligence Engine (Quant Layer)
*   **Multi-Period MA Matrix**: Simultaneous tracking of **10, 20, 50, 100, and 200 SMA & EMA** cross-overs with trend-strength scoring.
*   **Indicator Conflict Resolution**: Proprietary heuristic logic to resolve Bullish MACD vs Bearish RSI into a single "Weighted Verdict".
*   **Dynamic Pivot Analysis**: Automated calculation of **R3/R1 & S1/S3** resistance/support zones for every ticker.
*   **Volatility Forecaster**: ATR-weighted predictive model calculating **"Tomorrow's Range"** bands (`forecast.py`).
*   **Alpha Signal Scraper**: Live primary-source scrapers for NSE Insider Trades, Promoter filings, and Bulk/Block trades.
*   **Signal Granularity**: Advanced detection of **MACD Turning Bullish/Bearish**, **RSI Divergence**, **Trend Days**, and **Breakout Strength**.
*   **Smart Multi-Exchange Fallback**: Automatic cycle through `.NS`, `.BO`, and raw tickers to find valid liquid data across NSE and BSE.
*   **Symbol Mapping**: Local heuristic mapping for variations in Indian tickers (e.g., `LNT -> LT`, `TATA MOTORS -> TMPV`).

---

## 🏦 3. Mutual Fund & Goal Ecosystem (Fund Insights)
*   **Scheme Reconciliation**: Automated mapping of ISIN variants (Growth, Payout, Div) to master scheme codes for portfolio sync.
*   **Risk Coefficient Analytics**: Calculation of **Alpha, Beta, and Sharpe ratios** dynamically based on user tenure vs category benchmarks.
*   **Tenure Analysis**: Impact analysis of holding periods on exit loads, fees, and historical P&L trackers.
*   **Goal Tracking**: Target-based portfolio allocation insights (Retirement, Capital building, or milestone goals).
*   **Integrated Search**: High-speed global fund lookup with category, AMC, and risk-profile filtering.

---

## 📂 4. Portfolio Operations & Privacy (Asset Layer)
*   **Privacy-First Architecture**: Financial data is ephemeral context for agents; cloud stores only non-PII metadata/session IDs.
*   **Smart CSV Parser**: Regex-driven heuristic field mapping for Zerodha, Groww, and Upstox exports without hardcoded templates.
*   **Hybrid Sync Logic**: Seamless "promotion" of local holdings to secure cloud storage (Supabase) upon authentication.
*   **Holding Urgency Scoring**: Calculates how "Critical" a portfolio action is based on Risk Tag and technical severity.
*   **Fallback Price Logic**: Uses estimated P&L-based pricing if live market data is temporarily unavailable.
*   **Real-time Alerts**: In-app Toast notifications for price, volume, and sentiment-based triggers.
*   **Multi-Watchlist Management**: Track unlimited stock lists with custom tags and AI-summarized daily shift reports.

---

## 🏗️ 5. Data & Infrastructure (Platform Core)
*   **FastAPI Middleware**: High-performance, async Python backend serving the market intelligence engine.
*   **Market Status Intel**: Heuristic check for IST trading hours (9 AM - 4 PM) to label data as "Today" or "Last Trading Day".
*   **Data Sanitization Middleware**: Robust handling of `NaN`, `Inf`, and complex types for high-reliability API responses.
*   **Hybrid News Synthesis**: Correlating ET News with sentiment scores and technical breakout alerts.
*   **Visceral UI**: Ultra-premium UI execution using Vite + Framer Motion + GSAP for liquid transitions and premium typography.

---

## 🚀 6. Future Roadmap (Hackathon Vision)
*   **Auto-Rebalancing Engine**: 1-click optimization suggestions based on dynamically calculated sector exposure.
*   **Options Sentiment Tracker**: Integrating **PCR (Put-Call Ratio)** and **IV Skew** for professional-grade risk hedging advice.
*   **Global Expansion**: Support for US Markets and International Index benchmarking.
*   **Archival Catalyst Search**: Multi-year news/event correlation for historical back-testing and pattern recognition.
