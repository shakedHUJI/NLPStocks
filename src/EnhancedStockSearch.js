import React, { useState, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Search, Moon, Sun } from "lucide-react";
import AIQueryProcessor from "./AIQueryProcessor";
import axios from "axios";

// Theme-dependent component styles
const Button = ({ children, theme, ...props }) => (
  <button
    {...props}
    className={`px-4 py-2 rounded ${
      theme === "dark"
        ? "bg-blue-600 text-white hover:bg-blue-700"
        : "bg-blue-500 text-white hover:bg-blue-600"
    }`}
  >
    {children}
  </button>
);

const Input = ({ theme, ...props }) => (
  <input
    {...props}
    className={`px-4 py-2 border rounded w-full ${
      theme === "dark"
        ? "bg-gray-800 text-gray-100 border-gray-700 placeholder-gray-400"
        : "bg-white text-gray-900 border-gray-300 placeholder-gray-500"
    }`}
  />
);

const Card = ({ children, theme }) => (
  <div
    className={`border rounded-lg shadow-lg ${
      theme === "dark"
        ? "bg-gray-800 border-gray-700"
        : "bg-white border-gray-200"
    }`}
  >
    {children}
  </div>
);

const CardHeader = ({ children, theme }) => (
  <div
    className={`px-6 py-4 border-b ${
      theme === "dark" ? "border-gray-700" : "border-gray-200"
    }`}
  >
    {children}
  </div>
);

const CardTitle = ({ children, theme }) => (
  <h2 className={`text-xl font-semibold ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
    {children}
  </h2>
);

const CardContent = ({ children }) => <div className="p-6">{children}</div>;

function EnhancedStockSearch() {
  const [query, setQuery] = useState("");
  const [showGraph, setShowGraph] = useState(false);
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stockSymbol, setStockSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [keyDates, setKeyDates] = useState([]);
  const [loadingState, setLoadingState] = useState('');

  const {
    processQuery,
    loading: aiLoading,
    error: aiError,
  } = AIQueryProcessor({
    onQueryProcessed: ({
      symbol,
      action,
      startDate,
      endDate,
      description,
      keyDates,
    }) => {
      setStockSymbol(symbol);
      setDescription(description);
      setKeyDates(keyDates);
      setLoadingState(`Fetching ${description}`);
      fetchStockData(symbol, startDate, endDate);
    },
  });

  useEffect(() => setMounted(true), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowGraph(false);
    setLoading(true);
    setError(null);
    setLoadingState('Analyzing your search');

    try {
      await processQuery(query);
    } catch (err) {
      setError("Failed to process query. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStockData = async (symbol, start, end) => {
    try {
      const API_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY;
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${API_KEY}`
      );

      const timeSeries = response.data["Time Series (Daily)"];
      const stockData = Object.entries(timeSeries)
        .filter(([date]) => date >= start && date <= end)
        .map(([date, values]) => ({
          date,
          price: parseFloat(values["4. close"]),
        }))
        .reverse();

      console.log("Processed stock data:", stockData);

      setStockData(stockData);
      setShowGraph(true);
      setLoadingState('');
    } catch (err) {
      setError("Failed to fetch stock data. Please try again.");
      console.error("Error fetching stock data:", err);
      setLoadingState('');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (!mounted) return null;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div
        className={`min-h-screen p-8 transition-colors duration-200 ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-900 via-gray-900 to-blue-900 text-gray-100"
            : "bg-gradient-to-br from-blue-100 via-indigo-200 to-gray-300 text-gray-900"
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">Stock Insight AI</h1>
            <Button
              theme={theme}
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <Moon className="h-[1.2rem] w-[1.2rem]" />
              )}
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex gap-4">
              <Input
                theme={theme}
                type="text"
                placeholder="Ask about stock performance..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button theme={theme} type="submit" disabled={loading}>
                <Search className="mr-2 h-4 w-4" /> Search
              </Button>
            </div>
          </form>

          {loadingState && (
            <p className={`mt-4 text-lg ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`}>
              {loadingState}
            </p>
          )}

          {(error || aiError) && (
            <p className="text-red-500 mt-4">{error || aiError}</p>
          )}

          {showGraph && (
            <Card theme={theme}>
              <CardHeader theme={theme}>
                <CardTitle theme={theme}>{stockSymbol} Stock Performance</CardTitle>
                <p className={`text-sm mt-2 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  {description}
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart
                    data={stockData}
                    margin={{ top: 40, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={theme === "dark" ? "#444" : "#ccc"}
                    />
                    <XAxis
                      allowDataOverflow
                      dataKey="date"
                      type="category"
                      stroke={theme === "dark" ? "#888" : "#333"}
                      style={{ fontSize: "0.8rem" }}
                    />
                    <YAxis
                      allowDataOverflow
                      domain={["auto", "auto"]}
                      type="number"
                      yAxisId="1"
                      stroke={theme === "dark" ? "#888" : "#333"}
                      style={{ fontSize: "0.8rem" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === "dark" ? "#333" : "#fff",
                        border: "none",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                      }}
                      itemStyle={{ color: theme === "dark" ? "#fff" : "#333" }}
                      formatter={(value, name, props) => {
                        if (props.payload.isKeyDate) {
                          return [props.payload.keyDateDescription, "Event"];
                        }
                        return [value, name];
                      }}
                    />
                    <Area
                      yAxisId="1"
                      type="monotone"
                      dataKey="price"
                      stroke={theme === "dark" ? "#4c9aff" : "#3b82f6"}
                      fill={theme === "dark" ? "#4c9aff80" : "#3b82f680"}
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                    {keyDates.map((keyDate, index) => (
                      <ReferenceLine
                        key={index}
                        x={keyDate.date}
                        stroke={theme === "dark" ? "#FF6347" : "#FF4500"}
                        strokeDasharray="3 3"
                        yAxisId="1"
                        label={{
                          value: keyDate.description,
                          position: "top",
                          fill: theme === "dark" ? "#fff" : "#333",
                          fontSize: 10,
                          angle: -45,
                          offset: 10,
                          textAnchor: "end",
                        }}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default EnhancedStockSearch;
