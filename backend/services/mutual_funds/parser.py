import requests
import pandas as pd
import os
import json
from typing import List, Dict

class AMFIParser:
    """Institutional Parser for AMFI Daily NAV reports."""
    NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt"

    def fetch_latest_nav(self):
        """
        Download and parse the semicolon-delimited text from AMFI.
        """
        try:
            response = requests.get(self.NAV_URL, timeout=30)
            response.raise_for_status()
            content = response.text
            
            lines = content.split('\n')
            data = []
            current_category = None
            current_amc = None
            
            for line in lines:
                line = line.strip()
                if not line: continue
                
                if ';' not in line:
                    if "Mutual Fund" in line: current_amc = line
                    else: current_category = line
                    continue
                
                parts = line.split(';')
                if len(parts) >= 6:
                    scheme_code = parts[0].strip()
                    if scheme_code == "Scheme Code": continue
                        
                    try:
                        nav_val = float(parts[4]) if parts[4] and parts[4].strip() != "N.A." else None
                    except ValueError: nav_val = None

                    data.append({
                        "scheme_code": scheme_code,
                        "isin_div_payout": parts[1].strip(),
                        "isin_reinvest": parts[2].strip(),
                        "scheme_name": parts[3].strip(),
                        "nav": nav_val,
                        "nav_date": parts[5].strip(),
                        "scheme_category": current_category,
                        "amc_name": current_amc
                    })
            
            return data
        except Exception as e:
            print(f"AMFI Parser Error: {e}")
            return []

class MFPortfolioParser:
    """Parser for broker-specific Mutual Fund exports."""
    
    @staticmethod
    def parse_kite_excel(file_path: str) -> List[Dict]:
        """Parses the tabular Kite Mutual Fund Excel format."""
        try:
            df = pd.read_excel(file_path)
            # Standardize columns (Kite specific)
            # Expected: ['Symbol', 'ISIN', 'Instrument Type', 'Quantity Available', ..., 'Average Price']
            holdings = []
            for _, row in df.iterrows():
                holdings.append({
                    "symbol": row['ISIN'], # We use ISIN as the unique ticker for MF analysis
                    "fund_name": row['Symbol'],
                    "quantity": float(row['Quantity Available']),
                    "avg_cost": float(row['Average Price']),
                    "asset_type": "MUTUAL_FUND",
                    "category": row.get('Instrument Type', 'Unknown')
                })
            return holdings
        except Exception as e:
            print(f"Kite MF Parser Error: {e}")
            return []

    @staticmethod
    def save_portfolio(holdings: List[Dict], output_path: str):
        """Saves the normalized portfolio to a local JSON file."""
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w') as f:
                json.dump(holdings, f, indent=4)
            return True
        except Exception as e:
            print(f"Failed to save MF portfolio: {e}")
            return False

    @staticmethod
    def load_portfolio(file_path: str) -> List[Dict]:
        """Loads the saved portfolio."""
        if not os.path.exists(file_path):
            return []
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except:
            return []
