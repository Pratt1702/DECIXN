import sys
if sys.version_info >= (3, 13):
    print(f"WARNING: You are running on Python {sys.version}. This project is optimized for 3.11 and 3.12.")
    print("Dependencies or code may not work as expected.")
    

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from services.market_intelligence import analyze_single_ticker, analyze_single_holding, get_market_overview
import csv
import os
import requests
import yfinance as yf
from services.agent.chat_service import chat_engine
from prediction_model.forecast import run_prediction
from services.portfolio_logic import run_portfolio_analysis
import time
from collections import defaultdict
from services.mutual_funds.mf_search_service import search_mf_fuzzy as mf_search
from services.mutual_funds.mf_portfolio_service import run_mf_portfolio_analysis
from services.mutual_funds.mf_data_service import get_mf_latest_details
from services.mutual_funds import mf_analytics_service
from pydantic import BaseModel
from services.alerts.alert_service import AlertService

class MFInsightsRequest(BaseModel):
    holdings: list[dict]
    profile: dict | None = None

class RateLimiter:
    def __init__(self, limit: int = 10, window: int = 1800):  # 10 msgs / 30 mins
        self.limit = limit
        self.window = window
        # Key: user_id, Value: {"count": int, "reset_time": float}
        self.users = defaultdict(lambda: {"count": 0, "reset_time": 0})

    def get_remaining(self, user_id: str):
        now = time.time()
        state = self.users[user_id]
        
        # Reset if window passed
        if now > state["reset_time"]:
            state["count"] = 0
            state["reset_time"] = now + self.window
            
        return max(0, self.limit - state["count"])

    def increment(self, user_id: str):
        remaining = self.get_remaining(user_id)
        if remaining > 0:
            self.users[user_id]["count"] += 1
            return True
        return False

rate_limiter = RateLimiter()

from services.news.ingestion_service import ingest_once
import asyncio

app = FastAPI(
    title="Market Intelligence Engine API",
    description="An AI-driven technical analysis API for Indian stocks.",
    version="1.0.0"
)

async def news_ingestion_loop():
    while True:
        try:
            print("[START] Starting scheduled news ingestion...")
            await ingest_once(limit=15)
            print("[DONE] Ingestion cycle complete.")
        except Exception as e:
            print(f"[ERROR] Ingestion loop error: {e}")
        await asyncio.sleep(900) # 15 minutes

async def alerts_check_loop():
    while True:
        try:
            print("[ALERT] Starting scheduled alert check...")
            await AlertService.process_all_alerts()
            print("[DONE] Alert check complete.")
        except Exception as e:
            print(f"[ERROR] Alert loop error: {e}")
        await asyncio.sleep(120) # 2 minutes

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(news_ingestion_loop())
    asyncio.create_task(alerts_check_loop())

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for production flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TickerRequest(BaseModel):
    ticker: str

class StockHoldingInput(BaseModel):
    id: str | None = None
    symbol: str
    quantity: float
    avg_cost: float
    current_value: float = 0.0
    pnl: float = 0.0

class MFHoldingInput(BaseModel):
    symbol: str = None  # Scheme Name or Display Name
    isin: str
    quantity: float
    avg_cost: float
    current_value: float = 0.0
    pnl: float = 0.0

class StockPortfolioInput(BaseModel):
    holdings: list[StockHoldingInput]

class MFPortfolioInput(BaseModel):
    holdings: list[MFHoldingInput]

class BatchQuotesRequest(BaseModel):
    symbols: list[str]

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    portfolio_context: str = None
    user_id: str = "anonymous"
    session_id: str = None

from typing import Union

class AlertCondition(BaseModel):
    indicator: str
    operator: str
    value: Union[float, str]

class AlertRequest(BaseModel):
    user_id: str
    symbol: str
    condition: list[AlertCondition]

class AlertUpdate(BaseModel):
    is_active: bool = None
    is_triggered: bool = None

@app.get("/")
def read_root():
    return {"message": "Welcome to the Market Intelligence Engine API. Use /analyze/{ticker} to get analysis."}

@app.get("/analyze/portfolio")
async def analyze_portfolio():
    """
    Analyzes the user's portfolio from the fallback CSV.
    (Manual holdings are now managed local-only via frontend).
    """
    holdings_data = []

    csv_path = os.path.join(os.path.dirname(__file__), "assets", "holdings_kite.csv")
    if os.path.exists(csv_path):
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader, None)  # skip header
            for row in reader:
                if not row or len(row) < 3: continue
                try:
                    symbol = row[0].replace('"', '').replace("'", '').strip()
                    qty = float(row[1].replace('"', '').replace(',', '').strip() or 0)
                    avg_cost = float(row[2].replace('"', '').replace(',', '').strip() or 0)
                    if symbol and qty > 0:
                        holdings_data.append({"symbol": symbol, "quantity": qty, "avg_cost": avg_cost, "pnl": 0.0})
                except Exception as e:
                    print(f"Failed to parse CSV row {row}: {e}")

    if not holdings_data:
        raise HTTPException(status_code=404, detail="No fallback holdings found.")

    return await run_portfolio_analysis(holdings_data)



