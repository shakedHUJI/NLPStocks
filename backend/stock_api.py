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
    symbol = request.args.get('symbol')
    metrics = request.args.get('metrics').split(',')

    app.logger.info(f"Requested metrics for {symbol}: {metrics}")

    stock = yf.Ticker(symbol)
    info = stock.info

    app.logger.info(f"Raw info from yfinance: {info}")

    # Map our metric names to yfinance metric names
    metric_mapping = {
        'P/E': 'trailingPE',
        'EPS': 'trailingEps',
        'Market Cap': 'marketCap',
        'Dividend Yield': 'dividendYield',
        '52 Week High': 'fiftyTwoWeekHigh',
        '52 Week Low': 'fiftyTwoWeekLow'
    }

    result = {}
    for metric in metrics:
        yf_metric = metric_mapping.get(metric, metric)
        if yf_metric in info:
            value = info[yf_metric]
            if isinstance(value, (int, float)):
                result[metric] = value
            else:
                result[metric] = str(value)
        else:
            result[metric] = 'N/A'
        app.logger.info(f"Metric {metric} for {symbol}: {result[metric]}")

    app.logger.info(f"Returning metrics for {symbol}: {result}")
    return jsonify(result)

@app.route('/api/process_query', methods=['POST'])
def process_query():
    data = request.json
    query = data.get('query')

    if not query:
        return jsonify({"error": "No query provided"}), 400

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",  # Kept the original model name
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful assistant that processes stock-related queries. Given a user's question, return a JSON object with the following fields:\n"
                        "- 'actions' (array of action objects, each containing:)\n"
                        "  - 'type' (e.g., 'getPrice', 'getHistory', 'getNews', 'compare', 'getMetrics', 'getEarnings')\n"
                        "  - 'symbols' (array of stock tickers)\n"
                        "  - 'startDate' (YYYY-MM-DD format for the start of the date range, if applicable)\n"
                        "  - 'endDate' (YYYY-MM-DD format for the end of the date range, if applicable)\n"
                        "  - 'metrics' (array of requested financial metrics, ONLY if explicitly asked for)\n"
                        "- 'description' (a brief explanation of the query)\n"
                        "- 'keyDates' (an array of objects, each containing a 'date' in YYYY-MM-DD format, a 'description' of the event, and a 'symbol' indicating which stock it relates to)\n\n"
                        "Important guidelines:\n"
                        "1. Always provide a date range of at least 30 days for historical data, even if the query specifies a shorter period or a single date.\n"
                        "2. For queries about specific events, set the date range to start at least 14 days before the event and end at least 14 days after the event.\n"
                        "3. If multiple events are mentioned, adjust the date range to encompass all events plus the additional context periods.\n"
                        "4. For general queries without specific dates, provide a reasonable date range based on the context of the query.\n"
                        "5. Ensure that the 'keyDates' array includes all relevant dates mentioned in the query.\n"
                        "6. If a stock comparison is requested, use the 'compare' action type.\n"
                        "7. ONLY include the 'getMetrics' action type if financial metrics are explicitly requested by the user.\n"
                        "8. Support multiple actions in a single query, e.g., both comparison and metrics retrieval if both are requested.\n"
                        "9. Only return multiple actions if the user asks for them. Otherwise, return only one action per response.\n"
                        "10. When requesting metrics, use the following available metrics: marketCap, trailingPE, forwardPE, dividendYield, beta, fiftyTwoWeekHigh, fiftyDayAverage, twoHundredDayAverage, averageVolume, regularMarketPrice, regularMarketDayHigh, regularMarketDayLow.\n"
                        "11. If earnings data is requested for multiple stocks, use the 'getEarnings' action type with multiple symbols in the 'symbols' array.\n"
                        "12. Return only the JSON object without any markdown formatting."
                    ),
                },
                {"role": "user", "content": query},
            ],
        )

        raw_response = completion.choices[0].message.content
        cleaned_content = raw_response.replace("```json\n", "").replace("\n```", "").strip()
        result = json.loads(cleaned_content)

        # Ensure there are default metrics if none are specified
        for action in result['actions']:
            if action['type'] == 'getMetrics' and (not action.get('metrics') or len(action['metrics']) == 0):
                action['metrics'] = [
                    "P/E", "EPS", "Market Cap", "Dividend Yield", "52 Week High", "52 Week Low"
                ]

        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error processing query: {str(e)}")
        return jsonify({"error": "Failed to process query"}), 500

if __name__ == '__main__':
    app.run(debug=True)