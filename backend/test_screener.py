import requests

def test_screener():
    headers = {"User-Agent": "Mozilla/5.0"}
    
    url_gainers = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=IN&scrIds=day_gainers_in&count=10"
    res1 = requests.get(url_gainers, headers=headers)
    print("Gainers:", res1.status_code)
    try:
        data = res1.json()
        quotes = data.get("finance", {}).get("result", [])[0].get("quotes", [])
        for q in quotes:
            print(f"  {q.get('symbol')} - {q.get('shortName')} : {q.get('regularMarketChangePercent')}%")
    except Exception as e:
        print("Gainers Error:", e)

    url_losers = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=IN&scrIds=day_losers_in&count=10"
    res2 = requests.get(url_losers, headers=headers)
    print("Losers:", res2.status_code)

if __name__ == "__main__":
    test_screener()
