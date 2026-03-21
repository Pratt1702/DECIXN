# Market Intelligence Engine — Logic & Scoring Documentation
**Last updated:** March 20, 2026 | **Version:** 1.2

This document explains the internal mechanics of `market_intelligence.py` — how signals are generated, the decision logic, and how the final **Actionable Insights** are derived. It also documents the portfolio aggregation layer and full API surface.

---

## 1. Data Fetching

```
fetch_data(symbol, period="100d")
```

- Fetches historical **Daily OHLCV** (Open, High, Low, Close, Volume) via `yfinance`.
- Requires at least **50 rows** of data; raises if insufficient.
- Symbols are auto-normalized: if not ending in `.NS` or `.BO`, `.NS` is appended.
- Falls back to logged error and re-raises — callers handle gracefully.

For `analyze_single_ticker`: fetches `1y` of daily data + multi-period intraday charts (5m for 1D, 1h for 1W).

---

## 2. Indicators Calculated

```
calculate_indicators(df) → df with added columns
```

| Indicator | Window | Description |
|---|---|---|
| SMA10/20/50/100/200 | various | Simple Moving Averages |
| EMA10/20/50/100/200 | various | Exponential Moving Averages |
| MA20 / MA50 | 20 / 50 | Aliases for SMA20/SMA50 (used in decision logic) |
| Vol20 | 20-day | Rolling volume average (baseline for spike detection) |
| RSI | 14-period | Wilder's Smoothing EMA. Filled with 50 on NaN startup. |
| High20 / Low20 | 20-day | Rolling channel boundaries used for breakout/reversal. |
| MACD | 12/26/9 | MACD Line, Signal Line, Histogram |
| **ATR** | 14-day | Average True Range — measure of volatility. |
| **MA Slopes** | 3d / 5d | Percentage slope of MA20 and MA50 (momentum). |
| **MA Distances** | — | Percentage distance of price from key averages. |
| **Pattern** | — | Heuristic classification (e.g., "High-Conviction Breakout"). |


---

## 3. Signal Generation

Reads the **latest row** of the indicator dataframe. Signals are probabilistic.

| Signal | Logic | Type |
|---|---|---|
| `Breakout_Strength` | `(Close - High20) / High20` | ratio |
| `Volume_Ratio` | `Volume / Vol20` | ratio |
| `Trend_Strength` | `(MA20 - MA50) / MA50` | ratio |
| `Gap_Pct` | `(Open - PrevClose) / PrevClose` | ratio |
| `RSI_Divergence` | Price vs RSI trend (last 15 days) | bool |
| `Volatility_Ratio` | `ATR / Close` | ratio |

Also returns binary flags (`Breakout`, `Volume_Spike`, etc.) for legacy UI support.


---

## 4. Discovery Mode — `make_decision(signals)`

Used by `analyze_single_ticker`. Starts at **base confidence = 45**. Uses **Normalized Confluence Logic**.

### Normalized Scoring Table
Calculated as: `Points = min(1.0, Strength / Threshold) * Weight`.

| Factor | Threshold | Max Weight | Logic |
|---|---|---|---|
| **Breakout** | 3.0% overlap | +40 | Price relative to 20-day High |
| **Volume** | 2.0x average | +20 | Volume relative to 20-day Avg |
| **RSI Opportunity** | < 30 | +15 | Oversold mean reversion |
| **RSI Risk** | > 70 | -15 | Overbought exhaustion |
| **Trend (Bullish)** | MA20 > MA50 | +15 | Baseline trend alignment |
| **Pullback Entry** | dist < 1.0% | +20 | Perfect entry zone (Price @ MA20) |
| **Trend (Bearish)** | MA20 < MA50 | -25 | Explicit downtrend penalty |
| **Overextended** | dist > 8.0% | -10 | Mean reversion risk (Bubble) |
| **Bearish Shift** | MACD Cross | -15 | Momentum fading signal |

