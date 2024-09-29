import { useState } from "react";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Note: This is not recommended for production
});

function AIQueryProcessor({ onQueryProcessed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const processQuery = async (query) => {
    setLoading(true);
    setError(null);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that processes stock-related queries. Given a user's question, return a JSON object with the following fields:\n" +
              "- 'actions' (array of action objects, each containing:)\n" +
              "  - 'type' (e.g., 'getPrice', 'getHistory', 'getNews', 'compare', 'getMetrics', 'getEarnings')\n" +
              "  - 'symbols' (array of stock tickers)\n" +
              "  - 'startDate' (YYYY-MM-DD format for the start of the date range, if applicable)\n" +
              "  - 'endDate' (YYYY-MM-DD format for the end of the date range, if applicable)\n" +
              "  - 'metrics' (array of requested financial metrics, ONLY if explicitly asked for)\n" +
              "- 'description' (a brief explanation of the query)\n" +
              "- 'keyDates' (an array of objects, each containing a 'date' in YYYY-MM-DD format, a 'description' of the event, and a 'symbol' indicating which stock it relates to)\n\n" +
              "Important guidelines:\n" +
              "1. Always provide a date range of at least 30 days for historical data, even if the query specifies a shorter period or a single date.\n" +
              "2. For queries about specific events, set the date range to start at least 14 days before the event and end at least 14 days after the event.\n" +
              "3. If multiple events are mentioned, adjust the date range to encompass all events plus the additional context periods.\n" +
              "4. For general queries without specific dates, provide a reasonable date range based on the context of the query.\n" +
              "5. Ensure that the 'keyDates' array includes all relevant dates mentioned in the query.\n" +
              "6. If a stock comparison is requested, use the 'compare' action type.\n" +
              "7. ONLY include the 'getMetrics' action type if financial metrics are explicitly requested by the user.\n" +
              "8. Support multiple actions in a single query, e.g., both comparison and metrics retrieval if both are requested.\n" +
              "9. Only return multiple actions if the user asks for them. Otherwise, return only one action per response.\n" +
              "10. When requesting metrics, use the following available metrics: marketCap, trailingPE, forwardPE, dividendYield, beta, fiftyTwoWeekHigh, fiftyTwoWeekLow, fiftyDayAverage, twoHundredDayAverage, averageVolume, regularMarketPrice, regularMarketDayHigh, regularMarketDayLow.\n" +
              "11. If earnings data is requested for multiple stocks, use the 'getEarnings' action type with multiple symbols in the 'symbols' array.\n" +
              "12. Return only the JSON object without any markdown formatting.",
          },
          { role: "user", content: query },
        ],
      });

      const rawResponse = completion.choices[0].message.content;
      console.log("Raw AI response:", rawResponse);

      const cleanedContent = rawResponse
        .replace(/```json\n?|\n?```/g, "")
        .trim();
      console.log("Cleaned AI response:", cleanedContent);

      const result = JSON.parse(cleanedContent);
      console.log("Parsed AI result:", result);

      // Ensure there are default metrics if none are specified
      result.actions.forEach((action) => {
        if (
          action.type === "getMetrics" &&
          (!action.metrics || action.metrics.length === 0)
        ) {
          action.metrics = [
            "P/E",
            "EPS",
            "Market Cap",
            "Dividend Yield",
            "52 Week High",
            "52 Week Low",
          ];
        }
      });

      console.log("Parsed AI result with default metrics:", result);

      onQueryProcessed(result);
    } catch (err) {
      console.error("Error processing query:", err);
      setError(
        "Failed to process query. Please check the console for more details."
      );
    } finally {
      setLoading(false);
    }
  };

  return { processQuery, loading, error };
}

export default AIQueryProcessor;
