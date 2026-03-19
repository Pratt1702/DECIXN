# Market Intelligence Engine - Logic & Scoring Documentation

This document explains the internal mechanics of the `market_intelligence.py` script. It breaks down what indicators are calculated, how signals are generated, the decision logic, and how the final confidence scores are derived.

## 1. Core Indicators Calculated

The script fetches the last 100 days of Daily OHLCV (Open, High, Low, Close, Volume) data. Using this raw data, the following indicators are calculated:

*   **MA20 (20-Day Simple Moving Average):** The average closing price over the last 20 days. Used to gauge short-term market momentum.
*   **MA50 (50-Day Simple Moving Average):** The average closing price over the last 50 days. Used to gauge medium-term market momentum.
*   **Volume Average (20-Day):** The average daily trading volume over the last 20 days. Used as a baseline to detect abnormal trading activity.
*   **RSI (14-Period Relative Strength Index):** Calculated using Wilder's Smoothing (Exponential Moving Average). It measures the speed and change of price movements, outputting a value between 0 and 100.
*   **High20 (Highest Close in previous 20 days):** The maximum closing price out of the preceding 20 days (excluding today). This acts as a resistance level for breakout detection.

---

## 2. Signal Generation

Using the computed indicators, the engine scans the most recent trading day to generate binary (True/False) signals and a categorical Trend state:

*   **Breakout:** `True` if the Current Closing Price is strictly *greater* than the `High20` (Highest close of the last 20 days).
*   **Volume Spike:** `True` if the Current Daily Volume is strictly *greater* than **2x** the 20-Day Volume Average.
*   **Overbought:** `True` if the RSI is **> 70**. This typically warns that the stock might be overvalued and due for a pullback.
*   **Oversold:** `True` if the RSI is **< 30**. This suggests the stock might be undervalued and due for a bounce.
*   **Trend Configuration:**
    *   **Bullish:** If `Current Price > MA20` AND `MA20 > MA50`. (Denotes a strong uptrend).
    *   **Bearish:** If `Current Price < MA20` AND `MA20 < MA50`. (Denotes a strong downtrend).
    *   **Neutral:** Any other moving average configuration that doesn't cleanly meet the two above definitions.

---

## 3. Decision Matrix & Confidence Scoring Engine

The core logic resides in the `make_decision` function. 

Every stock starts with a **Base Confidence Score of `50/100`**. The engine then walks through the signals, adjusting the score up or down and determining the final Action (`BUY`, `HOLD`, `REDUCE`, `WATCH`).

Reasons are appended to an array at each step to provide contextual output for exactly *why* the script is making a particular decision.

### Step A: Trend Assessment
*   **If Bullish:** The trend is strong.
    *   **Score Penalty/Bonus:** `+20` (Score = 70)
    *   **Decision logic tree:**
        *   If `Breakout` AND `Volume Spike`: Decision is **BUY**. (+20 points for explosive momentum -> Score = 90). *Reason: Strong breakout supported by high volume.*
        *   If `Breakout` ONLY: Decision is **HOLD**. (+15 points -> Score = 85). *Reason: Breakout observed, but lacks volume confirmation.*
        *   If Neither: Decision is **HOLD**. (+10 points -> Score = 80). *Reason: Strong uptrend continuation without breakout.*
*   **If Bearish:** The trend is declining.
    *   **Score Penalty/Bonus:** `-20` (Score = 30)
    *   **Decision:** **REDUCE**. *Reason: Price below key moving averages.*
*   **If Neutral:** The market is undecided.
    *   **Score Penalty/Bonus:** `0` (Score = 50)
    *   **Decision:** **WATCH**. *Reason: Neutral trend configuration.*

### Step B: RSI Adjustments (Overbought / Oversold Check)
Independent of the trend, the RSI state heavily impacts the final result:
*   **If Overbought (RSI > 70):** 
    *   **Action:** If the current decision from Step A is `BUY`, downgrade it to `HOLD`.
    *   **Reasoning:** The stock might have exhausted its short-term buying pressure. Partial profit booking or caution is advised.
    *   **Score Penalty/Bonus:** `-15` (Penalty for risk).
*   **If Oversold (RSI < 30):** 
    *   **Action:** Automatically sets the decision to `WATCH`.
    *   **Reasoning:** Even in a downtrend, extreme oversold levels indicate a potential reversal or dead-cat bounce. It belongs on a watch list, not an immediate sell.
    *   **Score Penalty/Bonus:** `+15` (Bonus for deep-value potential).

