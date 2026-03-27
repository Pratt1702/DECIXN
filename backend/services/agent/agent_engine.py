import operator
from typing import Annotated, List, TypedDict, Union
from langgraph.graph import StateGraph, END, START
from ..signal_generator import generate_signals
from ..technical_indicators import calculate_indicators
from ..data_fetcher import fetch_data
from ..news.catalyst_engine import get_relevant_news
from ..gemini_service import client as gemini_client
from ..alpha_signals import alpha_service
import json
import numpy as np

def sanitize_data(obj):
    if isinstance(obj, dict):
        return {k: sanitize_data(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_data(i) for i in obj]
    elif isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj): return 0.0
        return float(obj)
    elif isinstance(obj, (np.integer, int)):
        return int(obj)
    elif isinstance(obj, (bool, np.bool_)):
        return bool(obj)
    return obj

# 1. Define the State
class AgentState(TypedDict):
    symbol: str
    data: dict
    signals: dict
    context: List[dict]
    alpha_signals: dict
    portfolio_context: dict
    verdict: dict
    errors: List[str]

# 2. Node 1: Detect Signals
async def detect_signals_node(state: AgentState):
    symbol = state["symbol"]
    try:
        # Run synchronous fetch in a thread pool for performance
        import asyncio
        loop = asyncio.get_event_loop()
        df = await loop.run_in_executor(None, fetch_data, symbol, "1y")
        df_indicators = await loop.run_in_executor(None, calculate_indicators, df)
        signals = generate_signals(df_indicators)
        
        # Pull key data from indicators for narrative
        last_df = df_indicators.iloc[-1]
        tech_summary = {
            "RSI": float(last_df.get('RSI', 50)),
            "EMA20_Slope": float(last_df.get('MA20_Slope', 0)),
            "Signal_Decision": signals["Trend"],
            "Vol_Ratio": float(signals.get("Volume_Ratio", 1.0))
        }
        
        return {
            "signals": sanitize_data(signals), 
            "data": tech_summary
        }
    except Exception as e:
        return {"errors": [f"Signal detection failed: {str(e)}"]}

# 3. Node 2: Enrich Context (News + Alpha Signals + Portfolio)
async def enrich_context_node(state: AgentState):
    symbol = state["symbol"]
    signals = state.get("signals", {})
    trend = signals.get("Trend")
    
    # Portfolio context
    portfolio = state.get("portfolio_context", {})
    portfolio_symbols = [portfolio.get("symbol")] if portfolio.get("symbol") else []
    
    # 1. Fetch News from Catalyst Engine
    news = await get_relevant_news(symbol, context=trend, portfolio_symbols=portfolio_symbols)
    
    # 2. Fetch Alpha Signals (Insiders & Filings)
    insider = alpha_service.get_insider_trades(symbol)
    filing = alpha_service.get_corporate_filings(symbol)
    
    alpha_data = {
        "insider_activity": insider if insider.get("success") else None,
        "key_filing": filing if filing.get("success") else None
    }
    
    return {
        "context": news,
        "alpha_signals": alpha_data
    }

# 4. Node 3: Generate Verdict (The "Why Now?" Agent)
async def generate_verdict_node(state: AgentState):
    symbol = state["symbol"]
    signals = state.get("signals", {"Price": 0, "Trend": "Unknown", "MACD": {}, "RSI": 50})
    news_context = state.get("context", [])
    alpha = state.get("alpha_signals", {})
    portfolio = state.get("portfolio_context", {})
    
    # Construct a prompt for Gemini that synthesizes everything
    news_text = "\n".join([f"- {n['title']}: {n['summary']}" for n in news_context[:3]])
    
    alpha_text = ""
    if alpha.get("insider_activity"):
        ia = alpha["insider_activity"]
        alpha_text += f"\n- INSIDER: {ia['signal']} ({ia['details']}) [Source: {ia['source']}]"
    if alpha.get("key_filing"):
        kf = alpha["key_filing"]
        if "signals" in kf:
            for s in kf["signals"]:
                alpha_text += f"\n- FILING [{s['relevance']}]: {s['title']} - {s['summary']}"
        else:
            alpha_text += f"\n- FILING: {kf.get('title')} - {kf.get('summary')}"

    prompt = f"""
You are a sharp, data-driven market analyst.

Analyze {symbol} using the inputs below and produce a concise, actionable output.

[DATA]
TECHNICALS:
{json.dumps(signals)}

QUALITATIVE (INSIDERS & FILINGS):
{alpha_text if alpha_text else "No significant recent activities."}

NEWS:
{news_text if news_text else "None"}

PORTFOLIO:
{json.dumps(portfolio) if portfolio else "No position"}

[OUTPUT RULES]
- NO fluff, NO introductions, NO role-play
- DO NOT say "as an advisor", "Foxy", or similar
- Keep it SHORT and SCANNABLE
- Use bullet points, not paragraphs
- Every line must add value
- If data is missing, ignore it — do NOT mention missing data

[THINKING PRIORITY]
1. Does the technical signal (e.g. Trend) align with Insider/Filing data? 
2. If Insiders are buying but technicals are neutral, it's a "HIDDEN ALPHA" buy.
3. If Insiders are selling but news is bullish, flag as "DISTRIBUTION RISK".
4. What should the user DO right now?

[RETURN JSON ONLY]
{{
  "summary": [
    "1-line key insight",
    "2-3 bullet reasons max (cite Insiders/Filings if available)"
  ],
  "verdict": "STRONG BUY | BUY | HOLD | REDUCE | SELL",
  "confidence": 0-100,
  "levels": {{
    "entry": number,
    "exit": number,
    "stop_loss": number
  }},
  "portfolio_action": "Specific action for user's position (1-2 lines max)",
  "reasoning_steps": [
    "Step 1: Analyzed Technicals (Result: ...)",
    "Step 2: Checked Alpha Signals (Result: ...)",
    "Step 3: Correlated with News (Result: ...)"
  ]
}}
"""
    
    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    
    try:
        raw_text = response.text.strip()
        # Find JSON block
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            text_blocks = raw_text.split("```")
            for block in text_blocks:
                if "{" in block and "}" in block:
                    raw_text = block.strip()
                    break
        
        verdict = json.loads(raw_text)
        return {"verdict": verdict}
    except Exception as e:
        print(f"Gemini parse error: {e}")
        return {"errors": [f"Failed to parse Gemini verdict: {str(e)}"]}

# 5. Build the Graph
workflow = StateGraph(AgentState)

workflow.add_node("detect", detect_signals_node)
workflow.add_node("enrich", enrich_context_node)
workflow.add_node("verdict", generate_verdict_node)

# Sequential Execution for context-aware news retrieval
workflow.add_edge(START, "detect")
workflow.add_edge("detect", "enrich")
workflow.add_edge("enrich", "verdict")
workflow.add_edge("verdict", END)

# Compile the graph
agent_engine = workflow.compile()

async def run_agent_intelligence(symbol: str, portfolio_context: dict = None):
    initial_state = {
        "symbol": symbol,
        "portfolio_context": portfolio_context or {},
        "context": [],
        "alpha_signals": {},
        "errors": []
    }
    result = await agent_engine.ainvoke(initial_state)
    return result
