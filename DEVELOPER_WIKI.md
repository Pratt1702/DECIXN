# 🛠️ DECIXN - Developer Wiki (Technical Architecture)

Welcome to the **DECIXN** Technical Wiki. This document provides a deep-dive into the platform's architecture, logic engines, and data orchestration.

---

## 📂 Repository Structure

The project is divided into a **FastAPI backend** and a **React/Vite frontend**.

### **Backend (`/backend`)**
*   `main.py`: Entry point, API routing, and Rate Limiting. Contains the **Hybrid Alert Models** (`Union[float, str]`).
*   `market_intelligence.py`: High-level orchestration for analysis and market overview.
*   `services/`:
    *   `alerts/`:
        *   `alert_service.py`: Evaluates active monitors against real-time signals. Implements "One-Time Trigger" logic.
        *   `notification_service.py`: Manages persistence of triggered signals and read-states.
    *   `pulse_news.py`: Zenodha Pulse scraper with fuzzy query matching and recency filtering.
    *   `ingestion_service.py`: Implements **Fuzzy Header Matching** for broker CSV exports.
    *   `chat_service.py`: Foxy v1 (Gemini 1.5 Flash) orchestration with tool-calling.
    *   `decision_engine.py`: Core logic for confluence scoring and pattern recognition.
    *   `technical_indicators.py`: TA-Lib style calculations (RSI, MACD, SMA/EMA).
    *   `signal_generator.py`: Generates primary Bullish/Bearish and Strategic Pattern signals.
    *   `supabase_client.py`: Auth and `TIMESTAMPTZ` persistence integration.

### **Frontend (`/frontend`)**
*   `src/store/`: Zustand state management (`useAuthStore`, `usePortfolioStore`, `useWatchlistStore`, `useNotificationStore`).
*   `src/services/api.ts`: Centralized Axios client with specialized `createAlert` and `getNotifications` endpoints.
*   `src/components/dashboard/`: Includes the **Draggable Alert Modal** and **SVG Sparkline Engine**.
*   `src/pages/Terminal.tsx`: Integration of the **Advanced TradingView Technical Suite**.

---

## 🧠 Technical Logic Engines

### 1. **Intelligent Alert Engine**
The alert engine handles cross-type evaluation using a **Hybrid Context**:
*   **Numeric Evaluation**: Standard operators (`>`, `<`, `==`) for Price, RSI, etc.
*   **String Evaluation**: Case-insensitive matching (`==`, `!=`) for Trends (Bullish/Bearish) and Signals (Buy/Sell).
*   **State Management**: Triggered alerts are automatically set to `is_active: False`.

### 2. **Decision Engine & Scoring**
Employs a **Normalized Confluence Score (NCS)** from 0-100:
*   **Base Score**: 45.
*   **Boosters**: Breakout Strength (+40), Volume Ratio (+20), Trend Proximity (+20).
*   **Success Metrics**: Deterministic historical successes are provided (e.g., High-Conviction Breakout: 72% success).
*   **Momentum Guards**: Logic in `portfolio_logic.py` prevents "Averaging Down" if MA-slopes are negative.

---

## 🔄 Core Data Workflows

### **Privacy-First Data Architecture**
1.  **Ingestion**: CSV data is parsed in the browser via `PapaParse` or in the backend via `ingestion_service.py`.
2.  **Storage**: Portfolio holdings are stored **Locally** in `IndexedDB`.
3.  **Analysis**: Backend receives symbol lists, processes technicals, and returns ephemeral results. No portfolio data is persisted in a database.

### **SVG Sparkline Engine**
1.  **Data**: Frontend fetches 1W/1M historical close prices.
2.  **Rendering**: `Watchlist.tsx` uses custom SVG path generation with gradated fills based on 1D performance (Success/Danger).
3.  **Benchmarks**: Includes a dashed reference line for the **Previous Close** value.

### **UTC-First Timestamp Standard**
All time-series data utilizes `TIMESTAMPTZ`:
*   **Backend**: Generations use `datetime.now(timezone.utc).isoformat()`.
*   **DB**: Columns use `AT TIME ZONE 'UTC'` to ensure "Time Ago" accuracy.

---

## 📡 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/analyze/{ticker}` | GET | Full technical deep-dive + Institutional Pivots. |
| `/alerts` | POST | Create a new multi-condition monitor. |
| `/notifications/{id}` | GET | Fetch notification feed for a specific user. |
| `/chat` | POST | Streaming endpoint for Foxy v1 Assistant. |
| `/quotes/batch` | POST | Optimized retrieval for Watchlists with intraday sparklines. |

---

## 🧪 Technical Quality Standards
*   **UI Sensitivity**: Modal units use `dragMomentum={false}` and `backdrop-blur-3xl`.
*   **Fuzzy Matching**: Broker CSVs are matched via regex keywords (Symbol, Qty, Cost) to allow multi-broker flexibility.
*   **Design Scale**: Typography is scaled to `text-[11px]` benchmarks for a dense terminal feel.
