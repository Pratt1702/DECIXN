import os
from supabase import create_client, Client
from .parser import AMFIParser
from datetime import datetime
try:
    from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
except ImportError:
    # Handle direct execution
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

class MFDBSync:
    def __init__(self):
        url = SUPABASE_URL
        key = SUPABASE_SERVICE_ROLE_KEY
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        self.supabase: Client = create_client(url, key)
        self.parser = AMFIParser()

    def sync_all(self):
        """
        1. Fetch from AMFI.
        2. Upsert schemes into mf_schemes.
        3. Upsert NAVs into mf_nav_history.
        """
        schemes = self.parser.fetch_latest_nav()
        if not schemes:
            return {"success": False, "message": "No data fetched from AMFI"}

        # Prepare for upserts
        scheme_registry = []
        nav_history = []
 
        for s in schemes:
            # Registry object
            scheme_registry.append({
                "scheme_code": s["scheme_code"],
                "scheme_name": s["scheme_name"],
                "isin_div_payout": s["isin_div_payout"],
                "isin_reinvest": s["isin_reinvest"],
                "scheme_category": s["scheme_category"],
                "amc_name": s["amc_name"],
                "last_updated": datetime.now().isoformat()
            })
 
            # NAV History object
            if s["nav"] is not None:
                # AMFI date format is usually DD-Mon-YYYY
                try:
                    raw_date = s["nav_date"]
                    date_obj = datetime.strptime(raw_date, "%d-%b-%Y")
                    iso_date = date_obj.date().isoformat()
 
                    nav_history.append({
                        "scheme_code": s["scheme_code"],
                        "nav": s["nav"],
                        "nav_date": iso_date
                    })
                except Exception as e:
                    continue

        # Performing Upserts in batches of 500
        batch_size = 500
        try:
            # 1. Sync Schemes Registry
            print(f"Syncing {len(scheme_registry)} schemes...")
            for i in range(0, len(scheme_registry), batch_size):
                batch = scheme_registry[i:i+batch_size]
                self.supabase.table("mf_schemes").upsert(batch).execute()
 
            # 2. Sync NAV History
            print(f"Syncing {len(nav_history)} NAV entries...")
            for i in range(0, len(nav_history), batch_size):
                batch = nav_history[i:i+batch_size]
                self.supabase.table("mf_nav_history").upsert(batch).execute()
 
            return {
                "success": True,
                "schemes_synced": len(scheme_registry),
                "navs_synced": len(nav_history)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

if __name__ == "__main__":
    db_sync = MFDBSync()
    result = db_sync.sync_all()
    print(result)
