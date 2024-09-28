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
  ReferenceLine,
  Tooltip as RechartsTooltip,
  ReferenceArea,
  ReferenceDot,
  Legend,
} from "recharts";
import { Search, Moon, Sun, TrendingUp, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AIQueryProcessor from "./AIQueryProcessor";
import axios from "axios";
import { useTheme } from "next-themes";
import { X } from "lucide-react"; // Add this import
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from "date-fns"; // Add this import

// Import UI components
import { Button } from "./button.tsx";
import { Input } from "./input.tsx";
import { Card, CardHeader, CardTitle, CardContent } from "./card.tsx";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./tooltip.tsx";

import "./EnhancedStockSearch.css"; // Add this import at the top of the file

// Add this array of colors at the top of the file, outside the component
const lineColors = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Yellow
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#6366f1", // Indigo
  "#84cc16", // Lime
];

// Add this new component for the loading animation
const LoadingDots = () => {
  return (
    <span className="loading-dots">
      <span className="dot">.</span>
      <span className="dot">.</span>
      <span className="dot">.</span>
    </span>
  );
};

// Update the CustomTooltip component
const CustomTooltip = ({ active, payload, label, keyDates, colors }) => {
  if (active && payload && payload.length) {
    const keyDateInfo = keyDates.find((keyDate) => keyDate.date === label);

    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{`Date: ${label}`}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-sm"
            style={{ color: colors[entry.name] }}
          >
            {`${entry.name}: $${entry.value.toFixed(2)}`}
          </p>
        ))}
        {keyDateInfo && (
          <p className="text-sm mt-2 text-red-600 dark:text-red-400">
            {`${keyDateInfo.symbol}: ${keyDateInfo.description}`}
          </p>
        )}
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
  const [stockSymbol, setStockSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [keyDates, setKeyDates] = useState([]);
  const [loadingState, setLoadingState] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [fullDateRange, setFullDateRange] = useState({ min: "", max: "" });
  const [stockSymbols, setStockSymbols] = useState([]);
  const [compareMode, setCompareMode] = useState(false);

  // Add this new state to store color mappings
  const [colorMap, setColorMap] = useState({});

  const { processQuery, error: aiError } = AIQueryProcessor({
    onQueryProcessed: ({
      symbols,
      action,
      startDate,
      endDate,
      description,
      keyDates,
    }) => {
      setStockSymbols(symbols);
      setDescription(description);
      setKeyDates(keyDates);
      setLoadingState(`Fetching ${description}`);
      setCompareMode(action === "compare");
      fetchStockData(symbols, startDate, endDate);
    },
  });

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // This effect is no longer needed, so we can remove it
    // setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowGraph(false);
    setLoading(true);
    setError(null);
    setLoadingState("Analyzing your search");

    try {
      await processQuery(query);
    } catch (err) {
      setError("Failed to process query. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStockData = async (symbols, start, end) => {
    try {
      const API_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY;
      const stockDataPromises = symbols.map(async (symbol) => {
        const response = await axios.get(
          `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${API_KEY}`
        );

        const timeSeries = response.data["Time Series (Daily)"];
        return Object.entries(timeSeries)
          .filter(([date]) => date >= start && date <= end)
          .map(([date, values]) => ({
            date,
            [symbol]: parseFloat(values["4. close"]),
          }))
          .reverse();
      });

      const allStockData = await Promise.all(stockDataPromises);

      // Merge data for all symbols
      const mergedData = allStockData.reduce((acc, curr) => {
        curr.forEach((item) => {
          const existingItem = acc.find(
            (accItem) => accItem.date === item.date
          );
          if (existingItem) {
            Object.assign(existingItem, item);
          } else {
            acc.push(item);
          }
        });
        return acc;
      }, []);

      setStockData(mergedData);
      setShowGraph(true);
      setLoadingState("");

      // Set the full date range
      if (mergedData.length > 0) {
        setFullDateRange({
          min: mergedData[0].date,
          max: mergedData[mergedData.length - 1].date,
        });
        setDateRange({
          startDate: mergedData[0].date,
          endDate: mergedData[mergedData.length - 1].date,
        });
      }

      // Set the color map
      const newColorMap = symbols.reduce((acc, symbol, index) => {
        acc[symbol] = lineColors[index % lineColors.length];
        return acc;
      }, {});
      setColorMap(newColorMap);
    } catch (err) {
      setError("Failed to fetch stock data. Please try again.");
      console.error("Error fetching stock data:", err);
      setLoadingState("");
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const clearInput = () => {
    setQuery("");
  };

  const handleDateRangeChange = (event) => {
    const { name, value } = event.target;
    setDateRange((prevRange) => {
      const newRange = { ...prevRange, [name]: value };

      // Ensure the selected date is within the full range
      if (name === "startDate" && value < fullDateRange.min) {
        newRange[name] = fullDateRange.min;
      } else if (name === "endDate" && value > fullDateRange.max) {
        newRange[name] = fullDateRange.max;
      }

      return newRange;
    });
  };

  const applyDateRange = () => {
    if (dateRange.startDate && dateRange.endDate) {
      const filteredData = stockData.filter(
        (item) =>
          item.date >= dateRange.startDate && item.date <= dateRange.endDate
      );
      setStockData(filteredData);
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen p-8 transition-colors duration-200 bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex justify-between items-center mb-8">
            <motion.h1
              initial={{ x: -20 }}
              animate={{ x: 0 }}
              className="text-4xl font-bold text-gray-800 dark:text-gray-100"
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
            <div className="flex gap-4">
              <div className="relative flex-grow">
                <Input
                  type="text"
                  placeholder="Ask about stock performance..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pr-8" // Add padding to the right for the clear button
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
              <Button type="submit" disabled={loading}>
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
                className="text-red-500 mt-4"
              >
                {error || aiError}
              </motion.p>
            )}

            {showGraph && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
              >
                <Card>
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
                    <div className="flex items-center space-x-4 mb-4">
                      <Input
                        type="date"
                        name="startDate"
                        value={dateRange.startDate}
                        onChange={handleDateRangeChange}
                        min={fullDateRange.min}
                        max={fullDateRange.max}
                        className="w-40"
                      />
                      <Input
                        type="date"
                        name="endDate"
                        value={dateRange.endDate}
                        onChange={handleDateRangeChange}
                        min={fullDateRange.min}
                        max={fullDateRange.max}
                        className="w-40"
                      />
                      <Button onClick={applyDateRange}>
                        <Calendar className="mr-2 h-4 w-4" /> Apply Range
                      </Button>
                    </div>
                    <div className="w-full h-[400px] select-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={stockData}
                          margin={{ top: 20, right: 50, left: 0, bottom: 50 }} // Increased bottom margin
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
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                          <XAxis
                            dataKey="date"
                            stroke={theme === "dark" ? "#fff" : "#888"}
                            style={{ fontSize: "0.7rem" }}
                            tick={{ angle: -45, textAnchor: "end", dy: 10 }}
                            height={60}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            stroke={theme === "dark" ? "#fff" : "#888"}
                            style={{ fontSize: "0.7rem" }}
                            width={60}
                          />
                          <RechartsTooltip
                            content={<CustomTooltip keyDates={keyDates} colors={colorMap} />}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            iconSize={8} // Reduced icon size
                            wrapperStyle={{
                              paddingTop: '20px', // Add space above the legend
                              fontSize: '0.8rem', // Make legend text smaller
                            }}
                            formatter={(value, entry) => (
                              <span style={{ color: colorMap[value] }}>{value}</span>
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
                                fillOpacity={0.5} // Make the red dots a bit more transparent
                                stroke="none"
                              />
                            ) : null;
                          })}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </ThemeProvider>
  );
}