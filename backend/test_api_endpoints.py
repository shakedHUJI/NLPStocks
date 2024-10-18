import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_stock_data():
    """
    Test the /api/stock_data endpoint.
    
    Verifies that the endpoint returns stock data for a given symbol
    within a specified date range.
    """
    response = client.get("/api/stock_data?symbols=AAPL&start_date=2023-01-01&end_date=2023-01-31")
    assert response.status_code == 200
    data = response.json()
    assert "AAPL" in data
    assert len(data["AAPL"]) > 0

def test_get_stock_metrics():
    """
    Test the /api/stock_metrics endpoint.
    
    Ensures that the endpoint returns specified metrics for a given stock symbol.
    """
    response = client.get("/api/stock_metrics?symbols=AAPL&metrics=marketCap,trailingPE")
    assert response.status_code == 200
    data = response.json()
    assert "AAPL" in data
    assert "marketCap" in data["AAPL"]
    assert "trailingPE" in data["AAPL"]

def test_get_stock_news():
    """
    Test the /api/stock_news endpoint.
    
    Ensures that the endpoint returns a list of news items for a given stock symbol.
    """
    response = client.get("/api/stock_news?symbol=AAPL")
    assert response.status_code == 200
    news = response.json()
    assert isinstance(news, list)

def test_invalid_stock_symbol():
    """
    Test the /api/stock_data endpoint with an invalid stock symbol.
    
    Verifies that the endpoint handles invalid stock symbols gracefully,
    returning an error message in the response.
    """
    response = client.get("/api/stock_data?symbols=INVALID&start_date=2023-01-01&end_date=2023-01-31")
    assert response.status_code == 500
    data = response.json()
    assert "detail" in data
    assert "Error fetching data for INVALID" in data["detail"]

def test_get_stock_metrics_invalid_symbol():
    """
    Test the /api/stock_metrics endpoint with an invalid stock symbol.
    
    Ensures that the endpoint handles invalid stock symbols gracefully,
    returning an appropriate error message.
    """
    response = client.get("/api/stock_metrics?symbols=INVALID&metrics=marketCap,trailingPE")
    assert response.status_code == 500
    data = response.json()
    assert "detail" in data
    assert "Error fetching metrics for INVALID" in data["detail"]

def test_get_stock_news_invalid_symbol():
    """
    Test the /api/stock_news endpoint with an invalid stock symbol.
    
    Ensures that the endpoint handles invalid stock symbols gracefully,
    returning an appropriate error message.
    """
    response = client.get("/api/stock_news?symbol=INVALID")
    assert response.status_code == 500
    data = response.json()
    assert "detail" in data
    assert "Failed to fetch news data" in data["detail"]

def test_get_stock_news_missing_symbol():
    """
    Test the /api/stock_news endpoint with a missing symbol.
    
    Ensures that the endpoint returns a 400 status code when no symbol is provided.
    """
    response = client.get("/api/stock_news?symbol=")
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert "No symbol provided" in data["detail"]

def test_missing_query():
    """
    Test the /api/process_query endpoint with a missing query.
    
    Ensures that the endpoint returns a 400 status code and an appropriate
    error message when no query is provided.
    """
    response = client.post("/api/process_query", json={"query": ""})
    assert response.status_code == 400
    assert response.json()["detail"] == "No query provided"

def test_get_stock_data_multiple_symbols():
    """
    Test the /api/stock_data endpoint with multiple stock symbols.
    
    Verifies that the endpoint returns stock data for multiple symbols
    within a specified date range.
    """
    response = client.get("/api/stock_data?symbols=AAPL,MSFT&start_date=2023-01-01&end_date=2023-01-31")
    assert response.status_code == 200
    data = response.json()
    assert "AAPL" in data
    assert "MSFT" in data
    assert len(data["AAPL"]) > 0
    assert len(data["MSFT"]) > 0

def test_get_stock_data_current_date():
    """
    Test the /api/stock_data endpoint with 'current' as the end date.
    
    Ensures that the endpoint handles the 'current' end date correctly
    and returns the most recent data.
    """
    response = client.get("/api/stock_data?symbols=AAPL&start_date=2023-01-01&end_date=current")
    assert response.status_code == 200
    data = response.json()
    assert "AAPL" in data
    assert len(data["AAPL"]) > 0

def test_get_stock_metrics_multiple_metrics():
    """
    Test the /api/stock_metrics endpoint with multiple metrics.
    
    Verifies that the endpoint returns multiple specified metrics
    for a given stock symbol.
    """
    response = client.get("/api/stock_metrics?symbols=AAPL&metrics=marketCap,trailingPE,forwardPE,dividendYield")
    assert response.status_code == 200
    data = response.json()
    assert "AAPL" in data
    assert "marketCap" in data["AAPL"]
    assert "trailingPE" in data["AAPL"]
    assert "forwardPE" in data["AAPL"]
    assert "dividendYield" in data["AAPL"]

def test_get_stock_metrics_multiple_symbols():
    """
    Test the /api/stock_metrics endpoint with multiple stock symbols.
    
    Ensures that the endpoint returns specified metrics for multiple
    stock symbols.
    """
    response = client.get("/api/stock_metrics?symbols=AAPL,MSFT&metrics=marketCap,trailingPE")
    assert response.status_code == 200
    data = response.json()
    assert "AAPL" in data
    assert "MSFT" in data
    assert "marketCap" in data["AAPL"]
    assert "trailingPE" in data["AAPL"]
    assert "marketCap" in data["MSFT"]
    assert "trailingPE" in data["MSFT"]

def test_get_stock_metrics_invalid_metric():
    """
    Test the /api/stock_metrics endpoint with an invalid metric.
    
    Verifies that the endpoint handles invalid metrics gracefully,
    returning 'N/A' for the invalid metric.
    """
    response = client.get("/api/stock_metrics?symbols=AAPL&metrics=marketCap,invalidMetric")
    assert response.status_code == 200
    data = response.json()
    assert "AAPL" in data
    assert "marketCap" in data["AAPL"]
    assert "invalidMetric" in data["AAPL"]
    assert data["AAPL"]["invalidMetric"] == "N/A"

def test_get_stock_news_limit():
    """
    Test the /api/stock_news endpoint to ensure it limits the number of news items.
    
    Verifies that the endpoint returns no more than 8 news items for a given stock symbol.
    """
    response = client.get("/api/stock_news?symbol=AAPL")
    assert response.status_code == 200
    news = response.json()
    assert isinstance(news, list)
    assert len(news) <= 8

def test_cors_headers():
    """
    Test that CORS headers are properly set.
    
    Verifies that the API responds with the correct CORS headers for allowed origins.
    """
    response = client.get("/api/stock_data?symbols=AAPL&start_date=2023-01-01&end_date=2023-01-31", headers={"Origin": "https://stockchat.co"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://stockchat.co"

def test_invalid_date_format():
    """
    Test the /api/stock_data endpoint with an invalid date format.
    
    Ensures that the endpoint handles invalid date formats gracefully,
    returning an appropriate error message.
    """
    response = client.get("/api/stock_data?symbols=AAPL&start_date=invalid_date&end_date=2023-01-31")
    assert response.status_code == 500
    data = response.json()
    assert "detail" in data
    assert "Error fetching data for AAPL" in data["detail"]
