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
| High20 | 20-day | Rolling max of **shifted** close (excludes today) — used as resistance |
| MACD | 12/26/9 | MACD Line, Signal Line, Histogram |

---

## 3. Signal Generation

```
generate_signals(df) → signals dict
```

Reads the **latest row** of the indicator dataframe.

| Signal | Condition | Type |
|---|---|---|
| `Breakout` | `Close > High20` | bool |
| `Volume_Spike` | `Volume > 2 × Vol20` | bool |
| `Overbought` | `RSI > 70` | bool |
| `Oversold` | `RSI < 30` | bool |
| `Trend = Bullish` | `Close > MA20 AND MA20 > MA50` | categorical |
| `Trend = Bearish` | `Close < MA20 AND MA20 < MA50` | categorical |
| `Trend = Neutral` | all other configurations | categorical |

Also returns raw values: `Price`, `RSI`, `MA20`, `MA50`, `MACD dict`.

---

## 4. Discovery Mode — `make_decision(signals)`

Used by `analyze_single_ticker`. Starts at **base score = 50**.

### Step A — Trend
| Trend | Score Δ | Decision |
|---|---|---|
| Bullish + Breakout + Volume Spike | +40 | **BUY** |
| Bullish + Breakout only | +35 | **HOLD** |
| Bullish, no breakout | +30 | **HOLD** |
| Bearish | -20 | **REDUCE** |
| Neutral | 0 | **WATCH** |

### Step B — RSI Override
| RSI State | Score Δ | Decision Change |
|---|---|---|
| Overbought (>70) | -15 | BUY → HOLD |
| Oversold (<30) | +15 | Any → WATCH |

### Step C — Edge: Volume Spike without Breakout (non-Bullish)
- Score +5. No decision change. Flags unusual accumulation/distribution.

### Step D — Clamp
`score = max(0, min(100, int(score)))`

---

## 5. Portfolio Mode — `make_holding_decision(signals, avg_cost, pnl)`

Used by `analyze_single_holding` (called by both portfolio endpoints). Factors in **entry price context** to produce actionable portfolio decisions.

### Profitable Position (pnl > 0)
| Trend | Decision |
|---|---|
| Bullish | `RIDE TREND (HOLD)` — let winners run |
| Bearish | `BOOK PROFITS` — trend reversed, lock in gains |
| Neutral | `HOLD / TRAILING STOP` — stalling, protect gains |
| Any + Overbought RSI | `PARTIAL BOOK PROFITS` (overrides HOLD) |

### Loss Position (pnl ≤ 0)
| Trend | Decision |
|---|---|
| Bullish | `AVERAGE DOWN / HOLD` — regaining momentum |
| Bearish | `CUT LOSSES / REDUCE` — active downtrend |
| Neutral | `HOLD / WATCH` — wait for clear direction |
| Any + Oversold RSI | Adds context: bounce possible, avoid forced exits |

### Multi-Factor Overrides (Urgency)
- **Signal Multiplier:** If `Trend_Days >= 3`, confidence in the decision increases.
- **Relative Strength:** If stock is underperforming the Nifty 50 benchmark by >10% over 30 days, a "Caution" reason is appended.
- **Floor-less Risk:** If `Bearish` + `Price is near 52-week low`, "Do not average down" warning is triggered.

---

## 6. Urgency & Risk Tagging

```
get_urgency_and_risk(decision, trend) → (urgency, risk)
```

| Decision | Urgency | Risk |
|---|---|---|
| `CUT LOSSES` / `BOOK PROFITS` | HIGH | HIGH / LOW |
| `AVERAGE DOWN` / `TRAILING STOP` / `REDUCE` | MEDIUM | MEDIUM |
| `RIDE TREND` / `HOLD / WATCH` | LOW | LOW |
| Bearish + pnl < 0 | — | HIGH (override) |

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
        "portfolio_decision": "CUT LOSSES / REDUCE",
        "urgency_score": "HIGH", "risk_tag": "HIGH",
        "reasons": ["...", "..."],
        "benchmark_comparison": { "relative_strength": -12.4, "status": "UNDERPERFORMING" },
        "signals": { "breakout": false, "volume_spike": false, "overbought": false, "oversold": false, "trend_days": 5 }
      }
    }
  ]
}

