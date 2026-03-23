# 📊 DECIXN - Market Intelligence Engine

**DECIXN** (styled as **DECIXN**) is a premium, AI-driven technical analysis and market intelligence platform tailored for Indian retail investors. It bridges the gap between raw data and actionable profit-making decisions.

---

## 🚀 Core Product Features

### 1. **Explore (Market Pulse)**
*   **Real-Time Indices**: Continuous monitoring of **NIFTY 50** and **SENSEX** with intraday change tracking.
*   **Market Layout**: Instant access to **Top Gainers** and **Top Losers** with dynamic carousels.
*   **Historical Discovery**: "Recently Viewed" section to quickly jump back to previously analyzed tickers.

### 2. **Portfolio & Capital Intelligence**
*   **Smart CSV Ingestion**: High-fidelity parsing of broker holdings (e.g., Zerodha Kite).
*   **Capital Segmentation**:
    *   **Working Capital**: Assets aligned with bullish trends.
    *   **Trapped Capital**: Underperforming assets in bearish trends, identifying "hope-based" holding risks.
*   **AI Actionable Decisions**: Every holding is assigned a strategic status: **RIDE TREND**, **BOOK PROFITS**, **AVERAGE DOWN**, or **REDUCE / EXIT**.
*   **Portfolio Health Metric**: High-level summary of win rate, risk level, and overall capital efficiency.

### 3. **DECIXN Insights (Strategic Hub)**
*   **Actionable Signal Radar**: A priority-sorted list of stock-specific strategic actions.
*   **Severity & Urgency Mapping**: Signals are categorized by **Priority** (High/Medium/Low) and **Risk Level** (Low to Critical).
*   **Logic-Based Filtering**: Search and sort insights by Urgency, P&L (Best/Worst), and Name.

### 4. **Watchlist & Trend Visualization**
*   **Multi-Watchlist Management**: Create, rename, and manage custom curated lists.
*   **Intraday Sparklines**: High-density SVG trend lines providing instant visual context of price action during the last trading session.
*   **52-Week Perf Progress**: Visual bars indicating where the current price sits relative to the 52-week High/Low.
*   **Batch Quote Monitoring**: Efficient real-time tracking of multiple assets simultaneously.

### 5. **Foxy v1 (AI Market Assistant)**
*   **Conversational Intelligence**: An advanced "Neural Terminal" powered by Gemini 1.5 Flash.
*   **Portfolio-Aware Answers**: Foxy has deep context of your uploaded portfolio for tailored trade advice.
*   **Tool-Augmented reasoning**: Seamlessly uses backend market tools to fetch live data and technicals during chat.
*   **Rate-Limited Sustainability**: 10 messages per 30 minutes to ensure high-performance service for all users.
*   **Session Persistence**: Save and resume chat sessions with persistent history.

### 6. **Advanced Stock Intelligence**
*   **Multi-Period Interactive Charting**: From **1D (5-minute intervals)** to **MAX (1-month intervals)**.
*   **Institutional Pivot Points**: Real-time calculation of **Pivot, R1-R3, and S1-S3** levels.
*   **Moving Average Matrix**: Comprehensive breakdown of **SMA** and **EMA** for 10d, 20d, 50d, 100d, and 200d periods.
*   **Relative Strength Benchmark**: Mathematical performance comparison against the **Nifty 50** index.
*   **Fundamentals Hub**: Market Cap, P/E Ratio, Dividend Yield, Beta, and Sector/Industry categorization.

---

## ⚙️ How It Works (Technical Stack)

| Layer | Technology | Service |
| :--- | :--- | :--- |
| **Frontend** | `React` + `Vite` | High-fidelity UI with `Framer Motion` and `ApexCharts`. |
| **Styling** | `Tailwind CSS` | Professional, dark-mode glassmorphic design system. |
| **AI Agent** | `Foxy v1` (Gemini) | Advanced reasoning, function calling, and chat orchestration. |
| **Backend API** | `FastAPI` | Asynchronous processing of technical indicators and market logic. |
| **Data Backbone** | `yfinance` + `Supabase` | Real-time market data pipeline and secure user persistence. |
| **Technical Core** | `Pandas` + `Numpy` | Professional-grade indicator calculation and pattern search. |

---

### 🏛️ Philosophy
**DECIXN** isn't just about showing price. It's about providing **Context**. By automating technical heuristics and risk management, it acts as an emotionless, data-backed advisor for the retail investor.
