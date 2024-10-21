import { useState } from "react";
import { parseISO, isAfter, isBefore } from "date-fns";
import AIQueryProcessor from "../AIQueryProcessor";
import { fetchStockData, fetchMetrics, fetchNewsData } from "../api/stockApi";
import { LINE_COLORS } from "../constants";

const useStockSearch = () => {
  const [query, setQuery] = useState("");
  const [showGraph, setShowGraph] = useState(false);
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [description, setDescription] = useState("");
  const [keyDates, setKeyDates] = useState([]);
  const [loadingState, setLoadingState] = useState("");
  const [stockSymbols, setStockSymbols] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [colorMap, setColorMap] = useState({});
  const [zoomState, setZoomState] = useState({
    refAreaLeft: "",
    refAreaRight: "",
    left: "dataMin",
    right: "dataMax",
    animation: true,
  });
  const [originalStockData, setOriginalStockData] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [newsData, setNewsData] = useState([]);
  const [aiAnalysisDescription, setAiAnalysisDescription] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isDifferenceMode, setIsDifferenceMode] = useState(false);

  const handleSubmit = async (e, promptQuery = null) => {
    if (e) e.preventDefault();

    const searchQuery = promptQuery || query;
    if (!searchQuery.trim()) {
      setError("Please enter a query");
      return;
    }

    setQuery(searchQuery);
    setHasSearched(true);
    setShowGraph(false);
    setLoading(true);
    setError(null);
    setLoadingState("Analyzing your search");
    setMetrics({});
    setNewsData([]);
    setAiAnalysisDescription("");

    try {
      const result = await processQuery(searchQuery);
      console.log("AI Query result:", result);

      if (result && result.actions) {
        setAiAnalysisDescription(result.description || "");

        for (const action of result.actions) {
          switch (action.type) {
            case "getNews":
              await handleFetchNewsData(action.symbols[0]);
              break;
            case "getHistory":
              setLoadingState("Fetching stock data");
              setStockSymbols(action.symbols);
              setCompareMode(action.type === "compare");
              handleFetchStockData(
                action.symbols,
                action.startDate,
                action.endDate
              );
              break;
            case "getMetrics":
              handleFetchMetrics(action.symbols, action.metrics);
              break;
            default:
              console.error(`Unsupported action type: ${action.type}`);
          }
        }

        setDescription(result.description || "");
        setKeyDates(result.keyDates || []);
      } else {
        throw new Error("Invalid response from AI query processor");
      }
    } catch (err) {
      console.error("Error processing query:", err);
      setError(`Failed to process query: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  };

  const handleFetchStockData = async (symbols, start, end) => {
    try {
      const stockData = await fetchStockData(symbols, start, end);

      const mergedData = Object.keys(stockData[symbols[0]]).map((date) => {
        const dataPoint = { date };
        symbols.forEach((symbol) => {
          dataPoint[symbol] = stockData[symbol][date];
        });
        return dataPoint;
      });

      setStockData(mergedData);
      setOriginalStockData(mergedData);
      setShowGraph(true);
      setLoadingState("");

      const newColorMap = symbols.reduce((acc, symbol, index) => {
        acc[symbol] = LINE_COLORS[index % LINE_COLORS.length];
        return acc;
      }, {});
      setColorMap(newColorMap);
    } catch (err) {
      console.error("Error fetching stock data:", err);
      setError("Failed to fetch stock data. Please try again.");
      setLoadingState("");
    }
  };

  const handleFetchMetrics = async (symbols, requestedMetrics) => {
    try {
      const fetchedMetrics = await fetchMetrics(symbols, requestedMetrics);
      setMetrics(fetchedMetrics);
      setLoadingState("");
    } catch (err) {
      console.error("Error fetching metrics:", err);
      setError(
        "Failed to fetch metrics. Please check the console for more details."
      );
      setLoadingState("");
    }
  };

  const handleFetchNewsData = async (symbol) => {
    try {
      const newsData = await fetchNewsData(symbol);
      setNewsData(newsData);
    } catch (err) {
      console.error("Error fetching news data:", err);
      setError(`Failed to fetch news data: ${err.message}`);
    }
  };

  const handleZoom = () => {
    let { refAreaLeft, refAreaRight } = zoomState;

    if (refAreaLeft === refAreaRight || refAreaRight === "") {
      setZoomState((prev) => ({
        ...prev,
        refAreaLeft: "",
        refAreaRight: "",
      }));
      return;
    }

    if (isAfter(parseISO(refAreaLeft), parseISO(refAreaRight))) {
      [refAreaLeft, refAreaRight] = [refAreaRight, refAreaLeft];
    }

    const filteredData = originalStockData.filter(
      (d) =>
        !isBefore(parseISO(d.date), parseISO(refAreaLeft)) &&
        !isAfter(parseISO(d.date), parseISO(refAreaRight))
    );

    setStockData(filteredData);
    setZoomState((prev) => ({
      ...prev,
      refAreaLeft: "",
      refAreaRight: "",
      left: refAreaLeft,
      right: refAreaRight,
    }));
  };

  const handleZoomOut = () => {
    setStockData(originalStockData);
    setZoomState({
      refAreaLeft: "",
      refAreaRight: "",
      left: "dataMin",
      right: "dataMax",
      animation: true,
    });
  };

  const { processQuery, error: aiError } = AIQueryProcessor({
    onQueryProcessed: (result) => {
      console.log("AI Query result:", result);
      setDescription(result.description);
      setKeyDates(result.keyDates);
      setLoadingState(`Fetching ${result.description}`);

      const compareAction = result.actions.find(
        (action) => action.type === "compare" || action.type === "getHistory"
      );
      const metricsAction = result.actions.find(
        (action) => action.type === "getMetrics"
      );

      if (compareAction) {
        setStockSymbols(compareAction.symbols);
        setCompareMode(compareAction.type === "compare");
        handleFetchStockData(
          compareAction.symbols,
          compareAction.startDate,
          compareAction.endDate
        );
      }

      if (metricsAction) {
        handleFetchMetrics(metricsAction.symbols, metricsAction.metrics);
      }
    },
  });

  const toggleDifferenceMode = () => {
    setIsDifferenceMode((prev) => !prev);
  };

  return {
    query,
    setQuery,
    handleSubmit,
    loading,
    loadingState,
    error,
    aiError,
    showGraph,
    stockData,
    stockSymbols,
    colorMap,
    description,
    keyDates,
    compareMode,
    zoomState,
    setZoomState,
    handleZoom,
    handleZoomOut,
    metrics,
    newsData,
    aiAnalysisDescription,
    hasSearched,
    setShowGraph,
    isDifferenceMode,
    toggleDifferenceMode,
  };
};

export default useStockSearch;
