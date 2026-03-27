import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.agent.agent_engine import run_agent_intelligence

async def test_agent():
    symbol = "ITC.NS"
    portfolio_ctx = {
        "avg_cost": 2400.0,
        "quantity": 10,
        "current_pnl": 5000.0
    }
    
    print(f"\n🚀 Running Agent Intelligence for {symbol}...\n")
    
    result = await run_agent_intelligence(symbol, portfolio_ctx)
    
    if result.get("errors"):
        print("❌ Errors during execution:", result["errors"])
        return

    print("✅ Analysis Complete!\n")
    try:
        verdict = result.get("verdict", {})
        print(f"VERDICT: {verdict.get('verdict')}")
        print(f"CONFIDENCE: {verdict.get('confidence')}%")
        
        summary = verdict.get('summary', [])
        if isinstance(summary, list):
            print(f"\nSUMMARY:\n{chr(10).join(str(s) for s in summary)}\n")
        else:
            print(f"\nSUMMARY:\n{summary}\n")
            
        print(f"ACTIONABLE LEVELS: {verdict.get('levels')}")
        print(f"PORTFOLIO ADVICE: {verdict.get('portfolio_action')}")
        
        reasoning = verdict.get('reasoning_steps', [])
        if isinstance(reasoning, list):
            print(f"\nREASONING TRACE:\n{chr(10).join(str(s) for s in reasoning)}")
        else:
            print(f"\nREASONING TRACE:\n{reasoning}")
    except Exception as e:
        print(f"❌ Error printing verdict: {e}")
        print(f"RAW RESULT: {result}")

if __name__ == "__main__":
    asyncio.run(test_agent())
