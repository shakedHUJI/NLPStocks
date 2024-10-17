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
    assert response.status_code == 200
    data = response.json()
    assert "INVALID" in data
    assert "error" in data["INVALID"]

def test_missing_query():
    """
    Test the /api/process_query endpoint with a missing query.
    
    Ensures that the endpoint returns a 400 status code and an appropriate
    error message when no query is provided.
    """
    response = client.post("/api/process_query", json={"query": ""})
    assert response.status_code == 400
    assert response.json()["detail"] == "No query provided"
