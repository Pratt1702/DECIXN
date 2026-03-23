# 📊 DECIXN - Market Intelligence Engine

**DECIXN** (styled as **DECIXN**) is a premium, AI-driven technical analysis and market intelligence platform tailored for Indian retail investors. It bridges the gap between raw data and actionable profit-making decisions.

---

## 🚀 Core Product Features

### 1. **Explore (Market Pulse)**

- **Real-Time Indices**: Continuous monitoring of **NIFTY 50** and **SENSEX** with intraday change tracking.
- **Market Layout**: Instant access to **Top Gainers** and **Top Losers** with dynamic carousels.
- **Historical Discovery**: "Recently Viewed" section to quickly jump back to previously analyzed tickers.

### 2. **Intelligent Alert Engine (New)**

- **Multi-Condition Monitoring**: Set alerts based on **Price**, **RSI**, **Volume Ratio**, or complex **Trend/Signal** states.
- **Strategic Patterns**: Alert on specific AI-detected patterns like "High-Conviction Breakouts" or "Mean Reversion".
- **Draggable Modal UI**: A non-intrusive, floating alert console that lets you browse charts while configuring monitors.
- **One-Time Execution**: Alerts use a "Trigger & Pause" logic to prevent repetitive spam, ensuring you only react to high-impact moves.

### 3. **Notification Feed**

- **Execution Timeline**: A dedicated **Notifications** page serving as a real-time record of all triggered alerts.
- **Contextual Links**: Jump directly from a notification to the corresponding stock analysis page.
- **Standard Lifecycle**: All triggers are saved with UTC precision and delivered via an interactive "Notification Feed".

### 4. **Watchlist & Trend Visualization**

- **Multi-Watchlist Management**: Create, rename, and manage custom curated lists.
- **Intraday Sparklines**: High-density SVG trend lines providing instant visual context of price action.
- **52-Week Perf Progress**: Visual bars indicating where the current price sits relative to the 52-week High/Low.
- **Batch Quote Monitoring**: Efficient real-time tracking of multiple assets simultaneously.

### 4. **Portfolio & Capital Intelligence**

- **Smart CSV Ingestion**: High-fidelity parsing of broker holdings (e.g., Zerodha Kite).
- **Capital Segmentation**:
  - **Working Capital**: Assets aligned with bullish trends.
  - **Trapped Capital**: Underperforming assets in bearish trends, identifying "hope-based" holding risks.
- **AI Actionable Decisions**: Every holding is assigned a strategic status: **RIDE TREND**, **BOOK PROFITS**, **AVERAGE DOWN**, or **REDUCE / EXIT**.
- **Portfolio Health Metric**: High-level summary of win rate, risk level, and overall capital efficiency.

### 5. **DECIXN Insights (Strategic Hub)**

- **Actionable Signal Radar**: A priority-sorted list of stock-specific strategic actions.
- **Severity & Urgency Mapping**: Signals are categorized by **Priority** (High/Medium/Low) and **Risk Level** (Low to Critical).
- **Logic-Based Filtering**: Search and sort insights by Urgency, P&L (Best/Worst), and Name.

### 6. **Foxy v1 (AI Market Assistant)**

- **Conversational Intelligence**: An advanced "Neural Terminal" powered by Gemini 1.5 Flash.
- **Portfolio-Aware Answers**: Foxy has deep context of your uploaded portfolio for tailored trade advice.
- **Tool-Augmented reasoning**: Seamlessly uses backend market tools to fetch live data and technicals during chat.
- **Session Persistence**: Save and resume chat sessions with persistent history stored in Supabase.

### 7. **Advanced Stock Intelligence**

- **Multi-Period Interactive Charting**: From **1D (5-minute intervals)** to **MAX (1-month intervals)**.
- **Institutional Pivot Points**: Real-time calculation of **Pivot, R1-R3, and S1-S3** levels.
- **Moving Average Matrix**: Comprehensive breakdown of **SMA** and **EMA** for 10d up to 200d periods.
- **Relative Strength Benchmark**: Mathematical performance comparison against the **Nifty 50** index.
- **Fundamentals Hub**: Market Cap, P/E Ratio, Dividend Yield, Beta, and Sector/Industry categorization.

---

## ⚙️ How It Works (Technical Stack)

| Layer            | Technology             | Service                                                                 |
| :--------------- | :--------------------- | :---------------------------------------------------------------------- |
| **Frontend**     | `React` + `Vite`       | High-fidelity UI with `Framer Motion` and `ApexCharts`.                 |
| **Styling**      | `Vanilla CSS`          | Tailored, premium glassmorphic design system (scaled for info-density). |
| **Alert Engine** | `FastAPI` + `yfinance` | Asynchronous condition evaluation with hybrid numeric/string logic.     |
| **AI Agent**     | `Foxy v1` (Gemini)     | Advanced reasoning, function calling, and chat orchestration.           |
| **Persistence**  | `Supabase`             | PostgreSQL with `TIMESTAMPTZ` for notification sync.                    |

---

### 🏛️ Philosophy

**DECIXN** isn't just about showing price. It's about providing **Context**. By automating technical heuristics and risk management, it acts as an emotionless, data-backed advisor for the retail investor.
