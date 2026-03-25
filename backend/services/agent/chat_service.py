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
                "description": "Comprehensive health check for the ENTIRE portfolio. Use this when the user asks for a 'portfolio review', 'holdings report', or 'overall health'. Do NOT use this for single stock questions.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {}
                }
            },
            {
                "name": "get_user_position",
                "description": "Checks if the user owns a specific stock. Returns their avg cost and quantity. Use this for 'How much TCS do I own?', 'Is my Suzlon in profit?', etc.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "ticker": {"type": "string", "description": "The stock symbol to check position for"}
                    },
                    "required": ["ticker"]
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
87. **Deep Intelligence**: When the `analyze_ticker` tool returns `agent_intelligence`, PRIORITIZE that narrative and actionable verdict in your final response. Use it to provide a "Why Now?" explanation.
8. **News Citations**: Whenever you use `fetch_catalyst_news`, you **MUST** provide citations in your narrative using the format: [Article Title](URL). Also, populate the `metadata.sources` array with objects containing the title and url for each unique source used.

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
    "sentiment": "Bullish" | "Bearish" | "Neutral"
  },
  "ui_hints": { "show_chart": true/false }
}

FORMATTING RULES:
- Use **Bold** for tickers, prices, and key decisions.
- Use Bullet points for multiple reasons or insights.
- Use `###` headers for sectioning if the response is long.
- Use [Source Title](URL) for news citations from tools.
- Keep the narrative concise but professional and data-rich.
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
        prompt = f"User Message: {user_message}"
        if portfolio_context:
            prompt += f"\n\n[PORTFOLIO CONTEXT]\n{portfolio_context}"
        
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
                    result = await self._execute_tool(fn_name, args, portfolio_context)
                    
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
            holding_ctx = {}
            if portfolio_context:
                import re
                holding_match = re.search(fr"- {ticker_clean}: ([\d\.]+) shares @ avg ₹([\d\.]+)", portfolio_context)
                if holding_match:
                    holding_ctx = {
                        "quantity": float(holding_match.group(1)),
                        "avg_cost": float(holding_match.group(2))
                    }
            
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
                    "fundamentals": d.get("fundamentals"),
                    "sparkline": [float(p["price"]) for p in d.get("chart_data", [])[-20:]] if d.get("chart_data") else [],
                    "agent_intelligence": agent_res.get("verdict", {}),
                    "latest_news": [n["title"] for n in agent_res.get("context", [])][:3]
                }
                return combined_result
            return res
        
        elif name == "get_market_overview":
            return get_market_overview()
        
        elif name == "analyze_full_portfolio":
            if not portfolio_context: return {"success": False, "error": "No portfolio context available."}
            
            # Parse ALL holdings from the context string
            import re
            holdings = []
            pattern = r"- ([^:]+): ([\d\.]+) shares @ avg ₹([\d\.]+)"
            matches = re.finditer(pattern, portfolio_context)
            
            for m in matches:
                holdings.append({
                    "symbol": m.group(1),
                    "quantity": float(m.group(2)),
                    "avg_cost": float(m.group(3))
                })

            if not holdings:
                return {"success": False, "error": "Could not extract holdings from context."}
            
            from ..portfolio_logic import run_portfolio_analysis
            # User explicitly requested full analysis regardless of wait time
            summary_data = await run_portfolio_analysis(holdings)
            
            return {
                "success": True,
                "summary": summary_data.get("portfolio_summary"),
                "holdings": summary_data.get("portfolio_analysis")[:10] # Top 10 for AI dashboard display
            }

        elif name == "get_user_position":
            ticker = args.get("ticker", "").upper().replace(".NS", "")
            if not portfolio_context: return {"owned": False, "error": "No portfolio data"}
            
            lines = portfolio_context.split("\n")
            for line in lines:
                if line.strip().startswith(f"- {ticker}:"):
                    return {
                        "owned": True,
                        "symbol": ticker,
                        "position_details": line.strip("- ").strip()
                    }
            return {"owned": False, "symbol": ticker, "message": "Not in current portfolio holdings."}
        
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
            
            return {
                "success": True, 
                "catalysts": news_clean,
                "count": len(news_clean)
            }
        
        return {"error": "Tool not found"}

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
