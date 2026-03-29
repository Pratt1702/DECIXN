import asyncio
import numpy as np
import pandas as pd
import traceback


def _safe_float(val, default=None):
    try:
        if val is None or (isinstance(val, float) and (np.isnan(val) or np.isinf(val))):
            return default
        return float(val)
    except Exception:
        return default


def _safe_pct_change(current, previous):
    """Returns percentage change or None if inputs are invalid."""
    try:
        if previous and previous != 0:
            return round(((current - previous) / abs(previous)) * 100, 1)
    except Exception:
        pass
    return None


def _classify_data_quality(info: dict) -> str:
    """Classify data quality based on market cap."""
    info = info or {}
    try:
        market_cap = info.get("marketCap") or 0
        if market_cap > 2_400_000_000:   # > ~$2.4B = Large Cap
            return "LARGE_CAP"
        elif market_cap > 600_000_000:   # > ~$600M = Mid Cap
            return "MID_CAP"
        elif market_cap > 0:
            return "SMALL_CAP"
        return "UNKNOWN"
    except Exception:
        return "UNKNOWN"


# ─────────────────────────────────────────────────────────────────────────────
# MEDIUM-TERM (3–6 months) — driven by quarterly filings
# ─────────────────────────────────────────────────────────────────────────────

def _compute_medium_term(q_income, q_earnings, q_bs, earnings_dates) -> dict:
    """
    Compute structured medium-term intelligence from pre-fetched dataframes.
    """
    result = {
        "available": False,
        "verdict": "NEUTRAL",
        "score": 50,
        "signals": [],
        "quarterly_revenue": [],
        "quarterly_earnings": [],
        "earnings_beat_rate": None,
        "earnings_momentum": "Unknown",
        "debt_equity": None,
        "upcoming_earnings": None,
    }

    try:
        # --- Quarterly Revenue trend ---
        if q_income is not None and not q_income.empty:
            rev_row = None
            for key in ["Total Revenue", "Revenue", "TotalRevenue", "Operating Revenue"]:
                if key in q_income.index:
                    rev_row = q_income.loc[key]
                    break

            if rev_row is not None and len(rev_row) >= 2:
                quarters = []
                for i, (date, val) in enumerate(rev_row.items()):
                    v = _safe_float(val)
                    prev_val = _safe_float(rev_row.iloc[i + 1]) if i + 1 < len(rev_row) else None
                    qoq = _safe_pct_change(v, prev_val) if v and prev_val else None
                    quarters.append({
                        "quarter": date.strftime("%b '%y") if hasattr(date, 'strftime') else str(date),
                        "revenue_cr": round(v / 1e7, 1) if v else None,
                        "revenue_raw": v,
                        "qoq_change": qoq,
                    })
                result["quarterly_revenue"] = quarters[:4]
                result["available"] = True

        # --- Quarterly EPS & Beat/Miss ---
        if q_earnings is not None and not q_earnings.empty and "EPS Actual" in q_earnings.columns:
            beats = []
            earnings_rows = []
            for idx, row in q_earnings.iterrows():
                actual = _safe_float(row.get("EPS Actual"))
                estimate = _safe_float(row.get("EPS Estimate"))
                if actual is not None:
                    beat = actual >= (estimate or 0) if estimate is not None else None
                    beats.append(beat)
                    earnings_rows.append({
                        "quarter": idx.strftime("%b '%y") if hasattr(idx, 'strftime') else str(idx),
                        "eps_actual": actual,
                        "eps_estimate": estimate,
                        "beat": beat,
                        "surprise_pct": round(((actual - estimate) / abs(estimate)) * 100, 1) if estimate and estimate != 0 else None
                    })

            result["quarterly_earnings"] = earnings_rows[:4]
            valid_beats = [b for b in beats if b is not None]
            if valid_beats:
                result["earnings_beat_rate"] = round((sum(valid_beats) / len(valid_beats)) * 100)

            eps_values = [r["eps_actual"] for r in earnings_rows if r["eps_actual"] is not None]
            if len(eps_values) >= 4:
                recent_avg = sum(eps_values[:2]) / 2
                older_avg = sum(eps_values[2:4]) / 2
                if older_avg and older_avg != 0:
                    change = ((recent_avg - older_avg) / abs(older_avg)) * 100
                    result["earnings_momentum"] = "Accelerating" if change > 5 else "Decelerating" if change < -5 else "Stable"
            result["available"] = True

        # --- Quarterly Balance Sheet (Debt/Equity) ---
        if q_bs is not None and not q_bs.empty:
            total_debt, total_equity = None, None
            for key in ["Total Debt", "Long Term Debt", "LongTermDebt"]:
                if key in q_bs.index:
                    total_debt = _safe_float(q_bs.loc[key].iloc[0])
                    break
            for key in ["Stockholders Equity", "Total Equity Gross Minority Interest", "CommonStockEquity"]:
                if key in q_bs.index:
                    total_equity = _safe_float(q_bs.loc[key].iloc[0])
                    break

            if total_debt is not None and total_equity and total_equity != 0:
                result["debt_equity"] = round(total_debt / abs(total_equity), 2)

        # --- Upcoming Earnings Date ---
        if earnings_dates is not None and not earnings_dates.empty:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            future = earnings_dates[earnings_dates.index > now]
            if not future.empty:
                next_date = future.index[-1]
                days_away = (next_date - now).days
                result["upcoming_earnings"] = {
                    "date": next_date.strftime("%d %b %Y"),
                    "days_away": days_away,
                    "flag": "NEAR" if days_away <= 14 else "UPCOMING"
                }

    except Exception as e:
        print(f"[QF] Medium-term compute error: {e}")

    # --- Score & Verdict ---
    score = 50
    signals = []

    if result.get("quarterly_revenue"):
        recent_qoq = [q["qoq_change"] for q in result["quarterly_revenue"][:2] if q.get("qoq_change") is not None]
        if recent_qoq:
            avg_qoq = sum(recent_qoq) / len(recent_qoq)
            if avg_qoq > 10:
                score += 15
                signals.append(f"Revenue growing {avg_qoq:.1f}% QoQ on average")
            elif avg_qoq > 0:
                score += 5
                signals.append(f"Revenue modestly growing {avg_qoq:.1f}% QoQ")
            elif avg_qoq < -5:
                score -= 15
                signals.append(f"Revenue declining {avg_qoq:.1f}% QoQ — watch closely")

    beat_rate = result.get("earnings_beat_rate")
    if beat_rate is not None:
        if beat_rate >= 75:
            score += 15
            signals.append(f"Strong earnings delivery: beat estimates {beat_rate}% of recent quarters")
        elif beat_rate >= 50:
            score += 5
            signals.append(f"Mixed earnings delivery: beat {beat_rate}% of quarters")
        else:
            score -= 10
            signals.append(f"Weak earnings delivery: missed estimates {100 - beat_rate}% of recent quarters")

    momentum = result.get("earnings_momentum")
    if momentum == "Accelerating":
        score += 10
        signals.append("EPS momentum accelerating")
    elif momentum == "Decelerating":
        score -= 10
        signals.append("EPS momentum decelerating")

    de = result.get("debt_equity")
    if de is not None:
        if de < 0.5:
            score += 5
            signals.append(f"Low leverage: D/E ratio {de}x")
        elif de > 2.0:
            score -= 10
            signals.append(f"High leverage: D/E ratio {de}x")

    if (result.get("upcoming_earnings") or {}).get("flag") == "NEAR":
        signals.append(f"⚠ Earnings in {result['upcoming_earnings']['days_away']} days")

    score = max(0, min(100, score))
    result.update({"score": score, "signals": signals, "verdict": "POSITIVE" if score >= 65 else "NEUTRAL" if score >= 40 else "NEGATIVE"})
    return result


