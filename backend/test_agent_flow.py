import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.agent.agent_engine import run_agent_intelligence

async def test_agent():
    symbol = "SBIN.NS"
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
    verdict = result["verdict"]
    print(f"VERDICT: {verdict.get('verdict')}")
    print(f"CONFIDENCE: {verdict.get('confidence')}%")
    print(f"\nNARRATIVE:\n{verdict.get('narrative')}\n")
    print(f"ACTIONABLE LEVELS: {verdict.get('actionable_levels')}")
    print(f"PORTFOLIO ADVICE: {verdict.get('portfolio_advice')}")

if __name__ == "__main__":
    asyncio.run(test_agent())