@app.post("/analyze/portfolio")
async def analyze_portfolio_custom(payload: StockPortfolioInput):
    """
    Accepts a JSON array of holdings from the frontend (uploaded CSV session data),
    bypassing the backend CSV file entirely. Same analysis pipeline is applied.
    """
    holdings_data = [
        {
            "id": h.id,
            "symbol": h.symbol,
            "quantity": h.quantity,
            "avg_cost": h.avg_cost,
            "pnl": h.pnl,
            "current_value": h.current_value,
        }
        for h in payload.holdings
    ]
    return await run_portfolio_analysis(holdings_data)

@app.get("/market/overview")
def get_market_overview_endpoint():
    """
    Returns real-time indices (NIFTY 50, SENSEX) and top gainers/losers.
    """
    return get_market_overview()

@app.get("/analyze/{ticker}")
async def analyze_ticker(ticker: str):
    """
    Analyzes a specific ticker and returns deeply nested market intelligence data.
    """
    result = await analyze_single_ticker(ticker)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error analyzing ticker"))
        
    return result

@app.get("/analyze/forecast/{ticker}")
async def forecast_ticker(ticker: str, confidence: int = 50, horizon: int = 5):
    """
    Generates an ATR-based price forecast for a specific ticker.
    """
    result = run_prediction(ticker, confidence_score=confidence, horizon_days=horizon)
    if not result.get("success"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error generating forecast"))
    return result

@app.get("/news")
async def get_all_news(limit: int = 20, offset: int = 0):
    """
    Returns a global feed of news from the database (Catalyst Engine).
    """
    try:
        from services.supabase_client import supabase
        # Fetch news with basic stock/sector info
        res = supabase.table("news") \
            .select("*, news_stocks(symbol), news_sectors(sector)") \
            .order("published_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
        return res.data
    except Exception as e:
        print(f"News Fetch Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/opportunity-radar")
async def get_radar(symbols: str = None):
    """
    Provides upcoming dividends and high-impact catalysts.
    'symbols' can be a comma-separated list of tickers.
    """
    ticker_list = None
    if symbols:
        ticker_list = [s.strip().upper() for s in symbols.split(",")]
        # Add .NS if missing and not a special symbol
        ticker_list = [s if ("." in s or "-" in s) else f"{s}.NS" for s in ticker_list]
        
    from services.opportunity_radar import get_market_opportunities
    radar = await get_market_opportunities(ticker_list)
    return radar

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

@app.get("/mf/search")
def search_mf(q: str):
    """
    Search for mutual fund schemes.
    """
    return mf_search(q)

@app.post("/mf/analyze/portfolio")
def analyze_mf_portfolio(payload: MFPortfolioInput):
    """
    Analyzes a mutual fund portfolio from JSON input.
    """
    holdings_data = [
        {
            "symbol": h.symbol,
            "quantity": h.quantity,
            "avg_cost": h.avg_cost,
            "isin": h.isin,
            "pnl": h.pnl,
            "current_value": h.current_value
        }
        for h in payload.holdings
    ]
    return run_mf_portfolio_analysis(holdings_data)

@app.get("/mf/details/{scheme_code}")
async def get_mf_details(scheme_code: str):
    """
    Get everything we know about a fund: Current NAV, historical points, info.
    """
    return get_mf_latest_details(scheme_code)

@app.post("/mf/analyze/insights")
async def analyze_mf_insights(request: MFInsightsRequest):
    """
    Generate deep analytical insights for a mutual fund portfolio.
    """
    try:
        insights = mf_analytics_service.get_portfolio_insights(request.holdings, request.profile)
        return {"success": True, "insights": insights}
    except Exception as e:
        print(f"MF Insights Error: {e}")
        return {"success": False, "error": str(e)}

@app.get("/mf/compare")
async def compare_mf(ids: str):
    """
    Compare multiple mutual funds side-by-side.
    """
    try:
        scheme_codes = ids.split(",")
        result = await mf_analytics_service.compare_mutual_funds(scheme_codes)
        return result
    except Exception as e:
        print(f"MF Compare Error: {e}")
        return {"success": False, "error": str(e)}

@app.get("/chat/status/{user_id}")
async def get_chat_status(user_id: str):
    """
    Returns the remaining messages for a specific user.
    """
    remaining = rate_limiter.get_remaining(user_id)
    return {"remaining_messages": remaining}

@app.post("/chat")
async def chat_with_foxy(payload: ChatRequest):
    """
    Orchestrates a conversation with Foxy v1 (Gemini) using market tools with streaming status.
    """
    # Rate Limiting check
    user_id = payload.user_id or "anonymous"
    remaining = rate_limiter.get_remaining(user_id)
    
    if remaining <= 0:
        return {
            "type": "error",
            "narrative": "You've reached your limit of 10 messages per 30 minutes. Please take a break and come back later!",
            "metadata": {"remaining_messages": 0},
            "ui_hints": {}
        }

    rate_limiter.increment(user_id)
    new_remaining = rate_limiter.get_remaining(user_id)

    from fastapi.responses import StreamingResponse
    import json

    async def event_generator():
        try:
            async for chunk in chat_engine.get_response(
                user_message=payload.message,
                chat_history=payload.history,
                portfolio_context=payload.portfolio_context,
                user_id=payload.user_id,
                session_id=payload.session_id
            ):
                # Inject remaining messages into final or any chunk that has metadata
                if isinstance(chunk, dict) and "type" in chunk:
                    if "metadata" not in chunk:
                        chunk["metadata"] = {}
                    chunk["metadata"]["remaining_messages"] = new_remaining
                
                yield json.dumps(chunk) + "\n"
        except Exception as e:
            print(f"STREAM ERROR: {e}")
            yield json.dumps({
                "type": "general",
                "narrative": f"I encountered an error: {str(e)}",
                "metadata": {"error": str(e)},
                "ui_hints": {}
            }) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")

@app.get("/chat/sessions/{user_id}")
async def get_chat_sessions(user_id: str):
    if not user_id or len(user_id) <= 20:
        return []
    
    from services.supabase_client import supabase
    try:
        # Get first message of each session as title
        # In a real app, we might have a sessions table, but here we derive it
        res = supabase.table("chat_history")\
            .select("session_id, content, created_at")\
            .eq("user_id", user_id)\
            .eq("role", "user")\
            .order("created_at", desc=True)\
            .execute()
        
        # Group by session_id to get only the latest unique sessions
        seen = set()
        sessions = []
        for row in res.data:
            sid = row["session_id"]
            if sid not in seen:
                sessions.append({
                    "id": sid,
                    "title": row["content"][:40] + ("..." if len(row["content"]) > 40 else ""),
                    "created_at": row["created_at"]
                })
                seen.add(sid)
        return sessions
    except Exception as e:
        import traceback
        print(f"DB Sessions Fetch Error: {str(e)}")
        traceback.print_exc()
        return []

@app.get("/chat/history/{user_id}")
async def get_chat_history(user_id: str, session_id: str = None):
    if not user_id or len(user_id) <= 20:
        return []
    
    from services.supabase_client import supabase
    try:
        query = supabase.table("chat_history").select("*").eq("user_id", user_id)
        if session_id:
            query = query.eq("session_id", session_id)
        
        res = query.order("created_at", desc=False).execute()
        return res.data
    except Exception as e:
        print(f"DB Fetch Error: {e}")
        return []

@app.delete("/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str):
    from services.supabase_client import supabase
    try:
        supabase.table("chat_history").delete().eq("session_id", session_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ALERTS & NOTIFICATIONS ---

from services.alerts.alert_service import AlertService
from services.alerts.notification_service import NotificationService

@app.post("/alerts")
async def create_alert(payload: AlertRequest):
    from services.supabase_client import supabase
    try:
        data = {
            "user_id": payload.user_id,
            "symbol": payload.symbol.upper(),
            "condition": [c.dict() for c in payload.condition],
            "is_active": True,
            "is_triggered": False
        }
        res = supabase.table("alerts").insert(data).execute()
        return {"success": True, "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/alerts/{user_id}")
async def get_alerts(user_id: str):
    from services.supabase_client import supabase
    try:
        res = supabase.table("alerts").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str):
    from services.supabase_client import supabase
    try:
        supabase.table("alerts").delete().eq("id", alert_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/alerts/{alert_id}")
async def update_alert(alert_id: str, payload: AlertUpdate):
    from services.supabase_client import supabase
    try:
        update_data = {}
        if payload.is_active is not None: update_data["is_active"] = payload.is_active
        if payload.is_triggered is not None: update_data["is_triggered"] = payload.is_triggered
        
        if not update_data:
            return {"success": True}
            
        res = supabase.table("alerts").update(update_data).eq("id", alert_id).execute()
        return {"success": True, "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/notifications/{user_id}")
async def get_notifications(user_id: str):
    return NotificationService.get_user_notifications(user_id)

@app.post("/notifications/read/{notification_id}")
async def mark_notification_read(notification_id: str):
    res = NotificationService.mark_as_read(notification_id)
    return {"success": True, "data": res}

@app.post("/alerts/run")
async def run_alerts_manually():
    """
    Manual trigger to run the alert evaluation engine.
    """
    await AlertService.process_all_alerts()
    return {"success": True, "message": "Alert processing completed."}

if __name__ == "__main__":
    # uvicorn main:app --reload
    pass
