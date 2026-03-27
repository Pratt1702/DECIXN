from google import genai
from ..config import GEMINI_API_KEY
from ..data_fetcher import fetch_data
from ..technical_indicators import calculate_indicators
from ..signal_generator import generate_signals
from ..decision_engine import make_decision, make_holding_decision
import json
import yfinance as yf
from datetime import datetime
from .agent_engine import run_agent_intelligence

client = genai.Client(api_key=GEMINI_API_KEY)

# Tool definitions for Gemini
TOOLS = [
    {
        "function_declarations": [
            {
                "name": "analyze_ticker",
                "description": "Deep technical/fundamental analysis. IMPORTANT: Use this if the user mentions personal 'holdings', 'shares', 'positions' of a SPECIFIC stock (e.g., 'Analyze my ETERNAL holdings'). Do NOT call analyze_portfolio unless they want a WHOLE-PORTFOLIO summary.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "ticker": {"type": "string", "description": "Ticker symbol or name"}
                    },
                    "required": ["ticker"]
                }
            },
            {
                "name": "get_market_overview",
                "description": "Current market indices (NIFTY, SENSEX) and sector movers. Use for 'How is the market?', 'Indices status', etc.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {}
                }
            },
            {
                "name": "analyze_full_portfolio",
                "description": "Comprehensive health check for the ENTIRE portfolio. Use this when the user asks for a 'portfolio review', 'holdings report', or 'overall health'.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "portfolio_type": {
                            "type": "string", 
                            "enum": ["stock", "mutual_fund"], 
                            "description": "The type of portfolio to analyze. Use 'stock' for equity holdings and 'mutual_fund' for fund holdings."
                        }
                    },
                    "required": ["portfolio_type"]
                }
            },
            {
                "name": "get_user_position",
                "description": "Checks if the user owns a specific stock or mutual fund. Returns avg cost and quantity.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "ticker": {"type": "string", "description": "The stock symbol or mutual fund name to check position for"},
                        "asset_type": {
                            "type": "string",
                            "enum": ["stock", "mutual_fund"],
                            "description": "Specify if checking for a 'stock' or a 'mutual_fund'."
                        }
                    },
                    "required": ["ticker", "asset_type"]
                }
            },
            {
                "name": "fetch_catalyst_news",
                "description": "Fetches the latest 3 news catalysts for a specific ticker OR sector from our local database. Use for 'What is the news on TCS?', 'Any banking sector updates?', etc.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "ticker": {"type": "string", "description": "Stock symbol (e.g. RELIANCE)"},
                        "sector": {"type": "string", "description": "Sector name (e.g. Banking, IT, Pharma)"}
                    }
                }
            }
        ]
    }
]

