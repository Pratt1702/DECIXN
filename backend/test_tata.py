import yfinance as yf

symbols = ["TATAMOTORS.NS", "TMPV.NS", "TMCV.NS", "TRENT.NS", "BEL.NS"]
for s in symbols:
    info = yf.Ticker(s).info
    print(f"{s}: {info.get('shortName', 'Not Found')}")
