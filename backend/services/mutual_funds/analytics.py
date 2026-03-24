import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict

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
        # Simple Ann. Return (last 1Y if available, else all)
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
            
            # Get chart data (sample to keep response slim)
            # We'll take ~100 points for the chart
            chart_df = df.iloc[::-1].copy()
            step = max(1, len(chart_df) // 100)
            sampled_chart = chart_df.iloc[::step].copy()
            
            # Format for frontend (matches StockDetails expectation)
            charts = {
                "3Y": [{"date": r.nav_date.strftime("%Y-%m-%d"), "price": float(r.nav)} for _, r in sampled_chart.iterrows()]
            }

            return {
                "cagr_1y": cls.calculate_cagr(df, 1),
                "cagr_3y": cls.calculate_cagr(df, 3),
                "cagr_5y": cls.calculate_cagr(df, 5),
                "std_dev": risk["std_dev"],
                "sharpe_ratio": risk["sharpe_ratio"],
                "max_drawdown": cls.calculate_max_drawdown(df),
                "last_nav": float(df.iloc[0]['nav']),
                "last_date": df.iloc[0]['nav_date'].strftime("%Y-%m-%d"),
                "charts": charts
            }
        except Exception as e:
            print(f"Analytics Error for {scheme_code}: {e}")
            return {}
