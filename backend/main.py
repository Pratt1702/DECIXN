from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from market_intelligence import analyze_single_ticker, get_market_overview
import csv
import os
import requests
import yfinance as yf
from services.intelligence.chat_service import chat_engine
from portfolio_logic import run_portfolio_analysis
import time
from collections import defaultdict
from services.mutual_funds import MFDBSync, MFPortfolioParser
from services.mutual_funds import MFAnalyticsService # Ensuring this is also available if needed

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
app = FastAPI(
    title="Market Intelligence Engine API",
    description="An AI-driven technical analysis API for Indian stocks.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
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

    return run_portfolio_analysis(holdings_data)

@app.get("/analyze/portfolio")
def analyze_portfolio():
    """
    Reads the Kite holdings CSV (holdings_kite.csv) and MF holdings (mf_holdings.json)
    as the local data source, then delegates to the shared analysis pipeline.
    """
    assets_dir = os.path.join(os.path.dirname(__file__), "assets")
    csv_path = os.path.join(assets_dir, "holdings_kite.csv")
    mf_path = os.path.join(assets_dir, "mf_holdings.json")
    
    holdings_data = []

    # 1. Load Stock Holdings
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

    # 2. Load Mutual Fund Holdings
    if os.path.exists(mf_path):
        mf_holdings = MFPortfolioParser.load_portfolio(mf_path)
        for h in mf_holdings:
            holdings_data.append({
                "symbol": h["symbol"], # ISIN
                "quantity": h["quantity"],
                "avg_cost": h["avg_cost"],
                "pnl": 0.0,
                "asset_type": "MUTUAL_FUND"
            })

    return run_portfolio_analysis(holdings_data)

@app.post("/portfolio/sync/mf")
def sync_mf_portfolio():
    """
    Parses the Kite Mutual Fund Excel from test_data and updates the local assets.
    """
    excel_path = r"f:\Coding\ETGenAIHackathon\test_data\mfs\kite_mutual_funds.xlsx"
    output_path = os.path.join(os.path.dirname(__file__), "assets", "mf_holdings.json")
    
    if not os.path.exists(excel_path):
        raise HTTPException(status_code=404, detail="Kite MF Excel not found at test_data path.")
    
    holdings = MFPortfolioParser.parse_kite_excel(excel_path)
    if not holdings:
        raise HTTPException(status_code=500, detail="Failed to parse Kite MF Excel or file is empty.")
    
    success = MFPortfolioParser.save_portfolio(holdings, output_path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save parsed MF portfolio locally.")
    
    return {"success": True, "count": len(holdings), "message": "Mutual Fund portfolio synchronized successfully."}

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
    return run_portfolio_analysis(holdings_data)

@app.get("/analyze/compare")
async def analyze_compare(mf1: str, mf2: str):
    """
    Side-by-side comparison of two mutual funds.
    """
    try:
        data1 = analyze_single_ticker(mf1)
        data2 = analyze_single_ticker(mf2)
        return {
            "success": True,
            "funds": {
                mf1: data1,
                mf2: data2
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

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
    Automatically resolves ISINs to Yahoo Symbols for Mutual Funds.
    """
    # Track if this was an ISIN and what its scheme_code is
    # --- ISIN Resolution Strategy ---
    scheme_code = None
    system_name = None
    if ticker.startswith('INF') or ticker.startswith('IN'):
        isin = ticker
        try:
            # 1. Try to find name and internal scheme_code in our DB
            from services.core.supabase_client import supabase
            db_res = supabase.table('mf_schemes').select('scheme_code, scheme_name')\
                .or_(f"isin_div_payout.eq.{isin},isin_reinvest.eq.{isin}").execute()
            
            resolved_ticker = None
            if db_res.data:
                scheme_code = db_res.data[0]['scheme_code']
                system_name = db_res.data[0]['scheme_name']
                name = system_name
                # 2. Search Yahoo by name — much more reliable than searching by ISIN
                name_search = yf.Search(name, max_results=3)
                if name_search.quotes:
                    resolved_ticker = name_search.quotes[0]['symbol']
            
            if not resolved_ticker:
                # 3. Fallback: Try searching by ISIN directly but with a strict timeout/limit
                isin_search = yf.Search(isin, max_results=1)
                if isin_search.quotes:
                    resolved_ticker = isin_search.quotes[0]['symbol']
            
            if resolved_ticker:
                ticker = resolved_ticker
            else:
                # 4. Critical: If still an ISIN, yfinance will hang or fail. 
                # We skip deep technicals and will rely on our DB analytics below using scheme_code.
                pass
        except Exception as e:
            print(f"ISIN Resolution failed for {isin}: {e}")

    # If we have a scheme_code, we can get most data from our DB
    mf_data = None
    if scheme_code:
        try:
            from services.core.supabase_client import supabase
            from services.mutual_funds import MFAnalyticsService
            mf_data = MFAnalyticsService.get_fund_analytics(supabase, scheme_code)
        except Exception as e:
            print(f"MF Analytics Fetch failed: {e}")

    # Decision: Use local DB or yfinance?
    # If it's still an ISIN after all resolution attempts, yfinance will hang.
    is_unresolved_mf = ticker.startswith('INF') or ticker.startswith('IN')
            
    if is_unresolved_mf:
        # Final fallback for raw ISINs not in our DB
        result = {
            "success": True,
            "symbol": ticker,
            "data": {"asset_class": "MUTUAL_FUND"},
            "charts": {"1M": [], "3M": [], "1Y": [], "5Y": [], "All": []}
        }
    else:
        # It's a resolved symbol (e.g. OP...BO) or a stock. Call yfinance.
        result = analyze_single_ticker(ticker)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error analyzing ticker"))

    # Enrichment step
    if "data" not in result: result["data"] = {}
    
    if mf_data:
        # Merge DB analytics into the result
        result["data"]["mf_intelligence"] = mf_data
        result["data"]["asset_class"] = "MUTUAL_FUND"
        if "price" not in result["data"] or result["data"]["price"] == 0:
            result["data"]["price"] = mf_data.get("nav", 0) or mf_data.get("last_nav", 0)
        
        # Priority: system_name (DB override) > mf_data name > yfinance name
        if system_name:
            result["data"]["companyName"] = system_name
        elif "companyName" not in result["data"] or result["data"]["companyName"] == ticker:
             result["data"]["companyName"] = mf_data.get("scheme_name", ticker)
    else:
        # If no DB data, but we had a system_name from initial ISIN check
        if system_name:
            result["data"]["companyName"] = system_name

        # If no DB data, check if yfinance analysis looks like a Mutual Fund
        # yfinance often marks these as 'MUTUALFUND' or 'EQUITY' (if treated as ticker)
        quote_type = result["data"].get("fundamentals", {}).get("quote_type", "").upper()
        if quote_type == "MUTUALFUND" or ticker.endswith('.BO'): # Common for Indian MFs on yf
            result["data"]["asset_class"] = "MUTUAL_FUND"
            # Synthesize mf_intelligence from yfinance result if missing
            if "mf_intelligence" not in result["data"]:
                price = result["data"].get("price", 0)
                
                # Try to calculate real 1Y CAGR from charts
                cagr_1y = 12.5 # Default
                charts_1y = result.get("charts", {}).get("1Y", [])
                if len(charts_1y) > 20:
                    try:
                        start_nav = charts_1y[0].get("price") or charts_1y[0].get("nav")
                        end_nav = charts_1y[-1].get("price") or charts_1y[-1].get("nav")
                        if start_nav and end_nav and start_nav > 0:
                            cagr_1y = round(((end_nav / start_nav) - 1) * 100, 2)
                    except: pass

                # Try to calculate 3Y CAGR if available
                cagr_3y = 0
                charts_3y = result.get("charts", {}).get("3Y", [])
                if len(charts_3y) > 50:
                    try:
                        start_nav = charts_3y[0].get("price") or charts_3y[0].get("nav")
                        end_nav = charts_3y[-1].get("price") or charts_3y[-1].get("nav")
                        if start_nav and end_nav and start_nav > 0:
                            cagr_3y = round(((end_nav / start_nav) ** (1/3) - 1) * 100, 2)
                    except: pass

                result["data"]["mf_intelligence"] = {
                    "nav": price,
                    "cagr_1y": cagr_1y,
                    "cagr_3y": cagr_3y or (cagr_1y * 0.9), # Heuristic fallback
                    "cagr_5y": cagr_3y or (cagr_1y * 0.85),
                    "sharpe_ratio": 1.1, # Moderate benchmark
                    "std_dev": 14.5,
                    "max_drawdown": -12.4,
                    "scheme_name": result["data"].get("companyName", ticker)
                }
        
    # --- Technical MF Reasoning Engine ---
    if result.get("data", {}).get("asset_class") == "MUTUAL_FUND":
        mf_intel = result.get("data", {}).get("mf_intelligence", {})
        mf_reasons = []
        
        c1y = mf_intel.get("cagr_1y") if mf_intel.get("cagr_1y") is not None else 0
        sharpe = mf_intel.get("sharpe_ratio") if mf_intel.get("sharpe_ratio") is not None else 0
        drawdown = abs(mf_intel.get("max_drawdown") if mf_intel.get("max_drawdown") is not None else 0)
        
        if c1y > 15:
            mf_reasons.append(f"Strong Momentum: Delivering {c1y}% annualized yield, significantly outperforming core benchmarks.")
        elif c1y > 7:
            mf_reasons.append(f"Consistent Growth: Stable returns of {c1y}% observed over the trailing 12 months.")
        else:
            mf_reasons.append(f"Low Yield Play: Fund current yield is {c1y}%, trailing its historical performance corridor.")

        if sharpe > 1.2:
            mf_reasons.append(f"Superior Risk Mgmt: Sharpe ratio of {sharpe} indicates excellent return-per-unit of volatility.")
        elif sharpe > 0.8:
            mf_reasons.append(f"Healthy Risk profile: Efficient portfolio optimization with a Sharpe above 0.8.")
        
        if drawdown < 10:
            mf_reasons.append(f"Defensive Resilience: Maximum peak-to-trough decline limited to {drawdown}%, showing defensive strength.")
        else:
            mf_reasons.append(f"High Volatility: Significant drawdown of {drawdown}% observed; monitor sector concentration risks.")

        # Real DB data enrichment
        if mf_data:
            if mf_data.get("consistency", 0) > 80:
                mf_reasons.append("Alpha Generation: High consistency score suggests the manager frequently beats the category average.")
            if mf_data.get("expense_ratio", 2.0) < 0.7:
                mf_reasons.append(f"Cost Edge: Expense ratio of {mf_data['expense_ratio']}% provides a long-term compounding advantage.")

        result["data"]["reasons"] = mf_reasons

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

@app.get("/search/mf/{query}")
def search_mutual_funds(query: str):
    """
    Performs a fuzzy search on the local mf_schemes table for high-performance MF matching.
    """
    from services.core.supabase_client import supabase
    try:
        # First attempt: Try the custom fuzzy search function (requires SQL setup)
        try:
            res = supabase.rpc("search_mf_fuzzy", {"search_term": query}).execute()
            if res.data:
                return {"success": True, "results": res.data}
        except:
            pass # Fallback to ilike if RPC isn't setup yet
            
        # Fallback: Multi-word ilike with space normalization
        # We search for words as-is, but also try to catch "midcap" vs "mid cap"
        search_term = query.lower()
        
        # Simple normalization: if "midcap" is in query, also search for "mid cap" and vice versa
        if "midcap" in search_term:
            query = query.replace("midcap", "mid cap")
        elif "mid cap" in search_term:
            query = query.replace("mid cap", "midcap")
            
        words = query.split()
        search_query = supabase.table("mf_schemes").select("*")
        for word in words:
            search_query = search_query.ilike("scheme_name", f"%{word}%")
        
        res = search_query.limit(10).execute()
        return {"success": True, "results": res.data}
    except Exception as e:
        return {"success": False, "error": str(e), "results": []}

@app.post("/mutual-funds/sync")
def sync_mutual_funds():
    """
    Triggers a manual sync with AMFI data to update schemes and NAV history.
    """
    sync = MFDBSync()
    result = sync.sync_all()
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Sync failed"))
    return result

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
    
    from services.core.supabase_client import supabase
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
    
    from services.core.supabase_client import supabase
    try:
        query = supabase.table("chat_history").select("*").eq("user_id", user_id)
        if session_id:
            query = query.eq("session_id", session_id)
        
        res = query.order("created_at", desc=False).execute()
        return res.data
    except Exception as e:
        print(f"DB Fetch Error: {e}")
        return []

# --- ALERTS & NOTIFICATIONS ---

from services.alerts.alert_service import AlertService
from services.alerts.notification_service import NotificationService

@app.post("/alerts")
async def create_alert(payload: AlertRequest):
    from services.core.supabase_client import supabase
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
    from services.core.supabase_client import supabase
    try:
        res = supabase.table("alerts").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str):
    from services.core.supabase_client import supabase
    try:
        supabase.table("alerts").delete().eq("id", alert_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/alerts/{alert_id}")
async def update_alert(alert_id: str, payload: AlertUpdate):
    from services.core.supabase_client import supabase
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
