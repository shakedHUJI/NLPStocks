import yfinance as yf
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import logging
from datetime import datetime
import os
from openai import OpenAI
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

# Initialize the OpenAI client with the API key from .env
client = OpenAI(api_key=os.getenv("REACT_APP_OPENAI_API_KEY"))

@app.route('/api/stock_data', methods=['GET'])
def get_stock_data():
    app.logger.info(f"Received request: {request.args}")
    symbols = request.args.get('symbols').split(',')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    # If end_date is 'current', use today's date
    if end_date == 'current':
        end_date = datetime.now().strftime('%Y-%m-%d')

    app.logger.info(f"Fetching data for symbols: {symbols}, start: {start_date}, end: {end_date}")

    data = {}
    for symbol in symbols:
        stock = yf.Ticker(symbol)
        hist = stock.history(start=start_date, end=end_date)
        data[symbol] = hist['Close'].to_dict()

    # Convert dates to string format
    for symbol in data:
        data[symbol] = {date.strftime('%Y-%m-%d'): price for date, price in data[symbol].items()}

    app.logger.info(f"Returning data: {data}")
    return jsonify(data)

@app.route('/api/stock_metrics', methods=['GET'])
def get_stock_metrics():
    symbols = request.args.get('symbols').split(',')
    metrics = request.args.get('metrics').split(',')

    app.logger.info(f"Requested metrics for {symbols}: {metrics}")

    result = {}
    for symbol in symbols:
        stock = yf.Ticker(symbol)
        info = stock.info

        symbol_metrics = {}
        for metric in metrics:
            if metric in info:
                value = info[metric]
                if isinstance(value, (int, float)):
                    symbol_metrics[metric] = value
                else:
                    symbol_metrics[metric] = str(value)
            else:
                symbol_metrics[metric] = 'N/A'
        
        result[symbol] = symbol_metrics
        app.logger.info(f"Metrics for {symbol}: {symbol_metrics}")

    return jsonify(result)

@app.route('/api/process_query', methods=['POST'])
def process_query():
    data = request.json
    query = data.get('query')

    if not query:
        return jsonify({"error": "No query provided"}), 400

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an intelligent assistant specializing in stock market analysis. Your task is to interpret user queries about stocks and provide comprehensive insights. When faced with ambiguous or open-ended requests, you have the autonomy to decide which actions and data would be most valuable to the user. Here are your guidelines:\n\n"
                        "1. Interpret the user's intent and provide a holistic response that may include multiple types of data and analyses.\n"
                        "2. For comparison queries, consider including both historical price data and relevant financial metrics.\n"
                        "3. When specific metrics aren't requested, choose metrics that you believe are most relevant to the stocks and context of the query.\n"
                        "4. Only include news data when it is specifically requested in the query.\n"
                        "5. For general queries about a stock's performance, provide a mix of historical data and key metrics.\n"
                        "6. Always aim to provide the most insightful and comprehensive response possible, utilizing all available data sources at your disposal.\n"
                        "7. When retrieving historical stock price data, identify and include key dates that might be significant for the stock's performance. These could include earnings release dates, major company announcements, or notable market events.\n"
                        "8. If the query implies a need for the most recent data, use 'current' as the end date. The backend will interpret this and fetch the most up-to-date information available.\n"
                        "9. When asked to present a graph or chart, interpret this as a request for historical data (use 'getHistory' action type). The frontend will handle the actual graph rendering.\n"
                        "10. When a user asks to show events or significant dates related to a stock, include this information in the 'keyDates' array. Each entry should have a date, description, and associated symbol.\n\n"
                        "Return a JSON object with the following fields:\n"
                        "- 'actions' (array of action objects, each containing:)\n"
                        "  - 'type' (e.g., 'getPrice', 'getHistory', 'getNews', 'compare', 'getMetrics', 'getEarnings')\n"
                        "  - 'symbols' (array of stock tickers)\n"
                        "  - 'startDate' (YYYY-MM-DD format)\n"
                        "  - 'endDate' (YYYY-MM-DD format or 'current' for the most recent data)\n"
                        "  - 'metrics' (array of requested financial metrics, if applicable)\n"
                        "- 'description' (a brief explanation of your analysis approach)\n"
                        "- 'keyDates' (array of objects with 'date', 'description', and 'symbol' fields for significant events)\n\n"
                        "Available metrics include: marketCap, trailingPE, forwardPE, dividendYield, beta, fiftyTwoWeekHigh, fiftyDayAverage, twoHundredDayAverage, averageVolume, regularMarketPrice, regularMarketDayHigh, regularMarketDayLow, totalCash, totalCashPerShare, debtToEquity, returnOnEquity, freeCashflow, operatingCashflow, earningsGrowth, revenueGrowth, grossMargins, operatingMargins, profitMargins, bookValue, priceToBook, earningsQuarterlyGrowth, netIncomeToCommon, trailingEps, forwardEps, pegRatio, enterpriseToRevenue, enterpriseToEbitda, 52WeekChange, SandP52WeekChange, lastDividendValue, lastDividendDate.\n"
                        "Ensure your response is a valid JSON object without any additional formatting."
                    ),
                },
                {"role": "user", "content": query},
            ],
        )

        raw_response = completion.choices[0].message.content
        cleaned_content = raw_response.replace("```json\n", "").replace("\n```", "").strip()
        result = json.loads(cleaned_content)

        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error processing query: {str(e)}")
        return jsonify({"error": "Failed to process query"}), 500

@app.route('/api/stock_news', methods=['GET'])
def get_stock_news():
    symbol = request.args.get('symbol')
    app.logger.info(f"Received news request for symbol: {symbol}")
    if not symbol:
        return jsonify({"error": "No symbol provided"}), 400

    try:
        stock = yf.Ticker(symbol)
        news = stock.news
        app.logger.info(f"Fetched {len(news)} news items for {symbol}")
        return jsonify(news[:8])  # Return the first 8 news items
    except Exception as e:
        app.logger.error(f"Error fetching news for {symbol}: {str(e)}")
        return jsonify({"error": f"Failed to fetch news data: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)