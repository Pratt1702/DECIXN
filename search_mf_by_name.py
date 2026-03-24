import yfinance as yf
import json

def search_mf_by_name(query, max_results=10):
    """
    Search for Mutual Funds by keyword and filter only for MUTUALFUND results.
    """
    print(f"\n{'='*60}")
    print(f"SEARCHING FOR ASSETS: '{query}'")
    print(f"{'='*60}")

    try:
        # Increase max_results to find more potential MFs before filtering
        search = yf.Search(query, max_results=20)
        
        mf_results = [q for q in search.quotes if q.get('quoteType') == 'MUTUALFUND']
        other_results = [q for q in search.quotes if q.get('quoteType') != 'MUTUALFUND']

        print(f"MUTUAL FUND MATCHES ({len(mf_results)}):")
        for i, res in enumerate(mf_results, 1):
            name = res.get('longname', res.get('shortname', 'Unknown'))
            symbol = res['symbol']
            exch = res.get('exchange', 'N/A')
            print(f"{i}. {name}")
            print(f"   Symbol: {symbol} | Exch: {exch}")
        
        if not mf_results:
            print("   No Mutual Funds found in reach results.")

        print(f"\nOTHER ASSETS (STOCKS/ETFS/ETC) ({len(other_results)}):")
        for i, res in enumerate(other_results, 1):
            if i > 5: break # Only show top 5 others
            name = res.get('longname', res.get('shortname', 'Unknown'))
            symbol = res['symbol']
            q_type = res.get('quoteType', 'N/A')
            print(f"   - {name} ({symbol}) | Type: {q_type}")
        
        if len(other_results) > 5:
            print(f"   ... and {len(other_results) - 5} more.")

    except Exception as e:
        print(f"Search failed: {e}")

if __name__ == "__main__":
    import sys
    query = "HDFC"
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        
    search_mf_by_name(query)
