from services.supabase_client import supabase

def search_mf_fuzzy(query: str):
    """
    Search for mutual fund schemes using the fuzzy search function in Supabase.
    """
    try:
        # Call the search_mf_fuzzy RPC function
        res = supabase.rpc("search_mf_fuzzy", {"search_term": query}).execute()
        
        results = res.data if res.data else []
        
        # Fallback if RPC returns nothing
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
