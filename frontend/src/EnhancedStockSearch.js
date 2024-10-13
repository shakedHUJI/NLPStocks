"use client";

import React, { useState, useEffect, useRef } from "react";
import { ThemeProvider } from "next-themes";
import {
  Search,
  Moon,
  Sun,
  TrendingUp,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AIQueryProcessor from "./AIQueryProcessor";
import axios from "axios";
import { useTheme } from "next-themes";
import { parseISO, isAfter, isBefore } from "date-fns";

import { Button } from "./UI/button.tsx";
import { Input } from "./UI/input.tsx";
import { Card, CardHeader, CardTitle, CardContent } from "./UI/card.tsx";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./UI/tooltip.tsx";

import "./EnhancedStockSearch.css";
import LoadingDots from "./components/LoadingDots";
import {
  formatLargeNumber,
  formatPercentage,
  formatNumber,
} from "./utils/formatters";
import StockGraph from "./UI/StockGraph.tsx";

import { API_BASE_URL } from "./config";

const lineColors = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

export default function EnhancedStockSearch() {
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
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const { theme, setTheme } = useTheme();

  // Example prompts
  const examplePrompts = [
    "How did apple's stock reacted to all iphone releases?",
    "Show me the latest news for Tesla",
    "Compare Apple and Microsoft stock performance over the last year",
    "What are the key financial metrics for Amazon?",
  ];

  useEffect(() => {
    console.log("Current metrics state:", metrics);
  }, [metrics]);

  const handleSubmit = async (e, promptQuery = null) => {
    if (e) e.preventDefault();
    
    const searchQuery = promptQuery || query;
    if (!searchQuery.trim()) {
      setError("Please enter a query");
      return;
    }

    setQuery(searchQuery); // Update the input field
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
              setLoadingState("Fetching news data");
              await fetchNewsData(action.symbols[0]);
              break;
            case "compare":
            case "getHistory":
              setStockSymbols(action.symbols);
              setCompareMode(action.type === "compare");
              fetchStockData(action.symbols, action.startDate, action.endDate);
              break;
            case "getMetrics":
              fetchMetrics(action.symbols, action.metrics);
              break;
            // Add more cases for other action types if needed
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

  const fetchStockData = async (symbols, start, end) => {
    console.log("Fetching stock data with params:", { symbols, start, end });
    console.log("API_BASE_URL:", API_BASE_URL);
    try {
      const url = `${API_BASE_URL}/api/stock_data`;
      console.log("Full API URL:", url);
      const response = await axios.get(url, {
        params: {
          symbols: symbols.join(","),
          start_date: start,
          end_date: end,
        },
      });

      console.log("API Response:", response.data);

      const stockData = response.data;

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
        acc[symbol] = lineColors[index % lineColors.length];
        return acc;
      }, {});
      setColorMap(newColorMap);
    } catch (err) {
      console.error("Error fetching stock data:", err);
      console.error(
        "Error details:",
        err.response ? err.response.data : err.message
      );
      setError("Failed to fetch stock data. Please try again.");
      setLoadingState("");
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const clearInput = () => {
    setQuery("");
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

  const fetchMetrics = async (symbols, requestedMetrics) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stock_metrics`, {
        params: {
          symbols: symbols.join(","),
          metrics: requestedMetrics.join(","),
        },
      });

      const fetchedMetrics = response.data;

      // Format the metrics as needed
      Object.keys(fetchedMetrics).forEach((symbol) => {
        Object.keys(fetchedMetrics[symbol]).forEach((metric) => {
          const value = fetchedMetrics[symbol][metric];
          if (typeof value === "number") {
            if (
              [
                "marketCap",
                "totalCash",
                "freeCashflow",
                "operatingCashflow",
                "netIncomeToCommon",
              ].includes(metric)
            ) {
              fetchedMetrics[symbol][metric] = formatLargeNumber(value);
            } else if (
              [
                "dividendYield",
                "profitMargins",
                "operatingMargins",
                "grossMargins",
                "returnOnEquity",
                "earningsGrowth",
                "revenueGrowth",
                "52WeekChange",
                "SandP52WeekChange",
              ].includes(metric)
            ) {
              fetchedMetrics[symbol][metric] = formatPercentage(value);
            } else {
              fetchedMetrics[symbol][metric] = formatNumber(value);
            }
          }
        });
      });

      setMetrics(fetchedMetrics);
      setLoadingState("");
    } catch (err) {
      console.error("Error fetching metrics:", err);
      setError(
        `Failed to fetch metrics. Please check the console for more details.`
      );
      setLoadingState("");
    }
  };

  const handleDoubleClick = (event) => {
    event.preventDefault(); // Prevent default double-click behavior
    handleZoomOut();
  };

  const fetchNewsData = async (symbol) => {
    console.log(`Fetching news data for symbol: ${symbol}`);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stock_news`, {
        params: { symbol },
      });
      console.log("News data received:", response.data);
      setNewsData(response.data);
    } catch (err) {
      console.error("Error fetching news data:", err);
      setError(`Failed to fetch news data: ${err.message}`);
    }
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
        fetchStockData(
          compareAction.symbols,
          compareAction.startDate,
          compareAction.endDate
        );
      }

      if (metricsAction) {
        fetchMetrics(metricsAction.symbols, metricsAction.metrics);
      }
    },
  });

  const handleExamplePrompt = (prompt) => {
    handleSubmit(null, prompt);
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <div className="min-h-screen p-4 sm:p-8 transition-colors duration-200 bg-gradient-to-br from-gray-300 via-gray-350 to-gray-300 dark:from-gray-900 dark:via-gray-600 dark:to-gray-800 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-full sm:max-w-4xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
              <motion.h1
                initial={{ x: -20 }}
                animate={{ x: 0 }}
                className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4 sm:mb-0"
              >
                NLP Stock Insights
              </motion.h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleTheme}
                      className="rounded-full"
                    >
                      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span className="sr-only">Toggle theme</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle theme</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                  <Input
                    type="text"
                    placeholder="Ask about stock performance..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pr-8 bg-white bg-opacity-90 dark:bg-gray-800 dark:bg-opacity-50 backdrop-blur-sm w-full"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={clearInput}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  <Search className="mr-2 h-4 w-4" /> Search
                </Button>
              </div>
            </form>

            {!hasSearched && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-8"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {examplePrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      onClick={() => handleExamplePrompt(prompt)}
                      variant="outline"
                      className="text-center py-6 px-1 m-.5"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {loadingState && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 text-lg text-blue-600 dark:text-blue-300"
                >
                  {loadingState}
                  <LoadingDots />
                </motion.p>
              )}

              {(error || aiError) && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-red-500 mt-4"
                >
                  {error || aiError}
                </motion.p>
              )}

              {aiAnalysisDescription && (
                <motion.div
                  key="ai-analysis"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full mt-8 mb-4"
                >
                  <Card toggleable defaultOpen={false}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Analysis Approach
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {aiAnalysisDescription}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {showGraph && (
                <motion.div
                  key="graph"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="w-full mt-8"
                >
                  <StockGraph
                    stockData={stockData}
                    stockSymbols={stockSymbols}
                    colorMap={colorMap}
                    description={description}
                    keyDates={keyDates}
                    compareMode={compareMode}
                    zoomState={zoomState}
                    setZoomState={setZoomState}
                    handleZoom={handleZoom}
                    handleDoubleClick={handleDoubleClick}
                    onClose={() => setShowGraph(false)}
                    theme={theme}
                  />
                </motion.div>
              )}

              {Object.keys(metrics).length > 0 && (
                <motion.div
                  key="metrics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full mt-8"
                >
                  <Card toggleable defaultOpen>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <TrendingUp className="mr-2 h-5 w-5 text-blue-500" />
                        Financial Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(metrics).map(
                          ([symbol, symbolMetrics]) => (
                            <motion.div
                              key={symbol}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3 }}
                              className="bg-white bg-opacity-50 dark:bg-gray-800 dark:bg-opacity-40 p-4 rounded-lg shadow backdrop-blur-sm"
                            >
                              <h3 className="font-bold mb-2 text-gray-800 dark:text-gray-100">
                                {symbol}
                              </h3>
                              <div className="space-y-2">
                                {Object.entries(symbolMetrics).map(
                                  ([key, value]) => (
                                    <motion.div
                                      key={key}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ duration: 0.3 }}
                                      className="flex justify-between items-center p-2 bg-white bg-opacity-70 dark:bg-gray-700 dark:bg-opacity-40 rounded-md"
                                    >
                                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                                        {key}:
                                      </span>
                                      <span className="text-gray-900 dark:text-gray-100">
                                        {value}
                                      </span>
                                    </motion.div>
                                  )
                                )}
                              </div>
                            </motion.div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {newsData.length > 0 && (
                <motion.div
                  key="news"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full mt-8"
                >
                  <Card toggleable defaultOpen>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <ExternalLink className="mr-2 h-5 w-5 text-blue-500" />
                        Latest News
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-4">
                        {newsData.map((item) => (
                          <li key={item.uuid}>
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200 p-2"
                            >
                              {item.thumbnail && item.thumbnail.resolutions && (
                                <img
                                  src={item.thumbnail.resolutions[0].url}
                                  alt={item.title}
                                  className="w-16 h-16 object-cover rounded-md mr-4 flex-shrink-0"
                                />
                              )}
                              <div className="flex-grow">
                                <h3 className="font-semibold text-sm mb-1">
                                  {item.title}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {item.publisher} -{" "}
                                  {new Date(
                                    item.providerPublishTime * 1000
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}