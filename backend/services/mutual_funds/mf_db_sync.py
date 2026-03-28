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

    def sync_all(self, only_update: bool = False):
        """
        1. Fetch from AMFI.
        2. Update/Upsert schemes into mf_schemes.
        3. Update/Upsert NAVs into mf_nav_history.
        """
        schemes = self.parser.fetch_latest_nav()
        if not schemes:
            return {"success": False, "message": "No data fetched from AMFI"}

        # Prepare for operations
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

        # Performing Database Operations in batches of 500
        batch_size = 500
        try:
            # 1. Sync Schemes Registry
            if only_update:
                # Optimized Update-Only: Get existing codes first
                print("[MF] Fetching existing scheme codes for filtering...")
                res = self.supabase.table("mf_schemes").select("scheme_code").execute()
                existing_codes = {row["scheme_code"] for row in res.data}
                
                # Filter registry to only existing items
                filtered_registry = [s for s in scheme_registry if s["scheme_code"] in existing_codes]
                print(f"[MF] Filtered {len(scheme_registry)} down to {len(filtered_registry)} existing schemes.")
                
                if filtered_registry:
                    for i in range(0, len(filtered_registry), batch_size):
                        batch = filtered_registry[i:i+batch_size]
                        self.supabase.table("mf_schemes").upsert(batch).execute()
            else:
                # Full Upsert (Insert + Update)
                print(f"Syncing {len(scheme_registry)} schemes (Full Upsert)...")
                for i in range(0, len(scheme_registry), batch_size):
                    batch = scheme_registry[i:i+batch_size]
                    self.supabase.table("mf_schemes").upsert(batch).execute()
 
            # 2. Sync NAV History
            if only_update:
                # We only sync NAVs for schemes we already track
                if 'existing_codes' not in locals():
                    res = self.supabase.table("mf_schemes").select("scheme_code").execute()
                    existing_codes = {row["scheme_code"] for row in res.data}
                
                filtered_navs = [n for n in nav_history if n["scheme_code"] in existing_codes]
                
                # De-duplicate locally before upserting to prevent PostgREST errors
                unique_navs = {}
                for n in filtered_navs:
                    key = (n["scheme_code"], n["nav_date"])
                    unique_navs[key] = n
                deduplicated_navs = list(unique_navs.values())
                
                print(f"[MF] Filtered {len(nav_history)} down to {len(deduplicated_navs)} unique relevant NAV entries.")
                
                if deduplicated_navs:
                    for i in range(0, len(deduplicated_navs), batch_size):
                        batch = deduplicated_navs[i:i+batch_size]
                        # Explicitly define on_conflict to ensure UPSERT logic triggers correctly
                        self.supabase.table("mf_nav_history").upsert(batch, on_conflict="scheme_code,nav_date").execute()
            else:
                print(f"Syncing {len(nav_history)} NAV entries (Full Upsert)...")
                # De-duplicate the full list too
                unique_navs = {}
                for n in nav_history:
                    key = (n["scheme_code"], n["nav_date"])
                    unique_navs[key] = n
                deduplicated_full_navs = list(unique_navs.values())

                for i in range(0, len(deduplicated_full_navs), batch_size):
                    batch = deduplicated_full_navs[i:i+batch_size]
                    self.supabase.table("mf_nav_history").upsert(batch, on_conflict="scheme_code,nav_date").execute()
 
            return {
                "success": True,
                "schemes_processed": len(scheme_registry) if not only_update else len(filtered_registry),
                "navs_processed": len(nav_history) if not only_update else len(filtered_navs),
                "mode": "update_only" if only_update else "upsert"
            }
        except Exception as e:
            print(f"[MF SYNC ERROR] {e}")
            return {"success": False, "error": str(e)}

if __name__ == "__main__":
    db_sync = MFDBSync()
    result = db_sync.sync_all()
    print(result)
