# 🚀 ET Markets GenAI Hackathon - Market Intelligence Engine

An AI-driven technical analysis and market intelligence platform for Indian retail investors. This platform ingests raw technical data and user portfolios (via CSV) and translates them into plain-English, highly actionable trading decisions.

---

## ⚙️ Setup & Installation

Get the application running locally in a few simple steps. The repository is split into a React frontend and a FastAPI Python backend, which can be run simultaneously using concurrent scripts.

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **Python** (v3.12.0 or higher)

### 2. Clone the Repository
```bash
git clone https://github.com/Pratt1702/ETGenAIHackathon.git
cd ETGenAIHackathon
```

### 3. Install Dependencies

**Root & Frontend:**
```bash
# Install root concurrent scripts
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

**Backend:**
```bash
# Install Python backend dependencies
cd backend
pip install -r requirements.txt
cd ..
```

### 4. Run the Platform 🚀
From the root directory, simply run:
```bash
npm run dev
```
*(This commands boots both the frontend React server and the `uvicorn` FastAPI backend simultaneously.)*

---

## ✨ Features & Why They Are Used

The Market Intelligence Engine is designed to solve the complexity of technical analysis by providing institutional-grade indicators in an intuitive dashboard.

### 1. **Live Custom CSV Portfolio AI**
*   **What it does:** Users can securely upload their broker's holding CSVs (e.g., Kite). The engine instantly parses the data and pushes it through the backend AI algorithm.
*   **Why it's used:** Most platforms only show current P&L. By feeding live holdings to the AI, users get real-time decisions (Buy, Hold, Reduce, Sell) tailored specifically to the assets they actually own.

### 2. **Capital Efficiency Tracking (Working vs. Trapped Capital)**
*   **What it does:** Scans the whole portfolio to determine what percentage of capital is "Working" (invested in bullish, uptrending stocks) vs. "Trapped" (stuck in bearish, depreciating assets).
*   **Why it's used:** Investors frequently hold onto severe losers out of hope (the sunk cost fallacy). Knowing that 60% of their money is "Trapped" forces actionable reflection.

### 3. **Smart Concentration Risk & Nudges**
*   **What it does:** Tracks position sizing. If a single asset exceeds 25% of the portfolio's weight, the AI automatically emits a concentration risk Nudge.
*   **Why it's used:** Prevents catastrophic losses for retail investors who lack portfolio diversification strategies.

### 4. **AI-Driven Technical Heuristics (Pattern Recognition)**
*   **What it does:** Computes complex indicators (MACD, RSI, ATR, Moving Average Slopes) and translates them into AI heuristic patterns (e.g., "Mean Reversion", "Bullish Pullback", "High-Conviction Breakout").
*   **Why it's used:** Looking at RSI=25 doesn't mean much to a beginner. The system evaluates a confluence of 15+ indicators to output a normalized 1-100 Confidence Score and a simple "STRONG BUY" or "SELL" recommendation, removing guesswork.

### 5. **Nifty 50 Relative Strength Benchmarking**
*   **What it does:** Autonomously downloads the NSE index data (`^NSEI`) and measures custom holding performance against the broader market index.
*   **Why it's used:** Absolute returns are deceptive in a bull market. Pinpointing stocks that are mathematically underperforming the Nifty 50 highlights the weakest links in an investor's strategy.

---

## 🌍 Impact

Retail participation in the Indian equity markets surrounds an incredible boom, yet the majority of newcomers lose money due to emotional trading, lack of risk management, and missing context on technical data.

This project delivers **Massive Impact** by:
1.  **Democratizing Institutional Tools:** Making complex quantitative models accessible to retail traders through plain-English summaries.
2.  **Mitigating Behavioral Biases:** By automatically categorizing capital as "Trapped" and identifying "Concentration Risk", the engine acts as an objective, emotionless advisor that safeguards capital.
3.  **Elevating Financial Literacy:** Users don't just see a "BUY" button. They see the exact *Reasoning* (e.g., "Heavy Volume: 1.5x average", "Overbought RSI: 75") and learn the mechanics of the market through high-quality contextual exposure.

*Built for the ET Markets GenAI Hackathon - Empowering the next generation of Indian retail investors.*
