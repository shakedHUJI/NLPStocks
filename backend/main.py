from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import yfinance as yf
import pandas as pd
from datetime import datetime
import os
from openai import OpenAI
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize the OpenAI client with the API key from .env
client = OpenAI(api_key=os.getenv("REACT_APP_OPENAI_API_KEY"))

class StockDataRequest(BaseModel):
    symbols: List[str]
    start_date: str
    end_date: str

class StockMetricsRequest(BaseModel):
    symbols: List[str]
    metrics: List[str]

class QueryRequest(BaseModel):
    query: str

@app.get("/api/stock_data")
async def get_stock_data(request: StockDataRequest):
    data = {}
    for symbol in request.symbols:
        stock = yf.Ticker(symbol)
        hist = stock.history(start=request.start_date, end=request.end_date)
        data[symbol] = hist['Close'].to_dict()

    # Convert dates to string format
    for symbol in data:
        data[symbol] = {date.strftime('%Y-%m-%d'): price for date, price in data[symbol].items()}

    return data

@app.get("/api/stock_metrics")
async def get_stock_metrics(request: StockMetricsRequest):
    result = {}
    for symbol in request.symbols:
        stock = yf.Ticker(symbol)
        info = stock.info

        symbol_metrics = {}
        for metric in request.metrics:
            if metric in info:
                value = info[metric]
                if isinstance(value, (int, float)):
                    symbol_metrics[metric] = value
                else:
                    symbol_metrics[metric] = str(value)
            else:
                symbol_metrics[metric] = 'N/A'
        
        result[symbol] = symbol_metrics

    return result

@app.post("/api/process_query")
async def process_query(request: QueryRequest):
    if not request.query:
        raise HTTPException(status_code=400, detail="No query provided")

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
                {"role": "user", "content": request.query},
            ],
        )

        raw_response = completion.choices[0].message.content
        cleaned_content = raw_response.replace("```json\n", "").replace("\n```", "").strip()
        result = json.loads(cleaned_content)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process query: {str(e)}")

@app.get("/api/stock_news")
async def get_stock_news(symbol: str):
    if not symbol:
        raise HTTPException(status_code=400, detail="No symbol provided")

    try:
        stock = yf.Ticker(symbol)
        news = stock.news
        return news[:8]  # Return the first 8 news items
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch news data: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
