from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf
import logging
from datetime import datetime
import os
from openai import OpenAI
import json
from dotenv import load_dotenv
import traceback

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://stockchat.co",
        "https://www.stockchat.co",
        "http://localhost:3000",
        "http://192.168.1.*", # TODO: remove local IP's
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.DEBUG)

# Initialize the OpenAI client with the API key from .env
client = OpenAI(api_key=os.getenv("REACT_APP_OPENAI_API_KEY"))

@app.get("/api/stock_data")
async def get_stock_data(symbols: str = Query(...), start_date: str = Query(...), end_date: str = Query(...)):
    logging.info(f"Received request for stock data: symbols={symbols}, start_date={start_date}, end_date={end_date}")
    symbol_list = symbols.split(',')

    if end_date == 'current':
        end_date = datetime.now().strftime('%Y-%m-%d')
        logging.info(f"End date 'current' interpreted as: {end_date}")

    logging.info(f"Fetching data for symbols: {symbol_list}, start: {start_date}, end: {end_date}")

    data = {}
    for symbol in symbol_list:
        try:
            stock = yf.Ticker(symbol)
            hist = stock.history(start=start_date, end=end_date)
            if hist.empty:
                raise HTTPException(status_code=404, detail=f"No data available for symbol: {symbol}")
            data[symbol] = hist['Close'].to_dict()
            data[symbol] = {date.strftime('%Y-%m-%d'): price for date, price in data[symbol].items()}
            logging.info(f"Successfully fetched data for {symbol}: {len(data[symbol])} data points")
        except HTTPException as he:
            raise he
        except Exception as e:
            logging.error(f"Error fetching data for {symbol}: {str(e)}")
            logging.debug(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error fetching data for {symbol}: {str(e)}")

    if not data:
        raise HTTPException(status_code=404, detail="No valid data found for any of the provided symbols")

    logging.info(f"Returning data for {len(data)} symbols")
    return data

@app.get("/api/stock_metrics")
async def get_stock_metrics(symbols: str = Query(...), metrics: str = Query(...)):
    logging.info(f"Received request for stock metrics: symbols={symbols}, metrics={metrics}")
    symbol_list = symbols.split(',')
    metric_list = metrics.split(',')

    result = {}
    for symbol in symbol_list:
        logging.info(f"Fetching metrics for {symbol}")
        try:
            stock = yf.Ticker(symbol)
            info = stock.info

            if not info or len(info) == 0:
                raise ValueError(f"No data available for symbol: {symbol}")

            symbol_metrics = {}
            for metric in metric_list:
                if metric in info:
                    value = info[metric]
                    if isinstance(value, (int, float)):
                        symbol_metrics[metric] = value
                    else:
                        symbol_metrics[metric] = str(value)
                    logging.debug(f"{symbol} - {metric}: {symbol_metrics[metric]}")
                else:
                    symbol_metrics[metric] = 'N/A'
                    logging.warning(f"{symbol} - Metric not found: {metric}")
            
            if all(value == 'N/A' for value in symbol_metrics.values()):
                raise ValueError(f"No valid metrics found for symbol: {symbol}")
            
            result[symbol] = symbol_metrics
            logging.info(f"Successfully fetched metrics for {symbol}")
        except ValueError as ve:
            logging.error(f"Error fetching metrics for {symbol}: {str(ve)}")
            raise HTTPException(status_code=404, detail=str(ve))
        except Exception as e:
            logging.error(f"Error fetching metrics for {symbol}: {str(e)}")
            logging.debug(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error fetching metrics for {symbol}: {str(e)}")

    if not result:
        raise HTTPException(status_code=404, detail="No valid data found for any of the provided symbols")

    logging.info(f"Returning metrics for {len(result)} symbols")
    return result

class QueryRequest(BaseModel):
    query: str

@app.post("/api/process_query")
async def process_query(request: QueryRequest):
    query = request.query
    logging.info(f"Received query: {query}")

    if not query:
        logging.warning("No query provided")
        raise HTTPException(status_code=400, detail="No query provided")

    try:
        logging.info("Sending request to OpenAI API")
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
                        "  - 'type' (one or more of: 'getHistory', 'getNews', 'getMetrics',)\n"
                        "  - 'symbols' (array of stock tickers)\n"
                        "  - 'startDate' (YYYY-MM-DD format)\n"
                        "  - 'endDate' (YYYY-MM-DD format or 'current' for the most recent data)\n"
                        "  - 'metrics' (array of requested financial metrics, if applicable)\n"
                        "- 'description' (a brief explanation of your analysis approach)\n"
                        "- 'keyDates' (array of objects with 'date', 'description', and 'symbol' fields for significant events)\n\n"
                        "Note: The 'keyDates' array is very important. It should contain dates that are significant for the stock's performance. This could include earnings release dates, major company announcements, or notable market events. If the user asks to see the stock in reference to something, mark those dates and related dates as key dates.\n"
                        "For example, if the user asks for insight about tesla car releases, you should include the key dates for tesla car releases in the keyDates array."
                        "Available metrics include: marketCap, trailingPE, forwardPE, dividendYield, beta, fiftyTwoWeekHigh, fiftyDayAverage, twoHundredDayAverage, averageVolume, regularMarketPrice, regularMarketDayHigh, regularMarketDayLow, totalCash, totalCashPerShare, debtToEquity, returnOnEquity, freeCashflow, operatingCashflow, earningsGrowth, revenueGrowth, grossMargins, operatingMargins, profitMargins, bookValue, priceToBook, earningsQuarterlyGrowth, netIncomeToCommon, trailingEps, forwardEps, pegRatio, enterpriseToRevenue, enterpriseToEbitda, 52WeekChange, SandP52WeekChange, lastDividendValue, lastDividendDate.\n"
                        "Ensure your response is a valid JSON object without any additional formatting."
                    ),
                },
                {"role": "user", "content": query},
            ],
        )

        raw_response = completion.choices[0].message.content
        logging.debug(f"Raw response from OpenAI: {raw_response}")

        cleaned_content = raw_response.replace("```json\n", "").replace("\n```", "").strip()
        result = json.loads(cleaned_content)
        logging.info("Successfully processed query and parsed JSON response")
        return result
    except json.JSONDecodeError as e:
        logging.error(f"Error decoding JSON response: {str(e)}")
        logging.debug(f"Problematic content: {cleaned_content}")
        raise HTTPException(status_code=500, detail="Failed to parse API response")
    except Exception as e:
        logging.error(f"Error processing query: {str(e)}")
        logging.debug(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to process query")

@app.get("/api/stock_news")
async def get_stock_news(symbol: str = Query(...)):
    logging.info(f"Received news request for symbol: {symbol}")
    if not symbol:
        raise HTTPException(status_code=400, detail="No symbol provided")

    try:
        stock = yf.Ticker(symbol)
        news = stock.news
        if not news:
            raise ValueError(f"No news data available for symbol: {symbol}")
        logging.info(f"Fetched {len(news)} news items for {symbol}")
        return news[:8]  # Return the first 8 news items
    except ValueError as ve:
        logging.error(f"Error fetching news for {symbol}: {str(ve)}")
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logging.error(f"Error fetching news for {symbol}: {str(e)}")
        logging.debug(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to fetch news data: {str(e)}")

if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
