import os
from .market_intelligence import analyze_single_holding

async def run_portfolio_analysis(holdings_data: list[dict]) -> dict:
    """
    Shared core logic for both GET (CSV) and POST (JSON) portfolio analysis.
    Accepts a list of dicts with keys: symbol, quantity, avg_cost, pnl
    """
    results = []
    
    import asyncio

    async def process_holding(h):
        try:
            symbol = h["symbol"]
            qty = float(h["quantity"])
            avg_cost = float(h["avg_cost"])
            pnl = float(h.get("pnl", 0.0))
            holding_id = h.get("id")
            if not symbol or qty <= 0: return None
            return await analyze_single_holding(symbol, avg_cost, qty, pnl, holding_id=holding_id)
        except Exception as e:
            print(f"DEBUG: Critical failure on holding {h}: {e}")
            return None

    tasks = [process_holding(h) for h in holdings_data]
    batch_results = await asyncio.gather(*tasks)
    results = [r for r in batch_results if r and r.get("success")]

    if not results:
        return {
            "portfolio_summary": {
                "health": "N/A",
                "risk_level": "Unknown",
                "total_invested": 0,
                "total_value_live": 0,
                "total_pnl": 0,
                "win_rate": "0%",
                "insight": "Could not fetch live market data for any symbols. Please check ticker symbols.",
                "working_capital_pct": 0,
                "trapped_capital_pct": 0
            },
            "recommended_actions": ["No valid data to generate recommendations. Ensure symbols are correct."],
            "portfolio_analysis": []
        }

    total_invested = sum(r['holding_context'].get('invested_value', 0) for r in results)
    total_value_live = sum(r['holding_context'].get('current_value', 0) for r in results)
    total_pnl = sum(r['holding_context'].get('current_pnl', 0) for r in results)

    winners = sum(1 for r in results if r['holding_context'].get('current_pnl', 0) > 0)
    losers = len(results) - winners
    win_rate = f"{(winners / len(results) * 100):.1f}%" if results else "0%"

    cut_losses_count = sum(1 for r in results if "CUT LOSSES" in r.get('data', {}).get('portfolio_decision', ''))
    ride_trend_count = sum(1 for r in results if "RIDE TREND" in r.get('data', {}).get('portfolio_decision', ''))

    working_capital = 0.0
    trapped_capital = 0.0
    recommendations = []

    for r in results:
        h_ctx = r.get('holding_context', {})
        val = h_ctx.get('current_value', 0)
        weight = round((val / total_value_live * 100) if total_value_live > 0 else 0.0, 2)
        h_ctx['portfolio_weight_pct'] = weight
        if weight > 25:
            sym = r['symbol']
            recommendations.append(f"Consider trimming {sym} — {weight}% of portfolio is overweight.")

        trend = r.get('data', {}).get('trend', '')
        if trend == 'Bullish':
            working_capital += val
        elif trend == 'Bearish':
            trapped_capital += val

    working_capital_pct = round((working_capital / total_value_live * 100) if total_value_live > 0 else 0.0, 1)
    trapped_capital_pct = round((trapped_capital / total_value_live * 100) if total_value_live > 0 else 0.0, 1)

    risk_level = "Low"
    health = "Strong"

    bearish_count = sum(1 for r in results if r.get('data', {}).get('trend') == 'Bearish')
    bullish_count = sum(1 for r in results if r.get('data', {}).get('trend') == 'Bullish')
    
    if total_pnl < 0:
        health = "Weak" if total_pnl < -10000 else "Fair"
    
    if losers > winners:
        health = "Weak"
    elif cut_losses_count > 0:
        health = "Fair"

    if total_pnl < -1000:
        bad_count = len([r for r in results if r['holding_context']['current_pnl'] < 0])
        insight = f"Portfolio underwater (₹{abs(total_pnl):.0f} loss). {bad_count} of {len(results)} positions in red."
    elif bearish_count > bullish_count:
        insight = f"Bearish momentum across {bearish_count} holdings. Risk management is priority."
    elif bullish_count > bearish_count:
        insight = f"{bullish_count} holdings trending well. Capital efficiency: {working_capital_pct}%."
    else:
        insight = "Mixed performance. Review individual trends for adjustments."

    if len(results) > 0 and (cut_losses_count / len(results)) >= 0.3:
        risk_level = "High"
    elif cut_losses_count > 0 or total_pnl < -5000:
        risk_level = "Medium"

    if winners > 0:
        recommendations.append("Let winners run with trailing stop-losses.")
    
    # RISK SENTINEL: Detect Trend Exhaustion for "Skip Losses"
    for r in results:
        h_ctx = r.get('holding_context', {})
        pnl_pct = (h_ctx.get('current_pnl', 0) / h_ctx.get('invested_value', 1)) * 100
        
        # Simple logical exhaustion: RSI > 75 and Volume Ratio > 2.0 while price is flat
        indicators = r.get('data', {}).get('indicators', {})
        rsi = indicators.get('RSI', 50)
        vol_ratio = r.get('data', {}).get('Vol_Ratio', 1.0)
        
        if rsi > 75 and vol_ratio > 1.8:
            recommendations.append(f"RISK SENTINEL: {r['symbol']} shows extreme exhaustion (RSI:{rsi:.0f}). Exit now to skip a likely reversal.")
        elif pnl_pct < -15 and r.get('data', {}).get('trend') == 'Bearish':
            recommendations.append(f"RISK SENTINEL: {r['symbol']} is in a freefall. Cut losses to preserve remaining capital.")

    if losers > winners:
        recommendations.append("Review win-rate; entries might need refinement.")

    return {
        "portfolio_summary": {
            "health": health,
            "risk_level": risk_level,
            "total_invested": round(total_invested, 2),
            "total_value_live": round(total_value_live, 2),
            "total_pnl": round(total_pnl, 2),
            "win_rate": win_rate,
            "insight": insight,
            "working_capital_pct": working_capital_pct,
            "trapped_capital_pct": trapped_capital_pct
        },
        "recommended_actions": recommendations,
        "portfolio_analysis": results
    }
