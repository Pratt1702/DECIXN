import httpx
import time
from datetime import datetime

class NSEService:
    """
    Live data fetcher for NSE India Public APIs.
    Handles session cookies and headers to bypass simple bot detection.
    """
    def __init__(self):
        self.base_url = "https://www.nseindia.com"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.nseindia.com/"
        }
        self.session = httpx.Client(headers=self.headers, timeout=10.0, follow_redirects=True)
        self._last_init = 0
        self._initialized = False

    def _ensure_session(self):
        """Ensures that we have a valid session cookie by hitting the homepage first."""
        now = time.time()
        # Refresh session every 10 minutes or if never initialized
        if not self._initialized or (now - self._last_init > 600):
            try:
                self.session.get(self.base_url)
                self._last_init = now
                self._initialized = True
            except Exception as e:
                print(f"NSE Session Init Error: {e}")

    def get_insider_trades(self, symbol: str):
        """Fetches Prohibition of Insider Trading (PIT) data from NSE."""
        self._ensure_session()
        symbol = symbol.upper().replace(".NS", "").replace(".BO", "")
        url = f"{self.base_url}/api/corporates-pit?index=equities&symbol={symbol}"
        
        try:
            response = self.session.get(url)
            if response.status_code == 200:
                data = response.json().get("data", [])
                return {"success": True, "data": data}
            return {"success": False, "error": f"NSE Error: {response.status_code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_corporate_announcements(self, symbol: str):
        """Fetches Corporate Announcements from NSE."""
        self._ensure_session()
        symbol = symbol.upper().replace(".NS", "").replace(".BO", "")
        url = f"{self.base_url}/api/corporate-announcements?index=equities&symbol={symbol}"
        
        try:
            response = self.session.get(url)
            if response.status_code == 200:
                data = response.json()
                # NSE returns a list of dictionaries directly or wrapped
                if isinstance(data, list):
                    return {"success": True, "data": data}
                return {"success": True, "data": data.get("data", []) if isinstance(data, dict) else []}
            return {"success": False, "error": f"NSE Error: {response.status_code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

nse_service = NSEService()
