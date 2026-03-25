import operator
from typing import Annotated, List, TypedDict, Union
from langgraph.graph import StateGraph, END, START
from ..signal_generator import generate_signals
from ..technical_indicators import calculate_indicators
from ..data_fetcher import fetch_data
from ..news.pulse_news import get_company_news
from ..gemini_service import client as gemini_client
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

# 3. Node 2: Enrich Context (News + Portfolio)
async def enrich_context_node(state: AgentState):
    symbol = state["symbol"]
    # Fetch News
    news = await get_company_news(symbol)
    
    # Portfolio context (passed in or fetched)
    portfolio = state.get("portfolio_context", {})
    
    return {"context": news, "portfolio_context": portfolio}

# 4. Node 3: Generate Verdict (The "Why Now?" Agent)
async def generate_verdict_node(state: AgentState):
    symbol = state["symbol"]
    signals = state.get("signals", {"Price": 0, "Trend": "Unknown", "MACD": {}, "RSI": 50})
    news_context = state.get("context", [])
    portfolio = state.get("portfolio_context", {})
    
    # Construct a prompt for Gemini that synthesizes everything
    news_text = "\n".join([f"- {n['title']}: {n['summary']}" for n in news_context[:3]])
    
    prompt = f"""
    You are a Senior Investment Strategist and Lead Portfolio Manager at DECIXN. 
    Analyze {symbol} based on these inputs:
    
    [TECHNICAL INDICATORS & TREND]:
    {json.dumps(signals, indent=2)}
    
    [LATEST NEWS & CATALYSTS (Economic Times)]:
    {news_text if news_text else "No recent news found."}
    
    [USER PORTFOLIO CONTEXT]:
    {json.dumps(portfolio, indent=2) if portfolio else "User does not hold this stock."}
    
    [TASK]:
    1. EXPLAIN "Why Now?": A 2-3 paragraph deep-dive. Combine technical signals (RSI, MAs, Volume ratio) with the provided [Economic Times] catalysts.
    2. CITE News sources explicitly (e.g., "[Economic Times] reports...").
    3. Final Verdict (STRONG BUY, BUY, HOLD, REDUCE, SELL) and Confidence score.
    4. Actionable Entry/Exit/Stop Loss levels.
    5. Personalize: Tell the user exactly what to do with their position (if they have one). Use their Avg Cost in your math.
    
    NOTE: Be sharp, professional, and slightly elite. Don't be generic. If data is missing, report exactly WHAT is missing (Price, MACD, etc.) instead of guessing.
    
    Return ONLY JSON:
    {{
        "narrative": "Cohesive summary including indicators and citations...",
        "verdict": "...",
        "confidence": 0-100,
        "actionable_levels": {{ "entry": 123, "exit": 123, "stop_loss": 123 }},
        "portfolio_advice": "Detailed advice based on their profit/loss..."
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

# Parallel Execution
workflow.add_edge(START, "detect")
workflow.add_edge(START, "enrich")

# Join results at the verdict node
workflow.add_edge("detect", "verdict")
workflow.add_edge("enrich", "verdict")
workflow.add_edge("verdict", END)

# Compile the graph
agent_engine = workflow.compile()

async def run_agent_intelligence(symbol: str, portfolio_context: dict = None):
    initial_state = {
        "symbol": symbol,
        "portfolio_context": portfolio_context or {},
        "context": [],
        "errors": []
    }
    result = await agent_engine.ainvoke(initial_state)
    return result
