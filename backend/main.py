from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from market_intelligence import analyze_single_ticker, analyze_single_holding
import csv
import os

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

@app.get("/")
def read_root():
    return {"message": "Welcome to the Market Intelligence Engine API. Use /analyze/{ticker} to get analysis."}

@app.get("/analyze/portfolio")
def analyze_portfolio():
    """
    Reads the Kite holdings CSV (`holdings_kite.csv`), extracts the portfolio context 
    (Avg Cost, Qty, P&L), and batches intelligence requests to decide whether to 
    Average Down, Cut Losses, Ride Trend, or Book Profits.
    """
    csv_path = "holdings_kite.csv"
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="Holdings CSV not found in backend directory.")
        
    results = []
    
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader, None) # skip header row
        
        for row in reader:
            if not row or len(row) < 7:
                continue
                
            try:
                # Column 0: Instrument
                symbol = row[0].replace('"', '').replace("'", '').strip()
                if not symbol:
                    continue
                
                # Column 1: Quantity
                qty_str = row[1].replace('"', '').replace(',', '').strip()
                qty = float(qty_str) if qty_str else 0.0
                
                # Column 2: Average Cost
                avg_cost_str = row[2].replace('"', '').replace(',', '').strip()
                avg_cost = float(avg_cost_str) if avg_cost_str else 0.0
                
                # Column 6: P&L
                pnl_str = row[6].replace('"', '').replace(',', '').strip()
                pnl = float(pnl_str) if pnl_str else 0.0
                
                res = analyze_single_holding(symbol, avg_cost, qty, pnl)
                if res.get("success"):
                    results.append(res)
            except Exception as e:
                # Log but continue batch processing
                print(f"Failed to process holding {row}: {e}")
                
    if not results:
        return {"error": "No valid holdings analyzed."}
        
    # Portfolio Brain Aggregation Phase
    total_invested = sum(r['holding_context']['invested_value'] for r in results)
    total_value_live = sum(r['holding_context']['current_value'] for r in results)
    total_pnl = sum(r['holding_context']['current_pnl'] for r in results)
    
    winners = sum(1 for r in results if r['holding_context']['current_pnl'] > 0)
    losers = len(results) - winners
    win_rate = f"{(winners / len(results) * 100):.1f}%"
    
    cut_losses_count = sum(1 for r in results if "CUT LOSSES" in r['data']['portfolio_decision'])
    ride_trend_count = sum(1 for r in results if "RIDE TREND" in r['data']['portfolio_decision'])
    
    # Structural Weights
    for r in results:
        val = r['holding_context']['current_value']
        # Weight percentage format (using live value as base)
        r['holding_context']['portfolio_weight_pct'] = round((val / total_value_live * 100) if total_value_live > 0 else 0.0, 2)
        
    # Risk and Health Insight Generation
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
        
    # Dynamic bad stocks list
    bad_stocks = [r['symbol'].replace('.NS','') for r in results if "CUT LOSSES" in r['data']['portfolio_decision']]
    bad_str = f" like {', '.join(bad_stocks[:2])}" if bad_stocks else ""
    
    if (cut_losses_count / len(results)) >= 0.4:
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
        
    # Prioritization Sorting
    # 1. High Urgency first
    # 2. Then by Worst P&L % -> Best P&L %
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

@app.get("/analyze/{ticker}")
def analyze_ticker(ticker: str):
    """
    Analyzes a specific ticker and returns deeply nested market intelligence data.
    """
    result = analyze_single_ticker(ticker)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error analyzing ticker"))
        
    return result

if __name__ == "__main__":
    # uvicorn main:app --reload
    pass
