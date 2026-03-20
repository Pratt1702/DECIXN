from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from market_intelligence import analyze_single_ticker, analyze_single_holding
import csv
import os
import requests

app = FastAPI(
    title="Market Intelligence Engine API",
    description="An AI-driven technical analysis API for Indian stocks.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TickerRequest(BaseModel):
    ticker: str

class HoldingInput(BaseModel):
    symbol: str
    quantity: float
    avg_cost: float
    current_value: float
    pnl: float

class PortfolioInput(BaseModel):
    holdings: list[HoldingInput]

@app.get("/")
def read_root():
    return {"message": "Welcome to the Market Intelligence Engine API. Use /analyze/{ticker} to get analysis."}

def _run_portfolio_analysis(holdings_data: list[dict]) -> dict:
    """
    Shared core logic for both GET (CSV) and POST (JSON) portfolio analysis.
    Accepts a list of dicts with keys: symbol, quantity, avg_cost, pnl
    """
    results = []
    for h in holdings_data:
        try:
            symbol = h["symbol"]
            qty = float(h["quantity"])
            avg_cost = float(h["avg_cost"])
            pnl = float(h["pnl"])
            if not symbol or qty <= 0:
                continue
            res = analyze_single_holding(symbol, avg_cost, qty, pnl)
            if res.get("success"):
                results.append(res)
        except Exception as e:
            print(f"Failed to process holding {h}: {e}")

    if not results:
        return {"error": "No valid holdings analyzed."}

    total_invested = sum(r['holding_context']['invested_value'] for r in results)
    total_value_live = sum(r['holding_context']['current_value'] for r in results)
    total_pnl = sum(r['holding_context']['current_pnl'] for r in results)

    winners = sum(1 for r in results if r['holding_context']['current_pnl'] > 0)
    losers = len(results) - winners
    win_rate = f"{(winners / len(results) * 100):.1f}%"

    cut_losses_count = sum(1 for r in results if "CUT LOSSES" in r['data']['portfolio_decision'])
    ride_trend_count = sum(1 for r in results if "RIDE TREND" in r['data']['portfolio_decision'])

    for r in results:
        val = r['holding_context']['current_value']
        r['holding_context']['portfolio_weight_pct'] = round((val / total_value_live * 100) if total_value_live > 0 else 0.0, 2)

    risk_level = "Low"
    health = "Strong"
    insight = "Portfolio is stable and assets are trending well."
    recommendations = []

    if losers > winners:
        health = "Weak"
        insight = "Majority of holdings are currently sitting at a loss."
    elif cut_losses_count > 0:
        health = "Fair"
        insight = "Mixed performance with several dragging assets."

    bad_stocks = [r['symbol'].replace('.NS','') for r in results if "CUT LOSSES" in r['data']['portfolio_decision']]
    bad_str = f" like {', '.join(bad_stocks[:2])}" if bad_stocks else ""

    if len(results) > 0 and (cut_losses_count / len(results)) >= 0.4:
        risk_level = "High"
        insight = "High concentration of capital in assets experiencing strong downtrends."
        recommendations.append(f"High urgency: Cut losses in deeply bearish stocks{bad_str} to preserve capital.")
    elif cut_losses_count > 0:
        risk_level = "Medium"
        recommendations.append(f"Consider trimming exposure to assets in confirmed downtrends{bad_str}.")

    if losers > winners:
        recommendations.append("Review your entry strategies; win-rate is currently upside down.")

    if ride_trend_count == 0:
        recommendations.append("Reallocate freed capital to stronger market leaders; currently lacking strong bullish momentum.")
    else:
        recommendations.append("Let your winners run. Use trailing stop-losses to lock in profits on uptrends.")

    def sort_key(r):
        u_map = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        urgency = u_map.get(r['data'].get('urgency_score', "LOW"), 3)
        worst_pnl = r['holding_context'].get('pnl_pct', 0)
        return (urgency, worst_pnl)

    results.sort(key=sort_key)

    return {
        "portfolio_summary": {
            "health": health,
            "risk_level": risk_level,
            "total_invested": round(total_invested, 2),
            "total_value_live": round(total_value_live, 2),
            "total_pnl": round(total_pnl, 2),
            "win_rate": win_rate,
            "insight": insight
        },
        "recommended_actions": recommendations,
        "portfolio_analysis": results
    }

@app.get("/analyze/portfolio")
def analyze_portfolio():
    """
    Reads the Kite holdings CSV (holdings_kite.csv) as a fallback data source,
    then delegates to the shared analysis pipeline.
    """
    csv_path = "holdings_kite.csv"
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="Holdings CSV not found in backend directory.")

    holdings_data = []
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader, None)  # skip header
        for row in reader:
            if not row or len(row) < 7:
                continue
            try:
                symbol = row[0].replace('"', '').replace("'", '').strip()
                qty = float(row[1].replace('"', '').replace(',', '').strip() or 0)
                avg_cost = float(row[2].replace('"', '').replace(',', '').strip() or 0)
                pnl = float(row[6].replace('"', '').replace(',', '').strip() or 0)
                cur_val = float(row[4].replace('"', '').replace(',', '').strip() or 0)
                if symbol and qty > 0:
                    holdings_data.append({"symbol": symbol, "quantity": qty, "avg_cost": avg_cost, "pnl": pnl, "current_value": cur_val})
            except Exception as e:
                print(f"Failed to parse CSV row {row}: {e}")

    return _run_portfolio_analysis(holdings_data)

@app.post("/analyze/portfolio")
def analyze_portfolio_custom(payload: PortfolioInput):
    """
    Accepts a JSON array of holdings from the frontend (uploaded CSV session data),
    bypassing the backend CSV file entirely. Same analysis pipeline is applied.
    """
    holdings_data = [
        {
            "symbol": h.symbol,
            "quantity": h.quantity,
            "avg_cost": h.avg_cost,
            "pnl": h.pnl,
            "current_value": h.current_value,
        }
        for h in payload.holdings
    ]
    return _run_portfolio_analysis(holdings_data)

@app.get("/analyze/{ticker}")
def analyze_ticker(ticker: str):
    """
    Analyzes a specific ticker and returns deeply nested market intelligence data.
    """
    result = analyze_single_ticker(ticker)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error analyzing ticker"))
        
    return result

@app.get("/search/{query}")
def search_stocks(query: str):
    """
    Provides real-time search autocomplete for symbols and company names matching the query.
    """
    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=8&newsCount=0"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(url, headers=headers)
        data = response.json()
        results = []
        for quote in data.get("quotes", []):
            exchange = quote.get("exchange", "")
            # Filter solely for Indian Equities to avoid gibberish Mutual Funds/Indices
            if quote.get("quoteType") == "EQUITY" and exchange in ["NSI", "BSE"]:
                sym = quote.get("symbol", "")
                name = quote.get("shortname", quote.get("longname", sym))
                results.append({"symbol": sym, "name": name})
        return {"success": True, "results": results}
    except Exception as e:
        return {"success": False, "error": str(e), "results": []}

if __name__ == "__main__":
    # uvicorn main:app --reload
    pass
