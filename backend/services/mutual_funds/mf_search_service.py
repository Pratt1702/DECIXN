from services.supabase_client import supabase

def search_mf_fuzzy(query: str):
    """
    Search for mutual fund schemes using the fuzzy search function in Supabase.
    """
    try:
        # Call the search_mf_fuzzy RPC function
        res = supabase.rpc("search_mf_fuzzy", {"search_term": query}).execute()
        return {"success": True, "results": res.data}
    except Exception as e:
        print(f"MF Search Error: {e}")
        return {"success": False, "error": str(e), "results": []}
