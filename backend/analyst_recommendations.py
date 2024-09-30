import yfinance as yf

def get_analyst_recommendations(ticker):
    stock = yf.Ticker(ticker)
    
    print(stock.news)

if __name__ == "__main__":
    get_analyst_recommendations("TSLA")