import yfinance as yf
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import logging
from datetime import datetime

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

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

@app.route('/api/stock_earnings', methods=['GET'])
def get_stock_earnings():
    symbols = request.args.get('symbols')
    if not symbols:
        return jsonify({"error": "No symbols provided"}), 400
    
    symbols = symbols.split(',')
    app.logger.info(f"Fetching earnings data for {symbols}")

    result = {}
    for symbol in symbols:
        stock = yf.Ticker(symbol)
        
        # Fetch income statement data
        income_stmt = stock.income_stmt
        app.logger.info(f"Income statement data for {symbol}: {income_stmt}")

        # Fetch earnings dates
        earnings_dates = stock.earnings_dates
        app.logger.info(f"Earnings dates data for {symbol}: {earnings_dates}")

        # Process income statement data
        earnings_data = []
        if income_stmt is not None and not income_stmt.empty:
            try:
                net_income = income_stmt.loc['Net Income']
                total_revenue = income_stmt.loc['Total Revenue']
                for date, income in net_income.items():
                    earnings_data.append({
                        'Year': date.strftime('%Y'),
                        'Earnings': float(income),
                        'Revenue': float(total_revenue.get(date, 0))
                    })
            except Exception as e:
                app.logger.error(f"Error processing income statement for {symbol}: {str(e)}")

        # Process earnings dates data
        earnings_dates_data = []
        current_date = datetime.now().date()
        if earnings_dates is not None and not earnings_dates.empty:
            try:
                for date, row in earnings_dates.iterrows():
                    if date.date() > current_date and pd.notnull(row['EPS Estimate']):
                        earnings_dates_data.append({
                            'Date': date.strftime('%Y-%m-%d'),
                            'EPS_Estimate': float(row['EPS Estimate']),
                            'Revenue_Estimate': None  # Yahoo Finance doesn't provide revenue estimates
                        })
            except Exception as e:
                app.logger.error(f"Error processing earnings dates for {symbol}: {str(e)}")

        result[symbol] = {
            'historical_earnings': earnings_data,
            'upcoming_earnings': earnings_dates_data
        }

    app.logger.info(f"Returning earnings data: {result}")
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)