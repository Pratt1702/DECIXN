import requests
import re

class AMFIParser:
    """
    Institutional Parser for AMFI Daily NAV reports.
    Source: https://www.amfiindia.com/spages/NAVAll.txt
    """
    NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt"

    def fetch_latest_nav(self):
        """
        Download and parse the semicolon-delimited text from AMFI.
        """
        try:
            response = requests.get(self.NAV_URL, timeout=30)
            response.raise_for_status()
            content = response.text
            
            # The AMFI file is structured as:
            # Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
            # And grouped by AMC headers.
            
            lines = content.split('\n')
            data = []
            current_category = None
            current_amc = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Check for AMC / Category headers (they don't have semicolons)
                if ';' not in line:
                    if "Mutual Fund" in line:
                        current_amc = line
                    else:
                        current_category = line
                    continue
                
                parts = line.split(';')
                if len(parts) >= 6:
                    scheme_code = parts[0].strip()
                    # Skip header rows inside data blocks
                    if scheme_code == "Scheme Code":
                        continue
                        
                    data.append({
                        "scheme_code": scheme_code,
                        "isin_div_payout": parts[1].strip(),
                        "isin_reinvest": parts[2].strip(),
                        "scheme_name": parts[3].strip(),
                        "nav": float(parts[4]) if parts[4] and parts[4] != "N.A." else None,
                        "nav_date": parts[5].strip(),
                        "scheme_category": current_category,
                        "amc_name": current_amc
                    })
            
            return data
        except Exception as e:
            print(f"AMFI Parser Error: {e}")
            return []

if __name__ == "__main__":
    parser = AMFIParser()
    sample = parser.fetch_latest_nav()
    print(f"Parsed {len(sample)} schemes.")
    if sample:
        print(f"Sample: {sample[0]}")
