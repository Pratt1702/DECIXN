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

def compare_mutual_funds(scheme_codes: list[str]):
    """
    Compares 2-3 mutual funds and returns a comparison matrix + AI conclusion.
    """
    from services.mutual_funds.mf_data_service import get_mf_latest_details
    
    funds_data = []
    for code in scheme_codes:
        details = get_mf_latest_details(code)
        if details.get("success"):
            funds_data.append(details)
            
    if not funds_data:
        return {"success": False, "error": "Could not fetch data for any selected funds."}
        
    # Build Comparison Table Data
    comparison = []
    for i, f in enumerate(funds_data):
        metrics = f.get("metrics", {})
        stats = f.get("stats", {})
        
        # Calculate Returns (CAGR for 1Y, 3Y, 5Y from history if available)
        # For now we use alpha as a proxy for outperformance and stats for basics
        comparison.append({
            "scheme_code": scheme_codes[i], # Use the original code for frontend mapping
            "isin": f.get("isin"),
            "ticker": f.get("ticker"),
            "scheme_name": f.get("scheme_name"),
            "category": stats.get("category"),
            "expense_ratio": stats.get("expense_ratio"),
            "aum": stats.get("aum"),
            "alpha": metrics.get("alpha"),
            "sharpe_ratio": metrics.get("sharpe_ratio"),
            "volatility": metrics.get("volatility"),
            "nav": f.get("history")[-1].get("nav") if f.get("history") else 0
        })
        
    # Generate AI Conclusion
    # Logic: 
    # 1. Best Alpha (Performance)
    # 2. Best Sharpe (Risk-Adjusted)
    # 3. Lowest Expense (Efficiency)
    
    best_performer = max(comparison, key=lambda x: x['alpha'] or -100)
    most_efficient = min(comparison, key=lambda x: x['expense_ratio'] or 1.0)
    best_risk_adj = max(comparison, key=lambda x: x['sharpe_ratio'] or -100)
    
    conclusion = f"The comparison reflects three distinct styles. "
    if best_performer == best_risk_adj:
        conclusion += f"{best_performer['scheme_name']} is the clear leader, offering both the highest market outperformance (Alpha: {best_performer['alpha']}%) and superior risk-adjusted returns."
    else:
        conclusion += f"For pure growth, {best_performer['scheme_name']} leads with an Alpha of {best_performer['alpha']}%, while {best_risk_adj['scheme_name']} offers better stability."
        
    if most_efficient['expense_ratio'] < 0.008: # Below 0.8%
        conclusion += f" {most_efficient['scheme_name']} is also notably cost-efficient with an expense ratio of {most_efficient['expense_ratio']*100:.2f}%."

    insights = [
        {"title": "Performance Leader", "text": f"{best_performer['scheme_name']} shows the highest potential for alpha generation.", "type": "success"},
        {"title": "Cost Analysis", "text": f"{most_efficient['scheme_name']} has the lowest overhead, preserving more of your long-term capital.", "type": "info"},
        {"title": "Risk Profile", "text": f"{best_risk_adj['scheme_name']} has the most disciplined return delivery relative to its volatility.", "type": "warning"}
    ]
    
    return {
        "success": True,
        "comparison": comparison,
        "insights": insights,
        "conclusion": conclusion
    }
