"use client";

import React, { useState, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  ReferenceArea,
  ReferenceDot,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Search, Moon, Sun, TrendingUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AIQueryProcessor from "./AIQueryProcessor";
import axios from "axios";
import { useTheme } from "next-themes";
import {
  parseISO,
  isWithinInterval,
  addDays,
  subDays,
  isAfter,
  isBefore,
  format,
} from "date-fns";

import { Button } from "./button.tsx";
import { Input } from "./input.tsx";
import { Card, CardHeader, CardTitle, CardContent } from "./card.tsx";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./tooltip.tsx";

import "./EnhancedStockSearch.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
console.log("API_URL:", API_URL);

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

const LoadingDots = () => {
  return (
    <span className="loading-dots">
      <span className="dot">.</span>
      <span className="dot">.</span>
      <span className="dot">.</span>
    </span>
  );
};

const CustomTooltip = ({ active, payload, label, keyDates, colors }) => {
  if (active && payload && payload.length) {
    const currentDate = parseISO(label);
    const relevantKeyDates = keyDates.filter((keyDate) => {
      const keyDateParsed = parseISO(keyDate.date);
      return isWithinInterval(currentDate, {
        start: subDays(keyDateParsed, 3),
        end: addDays(keyDateParsed, 3),
      });
    });

    return (
      <div className="bg-white bg-opacity-85 dark:bg-gray-800 dark:bg-opacity-75 p-4 rounded-lg shadow-lg">
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{`Date: ${label}`}</p>
        {relevantKeyDates.map((keyDate, index) => (
          <p
            key={index}
            className="text-sm mt-2 text-red-600 dark:text-red-400 font-bold"
          >
            {`${keyDate.symbol} (${keyDate.date}): ${keyDate.description}`}
          </p>
        ))}
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-sm"
            style={{ color: colors[entry.name] }}
          >
            {`${entry.name}: $${entry.value.toFixed(2)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
        <p className="font-bold text-lg mb-2">{`Year: ${label}`}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: $${entry.value.toLocaleString()}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

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
  const [earningsData, setEarningsData] = useState(null);

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    console.log("Current metrics state:", metrics);
  }, [metrics]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowGraph(false);
    setLoading(true);
    setError(null);
    setLoadingState("Analyzing your search");
    setMetrics({});

    try {
      await processQuery(query);
    } catch (err) {
      setError("Failed to process query. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStockData = async (symbols, start, end) => {
    console.log("Fetching stock data with params:", { symbols, start, end });
    console.log("API_URL:", API_URL);
    try {
      const url = `${API_URL}/api/stock_data`;
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

  const fetchMetrics = async (symbol, requestedMetrics) => {
    try {
      const response = await axios.get(`${API_URL}/api/stock_metrics`, {
        params: {
          symbol: symbol,
          metrics: requestedMetrics.join(","),
        },
      });

      const fetchedMetrics = response.data;

      // Format the metrics as needed
      Object.keys(fetchedMetrics).forEach((metric) => {
        const value = fetchedMetrics[metric];
        if (typeof value === "number") {
          if (metric === "marketCap") {
            fetchedMetrics[metric] = formatLargeNumber(value);
          } else if (
            [
              "dividendYield",
              "profitMargin",
              "operatingMarginTTM",
              "returnOnAssetsTTM",
              "returnOnEquityTTM",
            ].includes(metric)
          ) {
            fetchedMetrics[metric] = formatPercentage(value);
          } else {
            fetchedMetrics[metric] = formatNumber(value);
          }
        } else {
          fetchedMetrics[metric] = value;
        }
      });

      setMetrics((prevMetrics) => ({
        ...prevMetrics,
        [symbol]: fetchedMetrics,
      }));
      setLoadingState("");
    } catch (err) {
      console.error("Error fetching metrics:", err);
      setError(
        `Failed to fetch metrics for ${symbol}. Please check the console for more details.`
      );
      setLoadingState("");
    }
  };

  const handleDoubleClick = (event) => {
    event.preventDefault(); // Prevent default double-click behavior
    handleZoomOut();
  };

  // Helper functions for formatting
  const formatLargeNumber = (num) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    return num.toFixed(2);
  };

  const formatPercentage = (num) => (num * 100).toFixed(2) + "%";

  const formatNumber = (num) => num.toFixed(2);

  const fetchEarningsData = async (symbols) => {
    try {
      const response = await axios.get(`${API_URL}/api/stock_earnings`, {
        params: { symbols: symbols.join(',') },
      });
      setEarningsData(response.data);
      setLoadingState("");
    } catch (err) {
      console.error("Error fetching earnings data:", err);
      setError("Failed to fetch earnings data. Please try again.");
      setLoadingState("");
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
      const earningsAction = result.actions.find(
        (action) => action.type === "getEarnings"
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
        metricsAction.symbols.forEach((symbol) => {
          fetchMetrics(symbol, metricsAction.metrics);
        });
      }

      if (earningsAction) {
        fetchEarningsData(earningsAction.symbols);
      }
    },
  });

  const prepareEarningsData = (earningsData) => {
    const years = new Set();
    const stockSymbols = Object.keys(earningsData);

    // Collect all years
    stockSymbols.forEach(symbol => {
      earningsData[symbol].historical_earnings.forEach(item => {
        years.add(item.Year);
      });
    });

    // Create combined data
    return Array.from(years).sort().map(year => {
      const dataPoint = { Year: year };
      stockSymbols.forEach(symbol => {
        const earningsForYear = earningsData[symbol].historical_earnings.find(item => item.Year === year);
        dataPoint[`${symbol} Earnings`] = earningsForYear ? earningsForYear.Earnings : 0;
        dataPoint[`${symbol} Revenue`] = earningsForYear ? earningsForYear.Revenue : 0;
      });
      return dataPoint;
    });
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <div className="min-h-screen p-4 sm:p-8 transition-colors duration-200 bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 overflow-x-hidden">
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

              {showGraph && (
                <motion.div
                  key="graph"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="w-full mt-8"
                >
                  <Card className="min-w-[300px] w-full relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setShowGraph(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="mr-2 h-6 w-6 text-blue-500" />
                        {compareMode
                          ? `${stockSymbols.join(" vs ")} Comparison`
                          : `${stockSymbols[0]} Stock Performance`}
                      </CardTitle>
                      <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
                        {description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="w-full h-[400px] select-none"
                        onDoubleClick={handleDoubleClick}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={stockData}
                            margin={{ top: 20, right: 20, left: 0, bottom: 60 }}
                            onMouseDown={(e) =>
                              setZoomState((prev) => ({
                                ...prev,
                                refAreaLeft: e.activeLabel,
                              }))
                            }
                            onMouseMove={(e) =>
                              zoomState.refAreaLeft &&
                              setZoomState((prev) => ({
                                ...prev,
                                refAreaRight: e.activeLabel,
                              }))
                            }
                            onMouseUp={handleZoom}
                          >
                            <defs>
                              {stockSymbols.map((symbol, index) => (
                                <linearGradient
                                  key={symbol}
                                  id={`color${symbol}`}
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="5%"
                                    stopColor={colorMap[symbol]}
                                    stopOpacity={0.8}
                                  />
                                  <stop
                                    offset="95%"
                                    stopColor={colorMap[symbol]}
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              ))}
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#ccc"
                            />
                            <XAxis
                              dataKey="date"
                              stroke={theme === "dark" ? "#fff" : "#888"}
                              style={{ fontSize: "0.6rem" }}
                              tick={{ angle: -45, textAnchor: "end", dy: 10 }}
                              height={60}
                              interval="preserveStartEnd"
                              allowDataOverflow
                              domain={["dataMin", "dataMax"]}
                            />
                            <YAxis
                              stroke={theme === "dark" ? "#fff" : "#888"}
                              style={{ fontSize: "0.6rem" }}
                              width={40}
                              allowDataOverflow
                            />
                            <RechartsTooltip
                              content={
                                <CustomTooltip
                                  keyDates={keyDates}
                                  colors={colorMap}
                                />
                              }
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={36}
                              iconType="circle"
                              iconSize={8}
                              wrapperStyle={{
                                paddingTop: "20px",
                                fontSize: "0.8rem",
                              }}
                              formatter={(value, entry) => (
                                <span style={{ color: colorMap[value] }}>
                                  {value}
                                </span>
                              )}
                            />
                            {stockSymbols.map((symbol) => (
                              <Area
                                key={symbol}
                                type="monotone"
                                dataKey={symbol}
                                stroke={colorMap[symbol]}
                                fillOpacity={1}
                                fill={`url(#color${symbol})`}
                              />
                            ))}
                            {keyDates.map((keyDate, index) => {
                              const dataPoint = stockData.find(
                                (item) => item.date === keyDate.date
                              );
                              return dataPoint ? (
                                <ReferenceDot
                                  key={index}
                                  x={keyDate.date}
                                  y={dataPoint[keyDate.symbol]}
                                  r={4}
                                  fill="red"
                                  fillOpacity={0.5}
                                  stroke="none"
                                />
                              ) : null;
                            })}
                            {zoomState.refAreaLeft && zoomState.refAreaRight ? (
                              <ReferenceArea
                                x1={zoomState.refAreaLeft}
                                x2={zoomState.refAreaRight}
                                strokeOpacity={0.3}
                                fill="#8884d8"
                                fillOpacity={0.3}
                              />
                            ) : null}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
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
                  <Card className="min-w-[300px] w-full relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setMetrics({})}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="mr-2 h-6 w-6 text-blue-500" />
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

              {earningsData && (
                <motion.div
                  key="earnings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full mt-8"
                >
                  <Card className="min-w-[300px] w-full relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setEarningsData(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="mr-2 h-6 w-6 text-blue-500" />
                        Earnings Data Comparison
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                              <div>
                                <h4 className="text-lg font-semibold mb-2">Historical Earnings</h4>
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={prepareEarningsData(earningsData)}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="Year" />
                                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                    <Tooltip content={<CustomBarTooltip />} />
                                    <Legend />
                              {Object.keys(earningsData).flatMap((symbol, index) => [
                                <Bar 
                                  key={`${symbol}-earnings`} 
                                  yAxisId="left" 
                                  dataKey={`${symbol} Earnings`} 
                                  fill={lineColors[index * 2]} 
                                  name={`${symbol} Earnings`} 
                                />,
                                <Bar 
                                  key={`${symbol}-revenue`} 
                                  yAxisId="right" 
                                  dataKey={`${symbol} Revenue`} 
                                  fill={lineColors[index * 2 + 1]} 
                                  name={`${symbol} Revenue`} 
                                />
                              ])}
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                        {Object.entries(earningsData).map(([symbol, data]) => (
                          <div key={symbol} className="mt-4">
                            <h4 className="text-lg font-semibold mb-2">{symbol} Upcoming Earnings</h4>
                            {data.upcoming_earnings && data.upcoming_earnings.length > 0 ? (
                                <ul className="space-y-2">
                                  {data.upcoming_earnings.map((item, index) => (
                                    <li key={index} className="bg-white bg-opacity-50 dark:bg-gray-800 dark:bg-opacity-40 p-2 rounded-md">
                                      <span className="font-semibold">{format(new Date(item.Date), 'MMM d, yyyy')}:</span> 
                                      EPS Estimate: {item.EPS_Estimate.toFixed(2)}
                                    </li>
                                  ))}
                                </ul>
                            ) : (
                              <p>No upcoming earnings data available for {symbol}.</p>
                            )}
                          </div>
                        ))}
                      </div>
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