SYSTEM_INSTRUCTION = """
You are Foxy v1, a high-fidelity financial co-pilot and market analyst for the DECIXN platform. 

CORE RULES:
1. **Topic Enforcement**: You ONLY facilitate discussions related to finance, stock markets, and investment strategy.
2. **Off-Topic Constraint**: If the user asks about something completely unrelated to finance (e.g., jokes, recipes, weather, celebrity gossip, coding help), respond with "type": "off_topic" and "narrative": "Sorry I can't help you with that". 
3. **Financial Advice**: You ARE allowed and encouraged to help with portfolio allocation, stock analysis, and market strategy based on the data provided or fetched via tools.
4. **Data Retrieval**: Always use tools to fetch real-time data for market/ticker queries. Assume NSE (.NS) if suffix is missing.
5. **Tone**: Professional, sharp, data-driven, and slightly elite.
6. **Portfolio Context**: Use tool `get_user_position` if they ask about 'my position in X'. Use `analyze_full_portfolio` for overall health reports.
7. **Tool Chain**: You can and should call multiple tools in a single turn. For example, to analyze a user's Suzlon position, call `analyze_ticker(ticker='SUZLON')` AND `get_user_position(ticker='SUZLON')`.
8. **Deep Intelligence**: When the `analyze_ticker` tool returns `agent_intelligence`, PRIORITIZE that narrative and actionable verdict in your final response. Use it to provide a "Why Now?" explanation.
9. **News Citations**: Whenever you use `fetch_catalyst_news`, you **MUST** provide citations in your narrative using the format: [Article Title](URL). Also, populate the `metadata.sources` array with objects containing the title and url for each unique source used.

RESPONSE FORMAT (JSON ONLY):
{
  "type": "portfolio_analysis" | "stock_analysis" | "market_overview" | "general" | "off_topic",
  "narrative": "Your textual response (Markdown supported)",
  "metadata": {
    "tickers": ["SYMBOL"],
    "charts": ["SYMBOL1", "SYMBOL2"], // Max 3 tickers for interactive charts
    "sources": [{"title": "string", "url": "string"}], // Citation sources
    "portfolio_summary": { "health": "string", "total_pnl": number, "total_value_live": number, "win_rate": "string", "working_capital_pct": number },
    "portfolio_holdings": [{ "symbol": "string", "holding_context": { "portfolio_weight_pct": number } }], // Top 5
    "actionable_insight": "string",
    "sentiment": "Bullish" | "Bearish" | "Neutral",
    "reasoning_steps": ["Step 1...", "Step 2...", "Step 3..."] // REQUIRED for stock analysis
  },
  "ui_hints": { "show_chart": true/false }
}

FORMATTING RULES:
- Use **Bold** for tickers, prices, and key decisions.
- Use Bullet points for multiple reasons or insights.
- Use `###` headers for sectioning if the response is long.
- Use [Source Title](URL) for news citations from tools.
- Keep the narrative concise but professional and data-rich.
8. **News Citations**: Use [Article Title](URL). Populate `metadata.sources` with unique sources.
9. **@ Mentions**: Acknowledge context from `@portfolio`, `@watchlist`, or `@stock`.
10. **Synthesis & Conciseness**: 
    - **Avoid Repetition**: If multiple stocks share the same sector news/tailwinds, mention it ONCE in an introductory or summary paragraph rather than repeating it for each ticker.
    - **Conflict Resolution**: If technicals are Bearish but fundamentals/agent_intelligence are Bullish, provide a weighted verdict (e.g., "Short-term technical weakness, but long-term fundamental BUY"). Don't just list the conflict; resolve it for the user.
    - **Narrative Flow**: Use a sharp, "Institutional Research" style. Be concise. Use `###` headers for stocks only if analyzing more than 2. For lists, keep descriptions to 2-3 impact-heavy sentences.
"""

