import yfinance as yf
import pandas as pd
from datetime import datetime

def get_dividend_data(ticker_obj):
    """
    Extracts upcoming and historical dividend information from a yfinance Ticker object.
    """
    try:
        info = ticker_obj.info
        
        # Upcoming Dividend Info
        ex_date_timestamp = info.get('exDividendDate')
        ex_date = datetime.fromtimestamp(ex_date_timestamp).strftime('%Y-%m-%d') if ex_date_timestamp else None
        
        dividend_data = {
            "ex_dividend_date": ex_date,
            "forward_dividend": info.get('forwardDividend'),
            "dividend_yield": info.get('dividendYield'),
            "payout_ratio": info.get('payoutRatio'),
            "dividend_rate": info.get('dividendRate'),
            "trailing_annual_dividend_yield": info.get('trailingAnnualDividendYield'),
            "historical_dividends": []
        }
        
        # Historical Dividends
        divs = ticker_obj.dividends
        if not divs.empty:
            # Get last 5 dividends
            recent_divs = divs.tail(10).sort_index(ascending=False)
            dividend_data["historical_dividends"] = [
                {
                    "date": d.strftime('%Y-%m-%d'),
                    "amount": float(a)
                }
                for d, a in zip(recent_divs.index, recent_divs.values)
            ]
            
        return dividend_data
    except Exception as e:
        print(f"Error fetching dividend data: {e}")
        return {}

def get_ticker_news(ticker_obj):
    """
    Extracts recent news from a yfinance Ticker object.
    Handles both flat and nested 'content' structures.
    """
    try:
        news_items = ticker_obj.news
        if not news_items:
            return []
            
        formatted_news = []
        for item in news_items:
            # Handle nested 'content' if it exists
            content = item.get('content', item)
            
            # Try different potential keys for time
            pub_time = content.get('providerPublishTime') or content.get('pubDate')
            
            # If it's a ISO string, convert to timestamp
            if isinstance(pub_time, str):
                try:
                    # fromisoformat handles 'Z' if we replace it or use modern python
                    dt_str = pub_time.replace('Z', '+00:00')
                    dt = datetime.fromisoformat(dt_str)
                    pub_time = int(dt.timestamp())
                except Exception as e:
                    print(f"Error parsing date string {pub_time}: {e}")
                    pub_time = 0
            
            formatted_news.append({
                "title": content.get('title'),
                "link": content.get('clickThroughUrl', {}).get('url') if isinstance(content.get('clickThroughUrl'), dict) else content.get('link'),
                "publisher": content.get('provider', {}).get('displayName') if isinstance(content.get('provider'), dict) else content.get('publisher'),
                "providerPublishTime": pub_time if pub_time else 0,
                "type": content.get('type')
            })
        return formatted_news
    except Exception as e:
        print(f"Error fetching ticker news: {e}")
        return []
