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

def test_process_query():
    """
    Test the /api/process_query endpoint for a basic query.
    
    Verifies that the endpoint processes a simple query and returns
    appropriate actions and description.
    """
    query = "What's the current price of Apple stock?"
    response = client.post("/api/process_query", json={"query": query})
    assert response.status_code == 200
    data = response.json()
    assert "actions" in data
    assert "description" in data

def test_get_stock_news():
    """
    Test the /api/stock_news endpoint.
    
    Ensures that the endpoint returns a list of news items for a given stock symbol,
    with a maximum of 8 items.
    """
    response = client.get("/api/stock_news?symbol=AAPL")
    assert response.status_code == 200
    news = response.json()
    assert isinstance(news, list)
    assert len(news) <= 8

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

def test_process_query_comparison():
    """
    Test the /api/process_query endpoint for a stock comparison query.
    
    Verifies that the endpoint correctly processes a query comparing two stocks,
    returning appropriate actions and symbols.
    """
    query = "Compare Apple and Microsoft stocks over the last month"
    response = client.post("/api/process_query", json={"query": query})
    assert response.status_code == 200
    data = response.json()
    assert "actions" in data
    assert "description" in data
    assert len(data["actions"]) >= 1
    assert "AAPL" in data["actions"][0]["symbols"]
    assert "MSFT" in data["actions"][0]["symbols"]
    assert data["actions"][0]["type"] in ["getHistory", "compare"]

def test_process_query_metrics():
    """
    Test the /api/process_query endpoint for a query about stock metrics.
    
    Ensures that the endpoint correctly processes a query about specific
    stock metrics for multiple companies.
    """
    query = "What are the current P/E ratios and market caps of Tesla and Amazon?"
    response = client.post("/api/process_query", json={"query": query})
    assert response.status_code == 200
    data = response.json()
    assert "actions" in data
    assert "description" in data
    assert len(data["actions"]) >= 1
    assert "TSLA" in data["actions"][0]["symbols"]
    assert "AMZN" in data["actions"][0]["symbols"]
    assert "trailingPE" in data["actions"][0]["metrics"]
    assert "marketCap" in data["actions"][0]["metrics"]

def test_process_query_news():
    """
    Test the /api/process_query endpoint for a news query.
    
    Verifies that the endpoint correctly processes a query requesting
    news about a specific company.
    """
    query = "Get me the latest news about Google"
    response = client.post("/api/process_query", json={"query": query})
    assert response.status_code == 200
    data = response.json()
    assert "actions" in data
    assert "description" in data
    assert len(data["actions"]) >= 1
    assert "GOOGL" in data["actions"][0]["symbols"]
    assert data["actions"][0]["type"] == "getNews"

def test_process_query_historical_data():
    """
    Test the /api/process_query endpoint for a historical data query.
    
    Ensures that the endpoint correctly processes a query requesting
    historical stock data for a specific time period.
    """
    query = "Show me a graph of Netflix stock performance over the past year"
    response = client.post("/api/process_query", json={"query": query})
    assert response.status_code == 200
    data = response.json()
    assert "actions" in data
    assert "description" in data
    assert len(data["actions"]) >= 1
    assert "NFLX" in data["actions"][0]["symbols"]
    assert data["actions"][0]["type"] == "getHistory"
    assert "startDate" in data["actions"][0]
    assert "endDate" in data["actions"][0]

def test_process_query_key_dates():
    """
    Test the /api/process_query endpoint for a key dates query.
    
    Verifies that the endpoint correctly processes a query about
    significant events for a stock in a specific time period.
    """
    query = "What were the significant events for Apple stock in the last quarter?"
    response = client.post("/api/process_query", json={"query": query})
    assert response.status_code == 200
    data = response.json()
    assert "actions" in data
    assert "description" in data
    assert "keyDates" in data
    assert len(data["keyDates"]) > 0
    assert all(["date" in event and "description" in event and "symbol" in event for event in data["keyDates"]])


def test_invalid_query():
    """
    Test the /api/process_query endpoint with an invalid query.
    
    Verifies that the endpoint handles invalid or nonsensical queries gracefully,
    still returning a response with actions and description.
    """
    response = client.post("/api/process_query", json={"query": "12345"})
    assert response.status_code == 200
    data = response.json()
    assert "actions" in data
    assert "description" in data
