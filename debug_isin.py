
from services.core.supabase_client import supabase
import sys

isin = sys.argv[1] if len(sys.argv) > 1 else "INF204KA1U79"
db_res = supabase.table('mf_schemes').select('scheme_code, scheme_name')\
    .or_(f"isin_div_payout.eq.{isin},isin_reinvest.eq.{isin}").execute()

if db_res.data:
    print(f"FOUND: {db_res.data}")
else:
    print("NOT FOUND")