### Step C: Edge Case Volume Spike
*   **Condition:** If there is a `Volume Spike` but NO `Breakout`, AND the trend is NOT Bullish.
    *   **Reasoning:** Major accumulation (buying) or distribution (selling) is happening under the surface without moving price above resistance.
    *   **Score Penalty/Bonus:** `+5`

### Step D: Score Normalization
To ensure logic handles don't break boundaries, the final score mathematically clamped so it will **never be less than 0 or greater than 100.** `Score = max(0, min(100, Score))`

---

## 4. Final Output & Ranking

At the end of processing the requested list of stocks, the engine formats the specific `Decision`, `Reasons`, and `Signals` into a readable console block. 

Finally, it sorts all analyzed stocks by their final calculated `Confidence Score` in descending order, printing a "Top Opportunities Today" summary list.

### Summary Labels:
Based on the final decision taken (BUY/HOLD/WATCH/REDUCE), the summary emits one of the following quick-hand conclusions:
*   **BUY:** "Strong trend continuation & breakout"
*   **HOLD:** "Steady performance with potential for upside"
*   **WATCH:** "Potential reversal watch or consolidation"
*   **REDUCE:** "Weakness observed, consider reducing exposure"

---

## 5. Holdings Intelligence Layer (Portfolio Mode)

When the engine analyzes existing holdings (via the `/analyze/portfolio` endpoint reading `holdings_kite.csv`), it shifts from generating generic signals to creating context-aware decisions based on mathematical P&L. 

### Professional Decision Matrix (P&L vs Trend):

Unlike standard discovery mode (where a Bullish trend is simply a `BUY`), Portfolio mode factors in entry price:

#### Condition 1: Position is Profitable (P&L > 0)
*   **Bullish Trend:** -> Decision: `RIDE TREND (HOLD)`
    *   *Logic: Let winners run. If there's a breakout, momentum is accelerating.*
*   **Bearish Trend:** -> Decision: `BOOK PROFITS`
    *   *Logic: The trend has reversed downward. Protect your capital by locking in gains.*
*   **Neutral Trend:** -> Decision: `HOLD / TRAILING STOP`
    *   *Logic: Momentum is stalling, but there's no technical reason to sell right away.*
*   **Overbought RSI (>70):** Overrides `HOLD` to `PARTIAL BOOK PROFITS` to secure gains before a pullback.

#### Condition 2: Position is at a Loss (P&L < 0)
*   **Bullish Trend:** -> Decision: `AVERAGE DOWN / HOLD`
    *   *Logic: The stock is regaining upward momentum. This is technically the safest time to lower your average cost.*
*   **Bearish Trend:** -> Decision: `CUT LOSSES / REDUCE`
    *   *Logic: Holding onto a falling knife. The trend is actively making your P&L worse.*
*   **Neutral Trend:** -> Decision: `HOLD / WATCH`
    *   *Logic: Wait for a clear breakout before deploying more capital to average down.*
*   **Oversold RSI (<30):** Adds context that a near-term bounce is possible, avoiding selling at the absolute bottom.

---

## 6. Portfolio Brain (Summary Intelligence Layer)

The `/analyze/portfolio` API wraps the individual stock analyses into a top-level **Portfolio Summary** object that evaluates systemic risk based on mathematical weightings and distribution of decisions.

### 6.1 Urgency Scoring & Risk Tagging
Each position is assigned a priority so the frontend can rank them:
*   **HIGH Urgency:** Action is actively required to preserve capital (`CUT LOSSES`, `BOOK PROFITS`).
*   **MEDIUM Urgency:** Action should be heavily monitored (`AVERAGE DOWN`, `HOLD / TRAILING STOP`).
*   **LOW Urgency:** No immediate action required, position is stable (`RIDE TREND`, `HOLD / WATCH`).

### 6.2 Structural Capital Allocation (Weighting)
The engine does not treat all stocks equally. It computes real portfolio impact:
*   `Invested Value = Avg Cost * Quantity`
*   `Current Value = Current Price * Quantity`
*   `Portfolio Weight % = (Current Value / Total Portfolio Value) * 100`

### 6.3 Dynamic Risk Assessment
The brain counts the distribution of decisions across the entire portfolio to assign top-level Health and Risk labels:
*   **High Risk (Selloff Imminent):** Triggered if more than 40% of the user's capital positions require `CUT LOSSES`. 
*   **Weak Health:** Triggered if the number of absolute losers is strictly greater than the number of winners.
*   **Capital Reallocation Alerts:** If zero positions are in a strong bullish uptrend (`RIDE TREND`), the engine recommends trimming dead weight to rotate capital into trending sectors.