# ─────────────────────────────────────────────────────────────────────────────
# LONG-TERM (1–3 years) — driven by annual filings + info snapshot
# ─────────────────────────────────────────────────────────────────────────────

def _compute_long_term(annual_income, annual_cf, info: dict) -> dict:
    """
    Compute structured long-term intelligence from pre-fetched data.
    """
    info = info or {}
    result = {
        "available": False,
        "verdict": "MIXED",
        "grade": "C",
        "score": 50,
        "signals": [],
        "revenue_cagr_3y": None,
        "fcf_positive": None,
        "roe": None,
        "profit_margin": None,
        "peg_ratio": None,
        "pe_ratio": None,
        "forward_pe": None,
        "debt_equity_annual": None,
        "annual_revenue": [],
    }

    try:
        # --- Annual Revenue CAGR ---
        if annual_income is not None and not annual_income.empty:
            rev_row = None
            for key in ["Total Revenue", "Revenue", "TotalRevenue"]:
                if key in annual_income.index:
                    rev_row = annual_income.loc[key]
                    break

            if rev_row is not None and len(rev_row) >= 2:
                annual_revs = []
                for date, val in rev_row.items():
                    v = _safe_float(val)
                    annual_revs.append({
                        "year": date.strftime("%Y") if hasattr(date, 'strftime') else str(date),
                        "revenue_cr": round(v / 1e7, 1) if v else None,
                        "revenue_raw": v
                    })
                result["annual_revenue"] = annual_revs[:4]

                valid_revs = [r["revenue_raw"] for r in annual_revs if r["revenue_raw"]]
                if len(valid_revs) >= 3:
                    r_new, r_old = valid_revs[0], valid_revs[2]
                    if r_old and r_old > 0:
                        cagr = ((r_new / r_old) ** (1/3) - 1) * 100
                        result["revenue_cagr_3y"] = round(cagr, 1)
                result["available"] = True

        # --- Free Cash Flow ---
        if annual_cf is not None and not annual_cf.empty:
            fcf_row = None
            for key in ["Free Cash Flow", "FreeCashFlow"]:
                if key in annual_cf.index:
                    fcf_row = annual_cf.loc[key]
                    break

            if fcf_row is not None:
                fcf_vals = [_safe_float(v) for v in list(fcf_row.values)[:3] if _safe_float(v) is not None]
                if fcf_vals:
                    result["fcf_positive"] = sum(1 for v in fcf_vals if v > 0) >= 2
                    result["available"] = True

        # --- Key Ratios from info ---
        result["roe"] = round(_safe_float(info.get("returnOnEquity"), 0) * 100, 1) if info.get("returnOnEquity") else None
        result["profit_margin"] = round(_safe_float(info.get("profitMargins"), 0) * 100, 1) if info.get("profitMargins") else None
        result["peg_ratio"] = _safe_float(info.get("pegRatio"))
        result["pe_ratio"] = _safe_float(info.get("trailingPE"))
        result["forward_pe"] = _safe_float(info.get("forwardPE"))
        result["debt_equity_annual"] = round(_safe_float(info.get("debtToEquity"), 0) / 100, 2) if info.get("debtToEquity") else None

        if any([result["roe"], result["profit_margin"], result["pe_ratio"]]):
            result["available"] = True

    except Exception as e:
        print(f"[QF] Long-term compute error: {e}")

    # --- Score & Grade ---
    score = 50
    signals = []

    cagr = result.get("revenue_cagr_3y")
    if cagr is not None:
        if cagr > 15: score += 20; signals.append(f"Revenue grew {cagr}% CAGR (3Y)")
        elif cagr > 5: score += 10; signals.append(f"Steady growth: {cagr}% CAGR")
        elif cagr < 0: score -= 15; signals.append(f"Revenue contracting: {cagr}% CAGR")

    if result.get("fcf_positive") is True: score += 15; signals.append("Positive FCF trajectory")
    elif result.get("fcf_positive") is False: score -= 10; signals.append("Negative cash flow trend")

    roe = result.get("roe")
    if roe is not None:
        if roe > 20: score += 15; signals.append("Exceptional ROE")
        elif roe < 5: score -= 10; signals.append("Low capital efficiency")

    score = max(0, min(100, score))
    result.update({"score": score, "signals": signals, "grade": "A" if score >= 75 else "B" if score >= 55 else "C" if score >= 35 else "D", "verdict": "FUNDAMENTALLY STRONG" if score >= 75 else "SOLID" if score >= 55 else "MIXED" if score >= 35 else "WEAK"})
    return result


