import axios from "axios";
import { API_BASE_URL } from "../config";
import {
  formatLargeNumber,
  formatPercentage,
  formatNumber,
} from "../utils/formatters";

export const fetchStockData = async (symbols, start, end) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/stock_data`, {
      params: {
        symbols: symbols.join(","),
        start_date: start,
        end_date: end,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching stock data:", error);
    throw error;
  }
};

export const fetchMetrics = async (symbols, requestedMetrics) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/stock_metrics`, {
      params: {
        symbols: symbols.join(","),
        metrics: requestedMetrics.join(","),
      },
    });

    const fetchedMetrics = response.data;

    // Format the metrics
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

    return fetchedMetrics;
  } catch (error) {
    console.error("Error fetching metrics:", error);
    throw error;
  }
};

export const fetchNewsData = async (symbol) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/stock_news`, {
      params: { symbol },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching news data:", error);
    throw error;
  }
};