class ChatEngine:
    def __init__(self):
        self.model_id = "gemini-2.5-flash"

    async def get_response(self, user_message: str, chat_history: list = None, portfolio_context: str = None, user_id: str = "anonymous", session_id: str = None):
        # Save user message to DB if user is logged in (ID is a UUID)
        is_logged_in = user_id and len(user_id) > 20 # Simple UUID check

        if is_logged_in:
            try:
                from ..supabase_client import supabase
                insert_data = {
                    "user_id": user_id,
                    "role": "user",
                    "content": user_message
                }
                if session_id: insert_data["session_id"] = session_id
                
                supabase.table("chat_history").insert(insert_data).execute()
            except Exception as e:
                print(f"DB Error (User Message): {e}")

        yield {"status": "Thinking..."}
        
        contents = []
        # No history sent to avoid model confusion as per request
        
        # --- PARSE MENTIONS & ENRICH CONTEXT ---
        enriched_context = portfolio_context or ""
        mentions = await self._parse_mentions(user_message, user_id)
        
        if mentions["watchlists"]:
            for wl_name, stocks in mentions["watchlists"].items():
                enriched_context += f"\n\n[WATCHLIST: {wl_name}]\n"
                for s in stocks:
                    enriched_context += f"- {s['symbol']}: {s['price']} ({s['change_pct']}%)\n"
        
        if mentions["stocks"]:
            enriched_context += f"\n\n[MENTIONED STOCKS]\n"
            for s in mentions["stocks"]:
                enriched_context += f"- {s['symbol']}: {s['price']} ({s['change_pct']}%)\n"

        prompt = f"User Message: {user_message}"
        if enriched_context:
            print(f"DEBUG [ChatEngine]: Enriched Context length: {len(enriched_context)}")
            prompt += f"\n\n[CONTEXT]\n{enriched_context}"
        
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        response = client.models.generate_content(
            model=self.model_id,
            contents=contents,
            config={
                "system_instruction": SYSTEM_INSTRUCTION,
                "tools": TOOLS
            }
        )

        # Handle tool calls if any
        if response.candidates[0].content.parts[0].function_call:
            tool_results = []
            
            # Emit specific status based on tools being called
            fn_names = [part.function_call.name for part in response.candidates[0].content.parts if part.function_call]
            if "analyze_portfolio" in fn_names:
                yield {"status": "Checking your portfolio health..."}
            elif "analyze_ticker" in fn_names:
                yield {"status": "Analyzing stock data and trends..."}
            elif "get_market_overview" in fn_names:
                yield {"status": "Fetching latest market indicators..."}
            elif "fetch_catalyst_news" in fn_names:
                yield {"status": "Retrieving news catalysts from database..."}
            else:
                yield {"status": "Consulting financial tools..."}

            for part in response.candidates[0].content.parts:
                if part.function_call:
                    fn_name = part.function_call.name
                    args = part.function_call.args
                    print(f"DEBUG [ChatEngine]: Executing tool: {fn_name} with args: {args}")
                    result = await self._execute_tool(fn_name, args, portfolio_context)
                    print(f"DEBUG [ChatEngine]: Tool result: {str(result)[:200]}...")
                    
                    tool_results.append({
                        "function_response": {
                            "name": fn_name,
                            "response": {"result": result}
                        }
                    })
            
            yield {"status": "Generating final insights..."}
            # Send results back to Gemini for final narrative
            contents.append(response.candidates[0].content)
            contents.append({"role": "user", "parts": tool_results})

            final_response = client.models.generate_content(
                model=self.model_id,
                contents=contents,
                config={
                    "system_instruction": SYSTEM_INSTRUCTION,
                    "tools": TOOLS
                }
            )
            
            # Extract final text safely
            res_text = ""
            for p in final_response.candidates[0].content.parts:
                if p.text:
                    res_text += p.text
            
            if not res_text:
                yield self._parse_json_response('{"narrative": "I encountered an error while calculating final insights. Please retry.", "type": "general"}')
            else:
                self._save_assistant_message(user_id, res_text, session_id)
                yield self._parse_json_response(res_text)
            return

        # Handle simple text responses without tools
        res_text = ""
        for p in response.candidates[0].content.parts:
            if p.text:
                res_text += p.text
        self._save_assistant_message(user_id, res_text, session_id)
        yield self._parse_json_response(res_text)

    async def _execute_tool(self, name: str, args: dict, portfolio_context: str = None):
        # Local imports to avoid circularity
        from ..market_intelligence import analyze_single_ticker, get_market_overview
        from ..news.catalyst_engine import get_news_by_category

        if name == "analyze_ticker":
            ticker = args["ticker"].strip().upper().replace("$", "").replace("#", "")
            # 1. Get raw market data for charts/indicators
            res = await analyze_single_ticker(ticker)
            
            # 2. Run the new Agentic Engine for "Why Now?" and Context
            # Extract portfolio context for this specific ticker if available
            ticker_clean = ticker.upper().replace(".NS", "").replace(".BO", "")
            print(f"DEBUG [_execute_tool]: analyze_ticker for {ticker_clean}")
            holding_ctx = {}
            if portfolio_context:
                import re
                # Flexible pattern: look for ticker anywhere in the symbol part (before the colon)
                pattern = fr"- .*?{ticker_clean}(?:\.[A-Z]+)?.*?:\s*([\d\.]+)\s*shares\s*@\s*avg\s*₹?([\d\.]+)"
                print(f"DEBUG [_execute_tool]: Matching pattern: {pattern}")
                holding_match = re.search(pattern, portfolio_context, re.IGNORECASE)
                if holding_match:
                    print(f"DEBUG [_execute_tool]: MATCH FOUND: Qty={holding_match.group(1)}, Avg={holding_match.group(2)}")
                    holding_ctx = {
                        "quantity": float(holding_match.group(1)),
                        "avg_cost": float(holding_match.group(2))
                    }
                else:
                    print(f"DEBUG [_execute_tool]: NO MATCH found for ticker {ticker_clean}")
                    # Log a snippet of the context to see what symbols are actually there
                    print(f"DEBUG [_execute_tool]: Context Symbols Sample: {[line[:50] for line in portfolio_context.splitlines() if ':' in line][:5]}")
            
            agent_res = await run_agent_intelligence(ticker, holding_ctx)
            
            if res.get("success"):
                d = res.get("data", {})
                combined_result = {
                    "symbol": res.get("symbol"),
                    "companyName": d.get("companyName"),
                    "price": d.get("price"),
                    "trend": d.get("trend"),
                    "technical_decision": d.get("decision"),
                    "risk_level": d.get("risk_level"),
                    "indicators": d.get("indicators"),
                    "fundamentals": {k: v for k, v in d.get("fundamentals", {}).items() if k != "pe_ratio"},
                    "sparkline": [float(p["price"]) for p in d.get("chart_data", [])[-20:]] if d.get("chart_data") else [],
                    "agent_intelligence": agent_res.get("verdict", {}),
                    "reasoning_steps": agent_res.get("verdict", {}).get("reasoning_steps", []),
                    "latest_news": [
                        {
                            "title": n.get("title"),
                            "url": n.get("url"),
                            "summary": n.get("summary")
                        }
                        for n in agent_res.get("context", [])
                    ][:3]
                }
                return combined_result
            return res
        
        elif name == "get_market_overview":
            return get_market_overview()
        
        elif name == "analyze_full_portfolio":
            if not portfolio_context: return {"success": False, "error": "No portfolio context available."}
            p_type = args.get("portfolio_type", "stock")
            
            import re
            holdings = []
            if p_type == "stock":
                pattern = r"- ([^:]+): ([\d\.]+) shares @ avg ₹([\d\.]+)"
            else:
                pattern = r"- ([^:]+): ([\d\.]+) units @ avg ₹([\d\.]+)"
                
            matches = re.finditer(pattern, portfolio_context)
            for m in matches:
                holdings.append({
                    "symbol": m.group(1),
                    "quantity": float(m.group(2)),
                    "avg_cost": float(m.group(3))
                })

            if not holdings:
                return {"success": False, "error": f"Could not extract {p_type} holdings from context."}
            
            if p_type == "stock":
                from ..portfolio_logic import run_portfolio_analysis
                summary_data = await run_portfolio_analysis(holdings)
            else:
                from ..mutual_funds.mf_portfolio_service import run_mf_portfolio_analysis
                summary_data = await run_mf_portfolio_analysis(holdings)
            
            return {
                "success": True,
                "summary": summary_data.get("portfolio_summary"),
                "holdings": summary_data.get("portfolio_analysis" if p_type == "stock" else "mf_analysis")[:10]
            }

        elif name == "get_user_position":
            ticker = args.get("ticker", "").upper().replace(".NS", "").replace(".BO", "")
            asset_type = args.get("asset_type", "stock")
            print(f"DEBUG [_execute_tool]: get_user_position for {ticker} ({asset_type})")
            if not portfolio_context: return {"owned": False, "error": "No portfolio data"}
            
            import re
            lines = portfolio_context.split("\n")
            
            # Use specific patterns to avoid cross-contamination
            if asset_type == "stock":
                # Flexible pattern for stock: allow ticker within a name
                pattern = fr"^- .*?{ticker}(?:\.[A-Z]+)?.*?:\s*[\d\.]+\s*shares"
            else:
                # For MF, search the ticker/name in the "units" lines
                pattern = fr"^- .*{ticker}.*:\s*[\d\.]+\s*units"
            
            print(f"DEBUG [_execute_tool]: get_user_position pattern: {pattern}")
            for line in lines:
                if re.search(pattern, line.strip(), re.IGNORECASE):
                    print(f"DEBUG [_execute_tool]: MATCH FOUND in line: {line.strip()}")
                    return {
                        "owned": True,
                        "symbol": ticker,
                        "asset_type": asset_type,
                        "position_details": line.strip("- ").strip()
                    }
            
            # Special case: check if it exists in the OTHER section to provide a better error
            other_pattern = fr"^- .*{ticker}.*:\s*[\d\.]+\s*(?:shares|units)"
            found_other = False
            for line in lines:
                if re.search(other_pattern, line.strip(), re.IGNORECASE):
                    found_other = True
                    details = line.strip("- ").strip()
                    print(f"DEBUG [_execute_tool]: FOUND in other category: {details}")
                    break
            
            if found_other:
                return {"owned": True, "note": f"Found in portfolio but as a different asset type.", "details": details}

            print(f"DEBUG [_execute_tool]: NO MATCH found for {ticker} in context lines")
            return {"owned": False, "symbol": ticker, "message": f"Not in current {asset_type} holdings."}
        
        elif name == "fetch_catalyst_news":
            ticker = args.get("ticker")
            sector = args.get("sector")
            news_raw = await get_news_by_category(ticker=ticker, sector=sector, limit=3)
            
            # Simplified for AI context to save tokens and ensure focus on citations
            news_clean = [
                {
                    "title": n.get("title"),
                    "summary": n.get("summary"),
                    "url": n.get("url"),
                    "sentiment": n.get("sentiment"),
                    "published_at": n.get("published_at")
                }
                for n in news_raw
            ]
            
            if not news_clean:
                return {
                    "success": False,
                    "message": f"I couldn't find any recent news catalysts for '{ticker or sector}' in my database. Ask me to scan for fresh news if needed.",
                    "catalysts": []
                }
            
            return {
                "success": True, 
                "catalysts": news_clean,
                "count": len(news_clean)
            }
        
        return {"error": "Tool not found"}

    async def _parse_mentions(self, message: str, user_id: str):
        import re
        mentions = {"watchlists": {}, "stocks": []}
        
        # 1. Parse @watchlist:Name
        wl_matches = re.finditer(r"@watchlist:([\w\s\-]+)", message)
        from ..supabase_client import supabase
        
        for m in wl_matches:
            wl_name = m.group(1).strip()
            try:
                # Find watchlist id
                res = supabase.table("watchlists").select("id").eq("user_id", user_id).ilike("name", wl_name).execute()
                if res.data:
                    wl_id = res.data[0]["id"]
                    # Get items
                    items_res = supabase.table("watchlist_items").select("symbol").eq("watchlist_id", wl_id).execute()
                    symbols = [i["symbol"] for i in items_res.data]
                    
                    if symbols:
                        # Fetch brief market data directly with yfinance to avoid circular imports
                        import yfinance as yf
                        ticker_symbols = [s if (s.endswith('.NS') or s.endswith('.BO')) else f"{s}.NS" for s in symbols]
                        try:
                            data = yf.download(ticker_symbols, period="1d", interval="1m", progress=False, group_by="ticker")
                            wl_results = []
                            for s in symbols:
                                sym = s if (s.endswith('.NS') or s.endswith('.BO')) else f"{s}.NS"
                                try:
                                    # Handle single ticker result vs multiple
                                    if len(symbols) == 1:
                                        price = data['Close'].iloc[-1]
                                        prev = data['Close'].iloc[0]
                                    else:
                                        price = data[sym]['Close'].iloc[-1]
                                        prev = data[sym]['Close'].iloc[0]
                                    change = ((price - prev) / prev * 100) if prev > 0 else 0
                                    wl_results.append({"symbol": s, "price": round(price, 2), "change_pct": round(change, 2)})
                                except: continue
                            if wl_results:
                                mentions["watchlists"][wl_name] = wl_results
                        except: pass
            except Exception as e:
                print(f"Mention Parse Error (Watchlist {wl_name}): {e}")

        # 2. Parse @stock:Ticker
        stock_matches = re.finditer(r"@stock:([\w\.\-]+)", message)
        for m in stock_matches:
            symbol = m.group(1).strip().upper()
            try:
                import yfinance as yf
                sym = symbol if (symbol.endswith('.NS') or symbol.endswith('.BO')) else f"{symbol}.NS"
                t = yf.Ticker(sym)
                hist = t.history(period="2d")
                if not hist.empty:
                    price = hist['Close'].iloc[-1]
                    prev = hist['Close'].iloc[0] if len(hist) > 1 else price
                    change = ((price - prev) / prev * 100) if prev > 0 else 0
                    mentions["stocks"].append({
                        "symbol": symbol, "price": round(price, 2), "change_pct": round(change, 2)
                    })
            except Exception as e:
                print(f"Mention Parse Error (Stock {symbol}): {e}")
                
        return mentions

    def _save_assistant_message(self, user_id, res_text, session_id=None):
        if not user_id or len(user_id) <= 20: return
        try:
            from ..supabase_client import supabase
            parsed = self._parse_json_response(res_text)
            insert_data = {
                "user_id": user_id,
                "role": "assistant",
                "content": str(parsed.get("narrative", "")),
                "metadata": parsed.get("metadata", {})
            }
            if session_id: insert_data["session_id"] = session_id

            supabase.table("chat_history").insert(insert_data).execute()
        except Exception as e:
            print(f"DB Error (Assistant Message): {e}")

    def _parse_json_response(self, text: str):
        try:
            # Clean up potential markdown fences
            clean = text.strip()
            if clean.startswith("```json"):
                clean = clean[7:-3].strip()
            elif clean.startswith("```"):
                clean = clean[3:-3].strip()
            
            # Find JSON boundaries
            start = clean.find("{")
            end = clean.rfind("}") + 1
            if start != -1 and end != 0:
                clean = clean[start:end]
            
            return json.loads(clean)
        except Exception as e:
            return {
                "type": "general",
                "narrative": text,
                "metadata": {"error": f"JSON parse failed: {str(e)}"},
                "ui_hints": {}
            }

chat_engine = ChatEngine()
