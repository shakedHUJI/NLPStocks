"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { Search, Moon, Sun, TrendingUp, X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

import { Button } from "./UI/button.tsx";
import { Input } from "./UI/input.tsx";
import { Card, CardHeader, CardTitle, CardContent } from "./UI/card.tsx";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./UI/tooltip.tsx";

import "./StockSearch.css";
import LoadingDots from "./components/LoadingDots.js";
import StockGraph from "./UI/StockGraph.tsx";
import useStockSearch from "./hooks/useStockSearch.js";
import { EXAMPLE_PROMPTS } from "./constants/index.js";

export default function EnhancedStockSearch() {
  const {
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
  } = useStockSearch();

  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const clearInput = () => {
    setQuery("");
  };

  const handleExamplePrompt = (prompt) => {
    handleSubmit(null, prompt);
  };

  const handleDoubleClick = (event) => {
    event.preventDefault();
    handleZoomOut();
  };

  const handleHeaderClick = () => {
    window.location.reload();
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <div className="min-h-screen p-4 sm:p-8 transition-colors duration-200 bg-gradient-to-br from-gray-300 via-gray-350 to-gray-300 dark:from-gray-900 dark:via-gray-600 dark:to-gray-800 overflow-x-hidden flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-5xl mx-auto p-8 rounded-lg"
          >
            {/* Header */}
            <div className="flex justify-center items-center mb-10 mt-4 relative">
              <motion.h1
                initial={{ x: -20 }}
                animate={{ x: 0 }}
                className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 cursor-pointer"
                onClick={handleHeaderClick}
              >
                Stock Chat
              </motion.h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleTheme}
                      className="rounded-full absolute top-0 right-0"
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

            {/* Search form */}
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                  <Input
                    type="text"
                    placeholder="Ask about stock performance..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pr-16 bg-white bg-opacity-90 dark:bg-gray-800 dark:bg-opacity-50 backdrop-blur-sm w-full"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={clearInput}
                      className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="absolute right-0 top-0 h-full rounded-l-none"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>

            {/* Example prompts */}
            {!hasSearched && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-8"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {EXAMPLE_PROMPTS.map((prompt, index) => (
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
              {/* Loading state */}
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

              {/* Error messages */}
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

              {/* AI Analysis */}
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

              {/* Stock Graph */}
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
                    isDifferenceMode={isDifferenceMode}
                    toggleDifferenceMode={toggleDifferenceMode}
                  />
                </motion.div>
              )}

              {/* Financial Metrics */}
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

              {/* News Data */}
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
