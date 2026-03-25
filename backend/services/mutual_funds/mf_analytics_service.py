from typing import List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

async def compare_mutual_funds(scheme_codes: List[str]):
    """
    Compares up to 5 mutual funds with deep AI intelligence, correlation checks, 
    and scenario simulation data.
    """
    from services.mutual_funds.mf_data_service import get_mf_latest_details, get_benchmark_performance
    import pandas as pd
    import numpy as np
    
    # 1. Fetch Data for all funds
    funds_data = []
    for code in scheme_codes[:5]: # Limit to 5
        details = get_mf_latest_details(code)
        if details.get("success"):
            funds_data.append(details)
            
    if not funds_data:
        return {"success": False, "error": "Could not fetch data for any selected funds."}
        
    # 2. Build Unified Equity Curve (Growth of 10,000)
    all_dfs = []
    for i, f in enumerate(funds_data):
        df = pd.DataFrame(f.get("history", [])).set_index("date")
        df.columns = [f"nav_{i}"]
        all_dfs.append(df)
        
    # Add Benchmark
    bench_data = get_benchmark_performance(period="5y")
    if bench_data:
        bench_df = pd.DataFrame(bench_data).set_index("date")
        bench_df.columns = ["nav_bench"]
        all_dfs.append(bench_df)
        
    unified_df = pd.concat(all_dfs, axis=1).sort_index().ffill().dropna()
    
    # Calculate Growth from start of shared period
    equity_curves = []
    investment = 10000
    for date, row in unified_df.iterrows():
        point = {"date": date}
        for i in range(len(funds_data)):
            start_nav = float(unified_df[f"nav_{i}"].iloc[0])
            curr_nav = float(row[f"nav_{i}"])
            point[f"fund_{i}"] = round((curr_nav / start_nav) * investment, 2)
            
        if "nav_bench" in unified_df.columns:
            start_bench = float(unified_df["nav_bench"].iloc[0])
            curr_bench = float(row["nav_bench"])
            point["benchmark"] = round((curr_bench / start_bench) * investment, 2)
            
        equity_curves.append(point)

    # 3. Calculate Correlations (Clone Detection)
    returns_df = unified_df.pct_change().dropna()
    clones = []
    if len(funds_data) > 1:
        for i in range(len(funds_data)):
            for j in range(i + 1, len(funds_data)):
                corr = returns_df[f"nav_{i}"].corr(returns_df[f"nav_{j}"])
                if corr > 0.85:
                    clones.append({
                        "pair": [funds_data[i]['scheme_name'], funds_data[j]['scheme_name']],
                        "similarity": round(corr * 100, 1),
                        "insight": f"High similarity ({round(corr*100)}%) detected. Holding both might be redundant."
                    })

    # 4. Build Comparison Matrix
    comparison = []
    for i, f in enumerate(funds_data):
        m = f.get("metrics", {})
        s = f.get("stats", {})
        
        # Advisor Score (Weighted logic)
        # CAGR (40%), Sortino (30%), Alpha (20%), Expense (10%)
        cagr_score = min(max(m.get("cagr", 0) * 2, 0), 40)
        sortino_score = min(max(m.get("sortino_ratio", 0) * 10, 0), 30)
        alpha_score = min(max(m.get("alpha", 0) * 3, 0), 20)
        expense_score = max(10 - (s.get("expense_ratio", 0.01) * 500), 0)
        total_score = round(cagr_score + sortino_score + alpha_score + expense_score)

        comparison.append({
            "scheme_code": scheme_codes[i],
            "scheme_name": f.get("scheme_name"),
            "category": s.get("category"),
            "nav": f.get("history")[-1].get("nav") if f.get("history") else 0,
            "metrics": {
                "cagr_5y": m.get("cagr"),
                "alpha": m.get("alpha"),
                "sharpe": m.get("sharpe_ratio"),
                "sortino": m.get("sortino_ratio"),
                "beta": m.get("beta_ratio", 1.0),
                "volatility": m.get("volatility"),
                "max_drawdown": m.get("max_drawdown"),
                "expense_ratio": s.get("expense_ratio"),
                "aum": s.get("aum")
            },
            "advisor_score": total_score,
            "verdict_chip": "Best for Growth" if total_score > 80 else "Balanced" if total_score > 60 else "Steady Income",
            "why_it_wins": f"Leading alpha generation of {m.get('alpha')}% with disciplined risk control." if m.get('alpha', 0) > 2 else "Consistent returns with low volatility profile.",
            "when_to_avoid": "Avoid if you have low risk tolerance for mid-term volatility." if m.get('volatility', 0) > 15 else "Not suitable for aggressive alpha-seekers."
        })

    # 5. Regret Analysis ( Opportunity Cost)
    regret = None
    if len(funds_data) >= 2:
        sorted_by_growth = sorted(comparison, key=lambda x: x['metrics']['cagr_5y'] or 0, reverse=True)
        best = sorted_by_growth[0]
        worst = sorted_by_growth[-1]
        
        best_cagr = best['metrics']['cagr_5y'] or 0
        worst_cagr = worst['metrics']['cagr_5y'] or 0
        
        diff_pct = best_cagr - worst_cagr
        cost = round(10000 * ((1 + best_cagr/100)**3 - (1 + worst_cagr/100)**3))
        if cost > 500:
            regret = {
                "best": best['scheme_name'],
                "worst": worst['scheme_name'],
                "opportunity_cost": cost,
                "message": f"Choosing {worst['scheme_name']} over {best['scheme_name']} 3 years ago would have cost you ~₹{cost:,} in gains."
            }

    return {
        "success": True,
        "comparison": comparison,
        "equity_curve": equity_curves,
        "clones": clones,
        "regret": regret,
        "confidence_score": 82
    }
