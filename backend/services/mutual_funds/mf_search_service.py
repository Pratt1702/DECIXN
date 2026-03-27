from services.supabase_client import supabase

def search_mf_fuzzy(query: str):
    """
    Search for mutual fund schemes using the fuzzy search function in Supabase.
    """
    try:
        # 1. If query looks like an ISIN (Starts with IN and is ~12 chars)
        if query.upper().startswith("IN") and len(query) >= 10:
            isin_res = supabase.table("mf_schemes")\
                .select("scheme_name, scheme_code, amc_name, category, isin_div_payout, isin_reinvest")\
                .or_(f"isin_div_payout.eq.{query.upper()},isin_reinvest.eq.{query.upper()}")\
                .execute()
            if isin_res.data:
                return {"success": True, "results": isin_res.data}

        # 2. Fuzzy Search for Name
        res = supabase.rpc("search_mf_fuzzy", {"search_term": query}).execute()
        
        results = res.data if res.data else []
        
        # Fallback to ILIKE for Name
        if not results:
            fallback = supabase.table("mf_schemes")\
                .select("scheme_name, scheme_code, amc_name, category, isin_div_payout, isin_reinvest")\
                .ilike("scheme_name", f"%{query}%")\
                .limit(10)\
                .execute()
            results = fallback.data if fallback.data else []
            
        return {"success": True, "results": results}
    except Exception as e:
        print(f"MF Search Error: {e}")
        return {"success": False, "error": str(e), "results": []}
