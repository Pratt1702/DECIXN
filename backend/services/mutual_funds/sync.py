import os
from supabase import create_client, Client
from .parser import AMFIParser
from datetime import datetime
from services.core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

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
        print("Starting AMFI Sync...")
        schemes = self.parser.fetch_latest_nav()
        if not schemes:
            return {"success": False, "message": "No data fetched from AMFI"}

        print(f"Fetched {len(schemes)} schemes. Processing...")

        scheme_registry = []
        nav_history = []
 
        for s in schemes:
            scheme_registry.append({
                "scheme_code": s["scheme_code"],
                "scheme_name": s["scheme_name"],
                "isin_div_payout": s["isin_div_payout"],
                "isin_reinvest": s["isin_reinvest"],
                "scheme_category": s["scheme_category"],
                "amc_name": s["amc_name"],
                "last_updated": datetime.now().isoformat()
            })
 
            if s["nav"] is not None:
                try:
                    raw_date = s["nav_date"]
                    date_obj = datetime.strptime(raw_date, "%d-%b-%Y")
                    iso_date = date_obj.date().isoformat()
 
                    nav_history.append({
                        "scheme_code": s["scheme_code"],
                        "nav": s["nav"],
                        "nav_date": iso_date
                    })
                except Exception:
                    continue

        batch_size = 500
        try:
            print(f"Upserting {len(scheme_registry)} schemes to mf_schemes...")
            for i in range(0, len(scheme_registry), batch_size):
                batch = scheme_registry[i:i+batch_size]
                self.supabase.table("mf_schemes").upsert(batch).execute()
 
            print(f"Upserting {len(nav_history)} NAV records to mf_nav_history...")
            for i in range(0, len(nav_history), batch_size):
                batch = nav_history[i:i+batch_size]
                self.supabase.table("mf_nav_history").upsert(batch).execute()
 
            return {
                "success": True,
                "schemes_synced": len(scheme_registry),
                "navs_synced": len(nav_history)
            }
        except Exception as e:
            print(f"Sync Error: {e}")
            return {"success": False, "error": str(e)}
