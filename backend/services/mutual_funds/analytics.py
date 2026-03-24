import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict

from .data_store import get_fund_metadata

class MFAnalyticsService:
    @staticmethod
    def calculate_cagr(nav_history: pd.DataFrame, years: int) -> float | None:
        """
        Calculates Compound Annual Growth Rate for a given period.
        """
        if nav_history.empty or len(nav_history) < 2:
            return None
            
        latest_nav = nav_history.iloc[0]['nav']
        latest_date = nav_history.iloc[0]['nav_date']
        
        target_date = latest_date - pd.DateOffset(years=years)
        # Find closest date to target
        past_nav_row = nav_history[nav_history['nav_date'] <= target_date]
        
        if past_nav_row.empty:
            return None
            
        past_nav = past_nav_row.iloc[0]['nav']
        
        if past_nav <= 0 or latest_nav <= 0:
            return None
            
        cagr = ((latest_nav / past_nav) ** (1 / years)) - 1
        return round(cagr * 100, 2)

    @staticmethod
    def calculate_risk_metrics(nav_history: pd.DataFrame, risk_free_rate: float = 0.06):
        """
        Calculates Standard Deviation (Annualized) and Sharpe Ratio.
        """
        if nav_history.empty or len(nav_history) < 30:
            return {"std_dev": None, "sharpe_ratio": None}
            
        # Reverse to chronological order for returns calculation
        df = nav_history.iloc[::-1].copy()
        df['returns'] = df['nav'].pct_change()
        
        # Daily Std Dev -> Annualized (approx 252 trading days)
        std_dev_daily = df['returns'].std()
        std_dev_ann = std_dev_daily * np.sqrt(252)
        
        # Simple Sharpe: (Ann. Return - Risk Free) / Ann. Std Dev
        total_days = (df['nav_date'].iloc[-1] - df['nav_date'].iloc[0]).days
        if total_days <= 0: return {"std_dev": None, "sharpe_ratio": None}
        
        total_return = (df['nav'].iloc[-1] / df['nav'].iloc[0]) - 1
        ann_return = ((1 + total_return) ** (365 / total_days)) - 1
        
        sharpe = (ann_return - risk_free_rate) / std_dev_ann if std_dev_ann > 0 else 0
        
        return {
            "std_dev": round(std_dev_ann * 100, 2),
            "sharpe_ratio": round(sharpe, 2)
        }

    @staticmethod
    def calculate_max_drawdown(nav_history: pd.DataFrame) -> float | None:
        """
        Calculates the peak-to-trough decline during a specific period.
        """
        if nav_history.empty:
            return None
            
        df = nav_history.iloc[::-1].copy()
        df['cum_max'] = df['nav'].cummax()
        df['drawdown'] = (df['nav'] - df['cum_max']) / df['cum_max']
        max_drawdown = df['drawdown'].min()
        
        return round(max_drawdown * 100, 2)

    @classmethod
    def calculate_fund_score(cls, cagr_3y, sharpe, expense, consistency_score):
        """
        Composite scoring engine (1-100).
        """
        score = 0
        # Return Score (30) - Benchmark 15% CAGR
        score += min(30, (cagr_3y / 15) * 30) if cagr_3y else 15
        
        # Risk Score (20) - Benchmark Sharpe 1.0
        score += min(20, (sharpe / 1.0) * 20) if sharpe else 10
        
        # Consistency (20) - Direct from data store
        score += (consistency_score / 100) * 20
        
        # Expense Efficiency (15) - Benchmark 0.5% (Direct)
        score += max(0, 15 - (expense - 0.5) * 10) if expense else 10
        
        # Diversification (15) - Default
        score += 15
        
        return int(min(100, max(0, score)))

    @classmethod
    def get_portfolio_overlap(cls, isins: List[str]) -> Dict:
        """
        Calculates common stocks and sector concentrations across funds.
        """
        all_metadata = [get_fund_metadata(isin) for isin in isins]
        if not all_metadata: return {"overlap_pct": 0, "common_stocks": [], "sector_concentration": {}}
        
        # Simple overlap: How many stocks appear in multiple funds
        stock_counts = {}
        for meta in all_metadata:
            for s in meta["stocks"]:
                stock_counts[s] = stock_counts.get(s, 0) + 1
        
        common = [s for s, count in stock_counts.items() if count > 1]
        
        # Heuristic overlap percentage
        total_stock_slots = sum(len(m["stocks"]) for m in all_metadata)
        overlap_pct = (len(common) * 2 / total_stock_slots) * 100 if total_stock_slots > 0 else 0
        
        return {
            "overlap_pct": round(overlap_pct, 1),
            "common_stocks": common,
            "sector_concentration": all_metadata[0]["sectors"] # Simplified for demonstration
        }

    @classmethod
    def get_advanced_projections(cls, current_val, cagr, horizon=10):
        """
        Scenario-based wealth machine (Wealth Machine 2.0).
        """
        base_cagr = cagr if cagr else 12.0
        
        scenarios = {
            "Optimistic": base_cagr + 4,
            "Realistic": base_cagr,
            "Pessimistic": base_cagr - 6
        }
        
        projections = {}
        for name, rate in scenarios.items():
            final_val = current_val * ((1 + rate/100) ** horizon)
            projections[name] = round(final_val, 2)
            
        return projections

    @classmethod
    def get_fund_analytics(cls, supabase, scheme_code: str) -> Dict:
        """
        High-level wrapper to get all analytics for a fund.
        """
        try:
            res = supabase.table("mf_nav_history")\
                .select("*")\
                .eq("scheme_code", scheme_code)\
                .order("nav_date", desc=True)\
                .limit(1500)\
                .execute()
            
            if not res.data:
                return {}
                
            df = pd.DataFrame(res.data)
            df['nav_date'] = pd.to_datetime(df['nav_date'])
            
            risk = cls.calculate_risk_metrics(df)
            c3y = cls.calculate_cagr(df, 3)
            
            # Mocked metadata integration
            meta = get_fund_metadata(scheme_code)
            expense = 0.6 if "Direct" in meta.get("name", "") else 1.5 # Heuristic
            
            # Calculate final score
            score = cls.calculate_fund_score(c3y, risk["sharpe_ratio"], expense, meta["consistency_score"])
            
            # Get chart data
            chart_df = df.iloc[::-1].copy()
            step = max(1, len(chart_df) // 100)
            sampled_chart = chart_df.iloc[::step].copy()
            
            charts = {
                "3Y": [{"date": r.nav_date.strftime("%Y-%m-%d"), "price": float(r.nav)} for _, r in sampled_chart.iterrows()]
            }

            return {
                "cagr_1y": cls.calculate_cagr(df, 1),
                "cagr_3y": c3y,
                "cagr_5y": cls.calculate_cagr(df, 5),
                "std_dev": risk["std_dev"],
                "sharpe_ratio": risk["sharpe_ratio"],
                "max_drawdown": cls.calculate_max_drawdown(df),
                "last_nav": float(df.iloc[0]['nav']),
                "last_date": df.iloc[0]['nav_date'].strftime("%Y-%m-%d"),
                "charts": charts,
                "fund_score": score,
                "expense_ratio": expense,
                "consistency": meta["consistency_score"],
                "rolling_returns_3y": meta["rolling_returns_3y"],
                "holdings": meta["stocks"],
                "sectors": meta["sectors"]
            }
        except Exception as e:
            print(f"Analytics Error for {scheme_code}: {e}")
            return {}

        except Exception as e:
            print(f"Analytics Error for {scheme_code}: {e}")
            return {}
