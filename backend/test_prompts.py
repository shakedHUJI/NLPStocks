import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_process_query():
    """
    Test the /api/process_query endpoint for a basic query.
    
    Verifies that the endpoint processes a simple query and returns
    appropriate actions and description.
    """
    query = "Show me Tesla's stock graph during covid"
    response = client.post("/api/process_query", json={"query": query})
    assert response.status_code == 200
    data = response.json()
    assert "actions" in data
    assert "description" in data

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