# ─────────────────────────────────────────────────────────────────────────────
# MASTER FUNCTION (ASYNC)
# ─────────────────────────────────────────────────────────────────────────────

async def get_fundamentals_intelligence(ticker_obj, info: dict) -> dict:
    """
    Master function (ASYNC). Returns structured fundamental intelligence for three time horizons.
    Uses asyncio.to_thread and asyncio.gather to prevent blocking the worker during yfinance I/O.
    """
    info = info or {}
    data_quality = _classify_data_quality(info)

    if data_quality == "SMALL_CAP":
        return {
            "data_quality": "SMALL_CAP",
            "message": "Quarterly filings sparse for small-cap stocks. Analysis is technical only.",
            "medium_term": {"available": False},
            "long_term": {"available": False},
            "comprehensive_table": _build_comprehensive_table(info, None, None),
        }

    try:
        # Fetch all slow DataFrames in parallel via worker threads
        q_income, q_earnings, q_bs, annual_income, annual_cf, earnings_dates = await asyncio.gather(
            asyncio.to_thread(lambda: getattr(ticker_obj, 'quarterly_income_stmt', None)),
            asyncio.to_thread(lambda: getattr(ticker_obj, 'quarterly_earnings', None)),
            asyncio.to_thread(lambda: getattr(ticker_obj, 'quarterly_balance_sheet', None)),
            asyncio.to_thread(lambda: getattr(ticker_obj, 'income_stmt', None)),
            asyncio.to_thread(lambda: getattr(ticker_obj, 'cash_flow', None)),
            asyncio.to_thread(lambda: getattr(ticker_obj, 'earnings_dates', None))
        )

        medium_term = _compute_medium_term(q_income, q_earnings, q_bs, earnings_dates)
        long_term = _compute_long_term(annual_income, annual_cf, info)

        if not medium_term.get("available") and not long_term.get("available"):
            data_quality = "NO_DATA"
            return {
                "data_quality": "NO_DATA",
                "message": "No financial filings available via Yahoo Finance.",
                "medium_term": {"available": False},
                "long_term": {"available": False},
                "comprehensive_table": _build_comprehensive_table(info, None, None),
            }

        return {
            "data_quality": data_quality,
            "medium_term": medium_term,
            "long_term": long_term,
            "comprehensive_table": _build_comprehensive_table(info, medium_term, long_term),
        }

    except Exception as e:
        print(f"[QF] Async Intelligence Error: {e}")
        return {
            "data_quality": "ERROR",
            "message": f"Error gathering fundamentals: {str(e)}",
            "medium_term": {"available": False},
            "long_term": {"available": False},
            "comprehensive_table": _build_comprehensive_table(info, None, None),
        }