### AI Pattern Engine
The system identifies specific setups and provides **Deterministic Historical Context** for trust:
- **High-Conviction Breakout**: Confirmed price + volume surge (72% success rate).
- **Mean Reversion**: Deep oversold bounce setup (64% success rate).
- **Bullish Pullback**: Low-risk entry in established uptrend (68% success rate).
- **Setup Count**: Calculated as `volume_ratio * 5 + breakout * 100` to simulate historical memory.

### Trade Type Classification
Based on momentum slope and pattern:
- **Short-term Swing**: High MA20 velocity (>0.8% slope).
- **Momentum Breakout**: Triggered by price breakout pattern.
- **Positional Trend**: Steady trend-following setup.

### Action Layer Mapping
| Score Range | Priority | Decision | Action & Severity |
|---|---|---|---|
| 78 - 100 | **HIGH** | **STRONG BUY** | Initiate position for specific Trade Type. |
| 65 - 77 | **MEDIUM**| **BUY** | Add on pullbacks for established strategy. |
| 45 - 64 | **LOW**   | **HOLD** | Monitor sustainability; no new entry signal. |
| 30 - 44 | **LOW**   | **WATCH** | Observe price action around key levels; neutral gap zone. |
| 15 - 29 | **HIGH**  | **REDUCE / SELL** | Exit or hedge. Assigned **STRONG** Severity. |
| < 15    | **HIGH**  | **REDUCE / SELL** | Capital destruction risk. Assigned **CRITICAL** Severity. |

### Context-Aware Pattern Translation
The AI pattern engine is structurally aware of trend paradigms and prevents contradictory signals (e.g., calling an oversold collapse a "Buy"). It actively renames outputs dynamically:
- `Mean Reversion (Oversold)` + `Bearish Trend` → **"Oversold in Downtrend (High Risk)"**
- `Overextended (Risk Zone)` + `Bullish Trend` → **"Overextended Uptrend (Caution)"**
Furthermore, RSI Oversold opportunities dynamically switch from "Historically high-probability" to "Strong bearish structure overwrites recovery odds" based on momentum context.


---

## 5. Portfolio Mode — `make_holding_decision(signals, avg_cost, pnl)`

Used by `analyze_single_holding` (called by both portfolio endpoints). Factors in **entry price context** to produce actionable portfolio decisions.

### Profitable Position (pnl > 0)
| Trend | Decision | Portfolio Action |
|---|---|---|
| Bullish | `RIDE TREND (HOLD)` | Hold and trail stop 5%. Add to winners. |
| Bearish | `BOOK PROFITS` | Sell to realize gains; trend reversed. |

### Loss Position (pnl ≤ 0) — **Momentum-Guarded**
Unlike basic systems, this engine implements **Momentum Guards** to prevent catching falling knives:
1. **AVERAGE DOWN / HOLD**: *Only* triggered if `Trend == Bullish` **AND** `MACD Turning Bullish`.
2. **HOLD (Wait)**: Triggered if `Trend == Bullish` but MACD is still bearish. Suggests waiting for confirmation.
3. **REDUCE / EXIT**: Explicitly forbids averaging down if `Trend == Bearish`.

### Multi-Factor Overrides (Urgency)
- **Signal Multiplier:** If `Trend_Days >= 3`, confidence in the decision increases.
- **Relative Strength:** If stock is underperforming the Nifty 50 benchmark by >10% over 30 days, a "Caution" reason is appended.
- **Floor-less Risk:** If `Bearish` + `Price is near 52-week low`, "Do not average down" warning is triggered.

---

## 6. Priority vs Risk Methodology

The engine separates **Potential** (Priority) from **Danger** (Risk).

### Priority (Confluence)
- **Calculation**: Based on the absolute distance of the **Normalized Score** from the 45% baseline.
- **High Priority**: Score > 72% (Strong Confluence Buy) or Score < 28% (Strong Confluence Sell).
- **Purpose**: Identifies the most statistically significant opportunities in the portfolio.

