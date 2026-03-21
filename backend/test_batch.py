import yfinance as yf
import time

def test_fetch():
    nifty50_symbols = [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "BHARTIARTL.NS",
        "SBIN.NS", "INFY.NS", "ITC.NS", "HINDUNILVR.NS", "LT.NS",
        "BAJFINANCE.NS", "HCLTECH.NS", "MARUTI.NS", "SUNPHARMA.NS", "TATAMOTORS.NS",
        "ASIANPAINT.NS", "KOTAKBANK.NS", "M&M.NS", "AXISBANK.NS", "ONGC.NS",
        "NTPC.NS", "POWERGRID.NS", "WIPRO.NS", "TATASTEEL.NS", "COALINDIA.NS",
        "ULTRACEMCO.NS", "TITAN.NS", "BAJAJFINSV.NS", "NESTLEIND.NS", "ADANIENT.NS",
        "ADANIPORTS.NS", "GRASIM.NS", "INDUSINDBK.NS", "BRITANNIA.NS", "TECHM.NS",
        "HINDALCO.NS", "JSWSTEEL.NS", "EICHERMOT.NS", "DRREDDY.NS", "DIVISLAB.NS",
        "SBILIFE.NS", "HDFCLIFE.NS", "BPCL.NS", "HEROMOTOCO.NS", "CIPLA.NS",
        "APOLLOHOSP.NS", "UPL.NS", "BAJAJ-AUTO.NS", "TATACONSUM.NS", "SHREECEM.NS"
    ]
    
    start_time = time.time()
    # Fetch data
    df = yf.download(nifty50_symbols, period="2d", interval="1d", group_by="ticker", threads=True, auto_adjust=True)
    
    results = []
    
    for symbol in nifty50_symbols:
        try:
            ticker_data = df[symbol] if len(nifty50_symbols) > 1 else df
            if len(ticker_data) >= 2:
                prev_close = ticker_data['Close'].iloc[-2]
                curr_price = ticker_data['Close'].iloc[-1]
                change = curr_price - prev_close
                if prev_close > 0:
                    change_pct = (change / prev_close) * 100
                else:
                    change_pct = 0
            elif len(ticker_data) == 1:
                curr_price = ticker_data['Close'].iloc[-1]
                change = 0
                change_pct = 0
            else:
                continue
            
            if curr_price > 0:
                results.append({
                    "symbol": symbol.replace('.NS', ''),
                    "price": float(curr_price),
                    "change": float(change),
                    "changePercent": float(change_pct)
                })
        except Exception as e:
            continue
            
    results.sort(key=lambda x: x['changePercent'], reverse=True)
    
    print(f"Time taken: {time.time() - start_time:.2f} seconds")
    print("Gainers:")
    for r in results[:5]:
        print(f"  {r['symbol']}: {r['changePercent']:.2f}%")
        
    print("Losers:")
    for r in results[-5:]:
        print(f"  {r['symbol']}: {r['changePercent']:.2f}%")

if __name__ == "__main__":
    test_fetch()