def _build_comprehensive_table(info: dict, medium_term, long_term) -> dict:
    """Flat key-value dict of all display metrics."""
    info = info or {}
    dy = info.get("dividendYield")
    mc = info.get("marketCap", 0) or 0
    mc_cr = round((mc * 83) / 1e7, 0) if mc else None

    return {
        "pe_ratio": _safe_float(info.get("trailingPE")),
        "forward_pe": _safe_float(info.get("forwardPE")),
        "peg_ratio": _safe_float(info.get("pegRatio")),
        "market_cap_cr": mc_cr,
        "eps_ttm": _safe_float(info.get("trailingEps")),
        "revenue_growth_yoy": round(_safe_float(info.get("revenueGrowth"), 0) * 100, 1) if info.get("revenueGrowth") else None,
        "earnings_growth_yoy": round(_safe_float(info.get("earningsGrowth"), 0) * 100, 1) if info.get("earningsGrowth") else None,
        "profit_margin": round(_safe_float(info.get("profitMargins"), 0) * 100, 1) if info.get("profitMargins") else None,
        "roe": round(_safe_float(info.get("returnOnEquity"), 0) * 100, 1) if info.get("returnOnEquity") else None,
        "debt_to_equity": round(_safe_float(info.get("debtToEquity"), 0) / 100, 2) if info.get("debtToEquity") else None,
        "dividend_yield": round(_safe_float(dy, 0) * 100, 2) if dy else None,
        "beta": _safe_float(info.get("beta")),
        "fifty_two_week_high": _safe_float(info.get("fiftyTwoWeekHigh")),
        "fifty_two_week_low": _safe_float(info.get("fiftyTwoWeekLow")),
        "avg_volume": info.get("averageVolume"),
        "revenue_cagr_3y": long_term.get("revenue_cagr_3y") if long_term else None,
        "fcf_positive": long_term.get("fcf_positive") if long_term else None,
        "earnings_beat_rate": medium_term.get("earnings_beat_rate") if medium_term else None,
        "earnings_momentum": medium_term.get("earnings_momentum") if medium_term else None,
    }
