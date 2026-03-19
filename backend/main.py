from fastapi import FastAPI, HTTPException
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
        reader = csv.DictReader(f)
        for row in reader:
            try:
                symbol = row.get('Instrument', '').strip()
                if not symbol:
                    continue
                
                # Qty can contain commas in larger numbers, so remove them
                qty_str = str(row.get('Qty', '0')).replace(',', '')
                qty = float(qty_str)
                
                # Fetch dynamically because Kite headers might contain `(?)` instead of `(₹)`
                def get_val(key_start):
                    for k in row.keys():
                        if k.startswith(key_start):
                            return float(str(row[k]).replace(',', ''))
                    return 0.0
                    
                avg_cost = get_val('Avg. cost')
                pnl = get_val('P&L')
                
                res = analyze_single_holding(symbol, avg_cost, qty, pnl)
                if res.get("success"):
                    results.append(res)
            except Exception as e:
                # Log but continue batch processing
                print(f"Failed to process holding {symbol}: {e}")
                
    return {"portfolio_analysis": results}

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
