import yfinance as yf

def get_analyst_recommendations(ticker):
    stock = yf.Ticker(ticker)
    recommendations = stock.recommendations
    
    print(recommendations)
    print(stock.info)
if __name__ == "__main__":
    get_analyst_recommendations("TSLA")