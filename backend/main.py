from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from market_intelligence import analyze_single_ticker, analyze_single_holding, get_market_overview
import csv
import os
import requests
import yfinance as yf

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

class BatchQuotesRequest(BaseModel):
    symbols: list[str]

@app.get("/")
def read_root():
    return {"message": "Welcome to the Market Intelligence Engine API. Use /analyze/{ticker} to get analysis."}

def _run_portfolio_analysis(holdings_data: list[dict]) -> dict:
    """
    Shared core logic for both GET (CSV) and POST (JSON) portfolio analysis.
    Accepts a list of dicts with keys: symbol, quantity, avg_cost, pnl
    """
    results = []
    print(f"DEBUG: Processing portfolio with {len(holdings_data)} holdings.")
    
    for h in holdings_data:
        try:
            symbol = h["symbol"]
            qty = float(h["quantity"])
            avg_cost = float(h["avg_cost"])
            pnl = float(h.get("pnl", 0.0))
            if not symbol or qty <= 0:
                continue
                
            res = analyze_single_holding(symbol, avg_cost, qty, pnl)
            if res.get("success"):
                results.append(res)
                print(f"DEBUG: Analyzed {symbol} successfully.")
            else:
                print(f"DEBUG: Analysis failed for {symbol}: {res.get('error')}")
        except Exception as e:
            print(f"DEBUG: Critical failure on holding {h}: {e}")

    if not results:
        print("DEBUG: All holdings failed or portfolio is empty.")
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
            sym = r['symbol'].replace('.NS','')
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
    
    bad_stocks = [r['symbol'].replace('.NS','') for r in results if "CUT LOSSES" in r.get('data', {}).get('portfolio_decision', '')]
    bad_stocks_weights = sum(r['holding_context'].get('portfolio_weight_pct', 0) for r in results if "CUT LOSSES" in r.get('data', {}).get('portfolio_decision', ''))

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
    if losers > winners:
        recommendations.append("Review win-rate; entries might need refinement.")

    def sort_key(r):
        u_map = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        urgency = u_map.get(r.get('data', {}).get('urgency_score', "LOW"), 3)
        worst_pnl = r.get('holding_context', {}).get('pnl_pct', 0)
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
            "insight": insight,
            "working_capital_pct": working_capital_pct,
            "trapped_capital_pct": trapped_capital_pct
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
    csv_path = os.path.join(os.path.dirname(__file__), "assets", "holdings_kite.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="Holdings CSV not found in backend directory.")

    holdings_data = []
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader, None)  # skip header
        for row in reader:
            if not row or len(row) < 3:
                continue
            try:
                symbol = row[0].replace('"', '').replace("'", '').strip()
                qty = float(row[1].replace('"', '').replace(',', '').strip() or 0)
                avg_cost = float(row[2].replace('"', '').replace(',', '').strip() or 0)
                
                if symbol and qty > 0:
                    holdings_data.append({
                        "symbol": symbol, 
                        "quantity": qty, 
                        "avg_cost": avg_cost, 
                        "pnl": 0.0  # Force recalculation by providing zero fallback
                    })
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

@app.get("/market/overview")
def get_market_overview_endpoint():
    """
    Returns real-time indices (NIFTY 50, SENSEX) and top gainers/losers.
    """
    return get_market_overview()

@app.get("/analyze/{ticker}")
def analyze_ticker(ticker: str):
    """
    Analyzes a specific ticker and returns deeply nested market intelligence data.
    """
    result = analyze_single_ticker(ticker)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error analyzing ticker"))
        
    return result

@app.post("/quotes/batch")
def get_batch_quotes(payload: BatchQuotesRequest):
    """
    Fetches lightweight batch quotes for multiple symbols to power watchlists efficiently.
    Includes intraday sparkline data for trend visualization.
    """
    if not payload.symbols:
        return {"success": True, "results": []}
    
    stock_data = []
    
    for original in payload.symbols:
        sym = original.upper().replace(' ', '')
        if not sym.endswith('.NS') and not sym.endswith('.BO'):
            sym += '.NS'
            
        try:
            t = yf.Ticker(sym)
            # Fetch 5d intraday to ensure we have at least one valid trading session
            # (especially useful during weekends or after-hours where 1d might be empty)
            hist_5d = t.history(period="5d", interval="30m")
            hist_2d = t.history(period="2d")
            
            if len(hist_2d) >= 2:
                prev_close = float(hist_2d['Close'].iloc[-2])
                curr_price = float(hist_2d['Close'].iloc[-1])
                vol = float(hist_2d['Volume'].iloc[-1])
            elif len(hist_2d) == 1:
                prev_close = float(hist_2d['Close'].iloc[0])
                curr_price = float(hist_2d['Close'].iloc[0])
                vol = float(hist_2d['Volume'].iloc[0])
            else:
                continue
                
            change = curr_price - prev_close
            change_pct = (change / prev_close) * 100 if prev_close > 0 else 0
            
            # Extract sparkline points (closing prices from the LAST valid trading day in hist_5d)
            sparkline = []
            if not hist_5d.empty:
                # Group by date and take the last date's values
                last_date = hist_5d.index[-1].date()
                last_day_data = hist_5d[hist_5d.index.date == last_date]
                sparkline = [float(x) for x in last_day_data['Close'].tolist()]
            
            if len(sparkline) < 2:
                sparkline = [curr_price, curr_price] # Fallback to flat line instead of empty
            
            trend = "Bullish" if change_pct > 0 else ("Bearish" if change_pct < 0 else "Neutral")
            
            try:
                info = t.info
                company_name = info.get('shortName', info.get('longName', original))
                fifty_two_low = info.get('fiftyTwoWeekLow', curr_price * 0.8)
                fifty_two_high = info.get('fiftyTwoWeekHigh', curr_price * 1.2)
            except:
                company_name = original
                fifty_two_low = curr_price * 0.8
                fifty_two_high = curr_price * 1.2
                
            stock_data.append({
                "symbol": original,
                "companyName": company_name,
                "price": curr_price,
                "prevClose": prev_close,
                "change": change,
                "changePercent": change_pct,
                "volume": vol,
                "trend": trend,
                "fifty_two_week_low": fifty_two_low,
                "fifty_two_week_high": fifty_two_high,
                "sparkline": sparkline
            })
        except Exception as e:
            print(f"Error fetching quote for {original}: {e}")
            continue

    return {"success": True, "results": stock_data}

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
