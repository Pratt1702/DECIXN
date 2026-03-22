from google import genai
from .config import GEMINI_API_KEY
from .data_fetcher import fetch_data
from .technical_indicators import calculate_indicators
from .signal_generator import generate_signals
from .decision_engine import make_decision, make_holding_decision
import json
import yfinance as yf
from datetime import datetime

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

RESPONSE FORMAT (JSON ONLY):
{
  "type": "portfolio_analysis" | "stock_analysis" | "market_overview" | "general" | "off_topic",
  "narrative": "Your textual response (Markdown supported)",
  "metadata": {
    "tickers": ["SYMBOL"],
    "charts": ["SYMBOL1", "SYMBOL2"], // Max 3 tickers for interactive charts
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
- Keep the narrative concise but professional and data-rich.
"""

class ChatEngine:
    def __init__(self):
        self.model_id = "gemini-2.5-flash"

    async def get_response(self, user_message: str, chat_history: list = None, portfolio_context: str = None):
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
                yield self._parse_json_response(res_text)
            return

        # Handle simple text responses without tools
        res_text = ""
        for p in response.candidates[0].content.parts:
            if p.text:
                res_text += p.text
        yield self._parse_json_response(res_text)

    async def _execute_tool(self, name: str, args: dict, portfolio_context: str = None):
        # Local imports to avoid circularity
        from market_intelligence import analyze_single_ticker, get_market_overview

        if name == "analyze_ticker":
            res = analyze_single_ticker(args["ticker"])
            if res.get("success"):
                d = res.get("data", {})
                return {
                    "symbol": res.get("symbol"),
                    "companyName": d.get("companyName"),
                    "price": d.get("price"),
                    "trend": d.get("trend"),
                    "decision": d.get("decision"),
                    "reasons": d.get("reasons"),
                    "risk_level": d.get("risk_level"),
                    "indicators": d.get("indicators"),
                    "fundamentals": d.get("fundamentals"),
                    "sparkline": [float(p["price"]) for p in d.get("chart_data", [])[-20:]] if d.get("chart_data") else []
                }
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
            
            from portfolio_logic import run_portfolio_analysis
            # User explicitly requested full analysis regardless of wait time
            summary_data = run_portfolio_analysis(holdings)
            
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
        
        return {"error": "Tool not found"}

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