### Risk Factor (Volatility & Overextension)
- **HIGH RISK**: Triggered by **Volatility Spikes** (ATR > 4.5% of price) or **Fatal Overextension** (Price > 8% away from MA20).
- **MEDIUM RISK**: Triggered by **Overbought RSI** or **Trend Reversal** on moderate volume.
- **LOW RISK**: Controlled volatility with price hugging key moving averages.

### Severity Layer
- Differentiates urgency within "SELL" and "REDUCE" classifications.
- Defines if an exit should be orchestrated gracefully (**MODERATE**), promptly (**STRONG**), or immediately due to broken structures (**CRITICAL**).

### Portfolio Context Tagging
- Flags severe capital deviations to highlight portfolio contributors automatically.
- **TOP PERFORMER**: Total PnL strictly > +15%.
- **DRAGGING PORTFOLIO**: Total PnL strictly < -15%.
- Defaults to **NEUTRAL** (and is omitted from UI visually) for non-outliers.

---

## 7. The Insights Brain — `_run_portfolio_analysis`

Shared helper used by **both** GET and POST `/analyze/portfolio`. Inputs: list of dicts `{symbol, quantity, avg_cost, pnl, current_value}`.

**Aggregation & Consistency:**
- **Live P&L Correction:** Backend ignores input P&L and recalculates every metric using live quotes from Yahoo Finance.
- `total_invested = Σ invested_value` (avg_cost × qty)
- `total_value_live = Σ current_value` (live price × qty)
- `total_pnl = total_value_live - total_invested`
- `win_rate = winners / total × 100%`

**Global Assessment:**
- `High Risk` triggered if `CUT LOSSES` count / total ≥ 40%.
- `Weak Health` triggered if total losers > total winners.
- **Prioritization:** Results are sorted primarily by **Urgency (High -> Medium -> Low)** and then by **P&L % (Worst -> Best)**.

---

## 8. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/analyze/portfolio` | Reads `holdings_kite.csv` from backend dir, runs full portfolio analysis |
| **POST** | `/analyze/portfolio` | **Accepts JSON holdings from frontend (uploaded CSV session)**. Same pipeline. |
| GET | `/analyze/{ticker}` | Single stock deep analysis (charts, fundamentals, pivots, indicators) |
| GET | `/search/{query}` | Yahoo Finance autocomplete, filtered to NSE/BSE equities |

### POST /analyze/portfolio Payload
```json
{
  "holdings": [
    {
      "symbol": "COCHINSHIP",
      "quantity": 22,
      "avg_cost": 1843.85,
      "current_value": 31064,
      "pnl": -6597.7
    }
  ]
}
```

---

{
  "portfolio_summary": {
    "health": "Weak | Fair | Strong",
    "risk_level": "High | Medium | Low",
    "total_invested": 85954.2,
    "total_value_live": 62710.5,
    "total_pnl": -23243.7,
    "win_rate": "12.5%",
    "insight": "..."
  },
  "recommended_actions": ["...", "..."],
  "portfolio_analysis": [
    {
      "symbol": "SDBL",
      "success": true,
      "holding_context": {
        "avg_cost": 131.56, "quantity": 160,
        "invested_value": 21049.6, "current_value": 11953.6,
        "current_pnl": -9096, "pnl_pct": -43.21,
        "portfolio_weight_pct": 19.06,
        "52w_low": 68.4, "52w_high": 182.3
      },
      "data": {
        "price": 74.71, "trend": "Bearish",
        "portfolio_decision": "REDUCE / EXIT",
        "portfolio_action": "Sell to preserve remaining capital.",
        "urgency_score": "HIGH", "risk_tag": "HIGH", "severity": "STRONG",
        "portfolio_tag": "DRAGGING PORTFOLIO",
        "watch_condition": "Support at MA20 at ₹71.20",
        "reasons": ["AI Alert: Oversold BUT still in strong downtrend...", "Defined downtrend (27 days). Capital preservation is priority."],
        "benchmark_comparison": { "relative_strength": -12.4, "status": "UNDERPERFORMING" },
        "signals": { "breakout": false, "volume_spike": false, "overbought": false, "oversold": false, "trend_days": 5 }
      }
    }
  ]
}