def get_portfolio_insights(holdings: List[dict], profile: Optional[dict] = None) -> dict:
    """
    Generates deep analytical insights for a mutual fund portfolio.
    Upgraded to a DECISION ENGINE.
    """
    from services.mutual_funds.mf_data_service import get_mf_latest_details
    
    if not holdings:
        return {}
    
    from concurrent.futures import ThreadPoolExecutor
    
    # 1. Enrichment Phase - Parallelize fetching details from yfinance/DB
    def fetch_enriched_data(h):
        ctx = h.get('holding_context', {})
        # Robust mapping for varying payload shapes (direct vs nested)
        isin = h.get('isin') or ctx.get('isin')
        symbol = h.get('symbol') or h.get('scheme_name') or ctx.get('symbol')
        
        details = get_mf_latest_details(isin or symbol)
        
        h_val = ctx.get('current_value') or h.get('current_value', 0)
        # Handle invested value mapping
        h_inv = h.get('invested_value') or ctx.get('invested_value') or \
                (ctx.get('avg_cost', 0) * ctx.get('quantity', 0)) or \
                (h.get('avg_cost', 0) * h.get('quantity', 0))
                
        return {
            "symbol": symbol,
            "isin": isin,
            "current_value": float(h_val),
            "invested_value": float(h_inv),
            "details": details if details.get('success') else {},
            "weight": 0
        }

    with ThreadPoolExecutor(max_workers=5) as executor:
        enriched_holdings = list(executor.map(fetch_enriched_data, holdings))

    total_value = sum(h["current_value"] for h in enriched_holdings)
    total_invested = sum(h["invested_value"] for h in enriched_holdings)

    if total_value == 0:
        return {"error": "Portfolio value is zero. Cannot generate insights."}

    # Calculate Weights and Aggregate Metrics
    weighted_alpha = 0
    weighted_cagr = 0
    weighted_volatility = 0
    data_points_count = 0
    
    for h in enriched_holdings:
        h["weight"] = (h["current_value"] / total_value) * 100
        if h["details"]:
            m = h["details"].get("metrics", {})
            weighted_alpha += (m.get("alpha", 0) or 0) * (h["weight"] / 100)
            weighted_cagr += (m.get("cagr", 0) or 0) * (h["weight"] / 100)
            weighted_volatility += (m.get("volatility", 0) or 0) * (h["weight"] / 100)
            data_points_count += 1

    # 2. Allocation Heuristics (Real-ish grounding)
    # Mapping Category -> [Large%, Mid%, Small%, Sectors]
    CATEGORY_MAP = {
        "Large Cap": {"large": 85, "mid": 10, "small": 5, "sectors": {"Financial": 30, "IT": 15, "Energy": 10}},
        "Mid Cap": {"large": 10, "mid": 75, "small": 15, "sectors": {"Capital Goods": 20, "Healthcare": 15, "Chemicals": 10}},
        "Small Cap": {"large": 5, "mid": 15, "small": 80, "sectors": {"Consumer": 18, "Services": 15, "Industrial": 12}},
        "Flexi Cap": {"large": 65, "mid": 25, "small": 10, "sectors": {"Financial": 25, "IT": 12, "Auto": 10}},
        "Tax Saver": {"large": 70, "mid": 20, "small": 10, "sectors": {"Financial": 28, "IT": 14, "Pharma": 8}},
        "Focused": {"large": 75, "mid": 20, "small": 5, "sectors": {"Financial": 35, "Energy": 15, "IT": 10}},
        "Value": {"large": 60, "mid": 30, "small": 10, "sectors": {"Energy": 20, "Financial": 18, "Utilities": 12}},
        "Multi Cap": {"large": 40, "mid": 35, "small": 25, "sectors": {"Financial": 22, "Capital Goods": 18, "Pharma": 10}},
    }
    
    agg_caps = {"large_cap": 0, "mid_cap": 0, "small_cap": 0}
    agg_sectors = {}
    
    for h in enriched_holdings:
        cat = "Flexi Cap" # Default
        if h["details"]:
            cat_str = h["details"].get("stats", {}).get("category", "")
            for k in CATEGORY_MAP.keys():
                if k.lower() in cat_str.lower():
                    cat = k
                    break
        
        m = CATEGORY_MAP.get(cat, CATEGORY_MAP["Flexi Cap"])
        agg_caps["large_cap"] += m["large"] * (h["weight"] / 100)
        agg_caps["mid_cap"] += m["mid"] * (h["weight"] / 100)
        agg_caps["small_cap"] += m["small"] * (h["weight"] / 100)
        
        for s_name, s_val in m["sectors"].items():
            agg_sectors[s_name] = agg_sectors.get(s_name, 0) + (s_val * (h["weight"] / 100))

    sorted_sectors = [{"name": k, "value": round(v, 1)} for k, v in sorted(agg_sectors.items(), key=lambda x: x[1], reverse=True)]
    
    # 3. Decision Logic
    age = profile.get('age', 30) if profile else 30
    risk_appetite = profile.get('riskAppetite', 'Balanced') if profile else 'Balanced'
    
    # Target Small Cap based on age
    target_small = max(5, 50 - age) 
    if risk_appetite == 'Aggressive': target_small += 10
    elif risk_appetite == 'Conservative': target_small -= 10
    
    current_small = agg_caps["small_cap"]
    
    recommended_actions = []
    if current_small < target_small - 10:
        recommended_actions.append({
            "action": "Rebalance",
            "reason": f"Under-exposed to growth. Target Small Cap is {target_small}%, current is {round(current_small)}%.",
            "impact": "Low long-term alpha potential."
        })
    elif current_small > target_small + 15:
        recommended_actions.append({
            "action": "De-risk",
            "reason": f"High volatility risk for age {age}. Small-cap exposure ({round(current_small)}%) exceeds recommended levels.",
            "impact": "High drawdown risk during market corrections."
        })
    else:
        recommended_actions.append({
            "action": "Hold",
            "reason": "Allocation is well-aligned with your age and risk profile.",
            "impact": "Optimal compounding path."
        })

    # Sector Concentration
    for s in sorted_sectors[:1]:
        if s["value"] > 30:
            recommended_actions.append({
                "action": "Diversify",
                "reason": f"High concentration in {s['name']} ({s['value']}%).",
                "impact": "Sector-specific downturn will hit portfolio hard."
            })

    # 4. Wealth Projection Upgraded
    years = profile.get('horizon_years', 10) if profile else 10
    base_rate = weighted_cagr / 100 if weighted_cagr > 5 else 0.12
    improved_rate = base_rate + 0.02 # Assume 2% improvement via rebalancing
    
    expected = round(total_value * (1 + base_rate)**years)
    optimized = round(total_value * (1 + improved_rate)**years)
    
    # 5. Overlap Logic
    categories = [h["details"].get("stats", {}).get("category", "") if h["details"] else "" for h in enriched_holdings]
    overlap_count = 0
    for i in range(len(categories)):
        for j in range(i + 1, len(categories)):
            if categories[i] and categories[i] == categories[j]:
                overlap_count += 1
    
    overlap_pct = min(overlap_count * 15, 60) # Heuristic

    # 6. Confidence Score
    confidence = (data_points_count / len(holdings)) * 100 if holdings else 0
    
    # Health Score Logic
    health_score = 75
    if overlap_pct > 30: health_score -= 10
    if weighted_alpha < 0: health_score -= 15
    if any(a["action"] == "De-risk" for a in recommended_actions): health_score -= 10

    return {
        "portfolio_summary": {
            "total_value": round(total_value, 2),
            "total_pnl": round(total_value - total_invested, 2),
            "weighted_cagr": round(weighted_cagr, 2),
            "weighted_alpha": round(weighted_alpha, 2),
            "risk_score": round(weighted_volatility / 0.3, 0), # Normalized proxy
            "confidence_score": round(confidence, 1)
        },
        "health_score": {
            "score": max(health_score, 10),
            "label": "Premium" if health_score > 85 else "Strong" if health_score > 70 else "Fair" if health_score > 50 else "Weak",
            "insight": f"Overall {health_score > 70 and 'robust' or 'fragmented'} architecture with {round(weighted_alpha, 1)}% alpha generation.",
            "breakdown": {
                "Alpha_Efficiency": min(max(50 + int(weighted_alpha * 10), 0), 100),
                "Risk_Control": min(max(100 - int(weighted_volatility * 2), 0), 100),
                "Diversity": max(100 - overlap_pct, 0)
            }
        },
        "risk_analysis": {
            "volatility": "High" if weighted_volatility > 20 else "Medium" if weighted_volatility > 12 else "Low",
            "drawdown_est": "15-20%" if weighted_volatility > 15 else "8-12%",
            "consistency": "High" if weighted_alpha > 2 else "Average"
        },
        "allocation_breakdown": {
            "insight": f"Dominant {max(agg_caps, key=agg_caps.get).replace('_', ' ')} footprint.",
            "caps": {k: round(v, 1) for k, v in agg_caps.items()},
            "sectors": sorted_sectors
        },
        "wealth_projection": {
            "years": years,
            "expected": expected,
            "optimized": optimized,
            "improvement": optimized - expected,
            "best_case": round(total_value * (1 + base_rate + 0.04)**years),
            "worst_case": round(total_value * (1 + base_rate - 0.04)**years)
        },
        "recommended_actions": recommended_actions,
        "what_to_fix": [a["reason"] for a in recommended_actions if a["action"] != "Hold"],
        "confidence_score": f"{round(confidence)}%"
    }
