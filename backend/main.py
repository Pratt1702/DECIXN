from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from market_intelligence import analyze_single_ticker

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

@app.get("/analyze/{ticker}")
def analyze_ticker(ticker: str):
    """
    Analyzes a specific ticker and returns deeply nested market intelligence data including indicators,
    boolean signals, overall trend, generated decision, and a confidence score.
    """
    result = analyze_single_ticker(ticker)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error analyzing ticker"))
        
    return result

if __name__ == "__main__":
    # uvicorn main:app --reload
    pass
