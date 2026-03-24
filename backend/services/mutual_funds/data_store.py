# Mocked Data Store for Mutual Fund Holdings and Sectors
# In a real app, this would be fetched from a database or AMFI API.

FUND_HOLDINGS = {
    "INF179KC1EW1": { # Quant Small Cap Fund
        "name": "Quant Small Cap",
        "stocks": ["RELIANCE", "AXISBANK", "ADANIENT", "HDFCBANK", "JINDALSTEL"],
        "sectors": {"Financial": 25, "Energy": 20, "Metals": 15, "Consumer": 10, "Technology": 30},
        "consistency_score": 85,
        "rolling_returns_3y": 18.5
    },
    "INF209K01157": { # Nippon India Small Cap Fund
        "name": "Nippon India Small Cap",
        "stocks": ["HDFCBANK", "ICICIBANK", "AXISBANK", "INFY", "TCS"],
        "sectors": {"Financial": 35, "Technology": 25, "Consumer": 15, "Chemicals": 10, "Others": 15},
        "consistency_score": 92,
        "rolling_returns_3y": 21.2
    },
    "INF174K01LS2": { # HDFC Top 100 Fund
        "name": "HDFC Top 100",
        "stocks": ["HDFCBANK", "RELIANCE", "ICICIBANK", "AXISBANK", "TCS"],
        "sectors": {"Financial": 40, "Energy": 15, "Technology": 20, "Consumer": 10, "Automobile": 15},
        "consistency_score": 78,
        "rolling_returns_3y": 14.8
    },
    "DEFAULT": {
        "stocks": ["RELIANCE", "HDFCBANK", "ICICIBANK", "INFY", "AXISBANK"],
        "sectors": {"Financial": 30, "Technology": 20, "Energy": 15, "Others": 35},
        "consistency_score": 70,
        "rolling_returns_3y": 12.0
    }
}

def get_fund_metadata(isin: str):
    return FUND_HOLDINGS.get(isin, FUND_HOLDINGS["DEFAULT"])
