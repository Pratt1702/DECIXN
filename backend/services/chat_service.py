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
                "description": "Get deep technical and fundamental analysis for a specific stock ticker (e.g. RELIANCE, TCS). Returns trend, decision, and indicators.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "ticker": {"type": "string", "description": "The stock ticker symbol (e.g. 'SBIN')"}
                    },
                    "required": ["ticker"]
                }
            },
            {
                "name": "get_market_overview",
                "description": "Fetch real-time market overview including NIFTY 50, SENSEX, and top gainers/losers.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {}
                }
            },
            {
                "name": "analyze_portfolio",
                "description": "Perform a comprehensive health check on a list of portfolio holdings. Requires a list of holdings with symbol, avg_cost, and quantity.",
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
                                    "pnl": {"type": "number", "description": "Optional current P&L"}
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
  "narrative": "Your textual response",
  "metadata": {
    "tickers": ["SYMBOL"],
    "actionable_insight": "string",
    "sentiment": "Bullish" | "Bearish" | "Neutral",
    "sparkline": [number, ...] 
  },
  "ui_hints": { "show_chart": true/false }
}
"""

class ChatEngine:
    def __init__(self):
        self.model_id = "gemini-2.5-flash"

    async def get_response(self, user_message: str, chat_history: list = None, portfolio_context: str = None):
        contents = []
        if chat_history:
            # Map "assistant" to "model" for Gemini SDK
            for m in chat_history:
                role = "model" if m.get("role") == "assistant" else m.get("role")
                contents.append({"role": role, "parts": m.get("parts")})
        
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
        # Note: In a production environment, this should handle multiple turns for complex tool chains.
        # For simplicity, we handle one round of tool calls here.
        if response.candidates[0].content.parts[0].function_call:
            tool_results = []
            print(f"--- FOXY ORCHESTRATION: Gemini calling tools ---")
            for part in response.candidates[0].content.parts:
                if part.function_call:
                    fn_name = part.function_call.name
                    args = part.function_call.args
                    
                    print(f"  [TOOL CALL]: {fn_name} (Args: {args})")
                    
                    result = await self._execute_tool(fn_name, args)
                    print(f"  [TOOL SUCCESS]: {fn_name}")
                    
                    tool_results.append({
                        "function_response": {
                            "name": fn_name,
                            "response": {"result": result}
                        }
                    })
            
            print(f"--- FOXY ORCHESTRATION: Generating final narrative ---")
            # Send results back to Gemini for final narrative
            contents.append(response.candidates[0].content)
            contents.append({"role": "user", "parts": tool_results}) # parts in tool response role

            final_response = client.models.generate_content(
                model=self.model_id,
                contents=contents,
                config={
                    "system_instruction": SYSTEM_INSTRUCTION,
                    "tools": TOOLS
                }
            )
            print(f"DEBUG RAW FINAL: {final_response.text}")
            return self._parse_json_response(final_response.text)
        
        print(f"DEBUG RAW INITIAL: {response.text}")
        return self._parse_json_response(response.text)

    async def _execute_tool(self, name: str, args: dict):
        # Local imports to avoid circularity
        from market_intelligence import analyze_single_ticker, get_market_overview, analyze_single_holding

        if name == "analyze_ticker":
            res = analyze_single_ticker(args["ticker"])
            if res.get("success"):
                # Extract a mini sparkline (last 20 points) for the UI
                chart_data = res.get("data", {}).get("chart_data", [])
                sparkline = [float(p["price"]) for p in chart_data[-20:]]
                res["sparkline"] = sparkline
            return res
        
        elif name == "get_market_overview":
            return get_market_overview()
        
        elif name == "analyze_portfolio":
            results = []
            for h in args["holdings"]:
                res = analyze_single_holding(h["symbol"], h["avg_cost"], h["quantity"], h.get("pnl", 0))
                if res.get("success"):
                    results.append(res)
            
            # Simple summary for AI
            return {
                "total_holdings": len(results),
                "analyzed": results
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
