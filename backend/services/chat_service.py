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
                "description": "Deep technical/fundamental analysis. Use this when the user asks about a specific stock (e.g. 'TCS', 'Reliance', 'Check ITC'). Also handles misspelled symbols or name-based queries.",
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
                "name": "analyze_portfolio",
                "description": "Health check for user holdings. Use whenever they ask about 'my portfolio', 'shares I own', 'my stocks', even if misspelled as 'portfolyo' or 'holdngs'.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "holdings": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "symbol": {"type": "string"},
                                    "avg_cost": {"type": "number"},
                                    "quantity": {"type": "number"},
                                    "pnl": {"type": "number"}
                                },
                                "required": ["symbol", "avg_cost", "quantity"]
                            }
                        }
                    },
                    "required": ["holdings"]
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
6. **Portfolio Context**: If you see `[PORTFOLIO SUMMARY]` and `[HOLDINGS LIST]` in the context, USE THIS DATA. Do not ask the user for their holdings if they are already provided in the prompt. You can analyze them directly or use tools on specific symbols mentioned.

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
                    result = await self._execute_tool(fn_name, args)
                    
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

    async def _execute_tool(self, name: str, args: dict):
        # Local imports to avoid circularity
        from market_intelligence import analyze_single_ticker, get_market_overview, analyze_single_holding

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
                    "sparkline": [float(p["price"]) for p in d.get("chart_data")[-20:]] if d.get("chart_data") else []
                }
            return res
        
        elif name == "get_market_overview":
            return get_market_overview()
        
        elif name == "analyze_portfolio":
            holdings = []
            for h in args["holdings"]:
                holdings.append({
                    "symbol": h["symbol"],
                    "quantity": h["quantity"],
                    "avg_cost": h["avg_cost"],
                    "pnl": h.get("pnl", 0)
                })
            
            # Re-run same logic as main.py but inside service
            from portfolio_logic import run_portfolio_analysis
            summary_data = run_portfolio_analysis(holdings)
            
            return {
                "success": True,
                "summary": summary_data.get("portfolio_summary"),
                "holdings": summary_data.get("portfolio_analysis")[:10] # Top 10 for AI
            }
        
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
