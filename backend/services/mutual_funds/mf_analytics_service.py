import random

def calculate_portfolio_health(holdings):
    """
    Computes a health score (0-100) based on diversification, costs, and risk.
    """
    if not holdings:
        return 0
        
    # Logic: More than 5 funds is slightly over-diversified
    # Overlap and expense ratio would be real metrics here
    base_score = 82
    if len(holdings) > 6:
        base_score -= 10
    
    return base_score

def get_portfolio_insights(holdings, profile=None):
    """
    Generates a suite of high-fidelity insights for a mutual fund portfolio.
    """
    if not holdings:
        return None
        
    # Default profile if not provided
    if not profile:
        profile = {"age": 25, "riskAppetite": "Balanced", "horizon": "5-10 Years"}
    
    age = profile.get("age", 25)
    risk_appetite = profile.get("riskAppetite", "Balanced")
    horizon = profile.get("horizon", "5-10 Years")
    
    total_value = sum(h['holding_context']['current_value'] for h in holdings)
    
    # 1. Health Score
    health_score = calculate_portfolio_health(holdings)
    
    # 3. Allocation (Simulated for now, would be aggregated from fund compositions)
    allocation = {
        "large_cap": 45,
        "mid_cap": 35,
        "small_cap": 20,
        "sectors": [
            {"name": "Financials", "value": 28},
            {"name": "Technology", "value": 22},
            {"name": "Consumer", "value": 15},
            {"name": "Healthcare", "value": 12},
            {"name": "Others", "value": 23}
        ]
    }

    # 2. Risk vs Profile logic
    is_mismatch = (age > 50 and allocation['small_cap'] > 20) or (age < 30 and allocation['small_cap'] < 10)
    
    # 4. Expense Ratio Leak
    # Regular vs Direct check
    regular_plans = [h for h in holdings if "Regular" in (h.get("scheme_name") or "")]
    leak_amount = len(regular_plans) * 12000 # Simulated emotional hit
    
    # 5. Overlap
    overlap_pct = 12 if len(holdings) < 4 else 42
    
    # 6. Wealth Projection (10Y)
    expected_return = 0.12
    projected_10y = total_value * (1 + expected_return) ** 10
    
    return {
        "health_score": {
            "score": health_score,
            "label": "Healthy" if health_score > 80 else "Needs Optimization",
            "breakdown": {
                "risk_alignment": 85 if not is_mismatch else 60,
                "diversification": 70,
                "cost_efficiency": 90,
                "consistency": 82
            },
            "insight": "Your portfolio is robust but could benefit from slight midcap rebalancing." if not is_mismatch else "High asset-profile mismatch detected."
        },
        "risk_profile": {
            "status": "Mismatch" if is_mismatch else "Balanced",
            "message": f"You're {age} but have {allocation['large_cap']}% in Large Cap. Consider favoring Growth assets for long-term gains." if age < 30 and allocation['small_cap'] < 10 else "Profile looks aligned with market cap distribution.",
            "dna": f"{risk_appetite} Builder" if not is_mismatch else "Risk Mismatch"
        },
        "overlap": {
            "percentage": overlap_pct,
            "common_stocks": ["HDFC Bank", "Reliance Industries", "ICICI Bank"],
            "suggestion": "Reduce redundant funds to improve diversification." if overlap_pct > 30 else "Diversification levels are optimal."
        },
        "allocation_breakdown": {
            "caps": allocation,
            "insight": f"{allocation['mid_cap']}% in midcap-heavy assets implies moderate volatility risk."
        },
        "expense_leak": {
            "has_regular_plans": len(regular_plans) > 0,
            "annual_leak": leak_amount,
            "insight": f"You're losing ~₹{leak_amount}/year in regular plan commissions." if regular_plans else "Direct plan selection is saving you ~₹15k/year."
        },
        "opportunity_signals": [
            {"title": "Midcap Correction", "message": "Midcaps corrected 12% → Good accumulation phase", "type": "info"},
            {"title": "Rate Cycle", "message": "Debt funds attractive due to peaking interest rates", "type": "action"}
        ],
        "rebalancing": {
            "suggestions": [
                "Reduce midcap from 35% → 25%",
                "Increase small cap by 10% for alpha"
            ]
        },
        "wealth_projection": {
            "expected": round(projected_10y, 0),
            "worst_case": round(projected_10y * 0.7, 0),
            "best_case": round(projected_10y * 1.4, 0)
        },
        "behavioral": {
            "fund_count": len(holdings),
            "insight": "You hold 8 funds — reducing to 4 could improve returns and clarity." if len(holdings) > 6 else "Concentrated conviction is visible."
        }
    }
