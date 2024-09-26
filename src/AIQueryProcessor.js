import { useState } from "react";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: This is not recommended for production
});

function AIQueryProcessor({ onQueryProcessed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const processQuery = async (query) => {
    setLoading(true);
    setError(null);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // or "gpt-4" if you have access
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that processes stock-related queries. Given a user's question, return a JSON object with the following fields:\n" +
              "- 'symbol' (stock ticker)\n" +
              "- 'action' (e.g., 'getPrice', 'getHistory', 'getNews')\n" +
              "- 'startDate' (YYYY-MM-DD format for the start of the date range)\n" +
              "- 'endDate' (YYYY-MM-DD format for the end of the date range)\n" +
              "- 'description' (a brief explanation of the query)\n" +
              "- 'keyDates' (an array of objects, each containing a 'date' in YYYY-MM-DD format and a 'description' of the event)\n\n" +
              "Important guidelines:\n" +
              "1. Always provide a date range of at least 30 days, even if the query specifies a shorter period or a single date.\n" +
              "2. For queries about specific events, set the date range to start at least 14 days before the event and end at least 14 days after the event.\n" +
              "3. If multiple events are mentioned, adjust the date range to encompass all events plus the additional context periods.\n" +
              "4. For general queries without specific dates, provide a reasonable date range based on the context of the query.\n" +
              "5. Ensure that the 'keyDates' array includes all relevant dates mentioned in the query.\n" +
              "6. If a stock is requested without additional information:\n" +
              "   - Set the date range to cover the last 3 years (or 5 years if the stock has been public for longer).\n" +
              "   - Include 3-5 key dates in the 'keyDates' array, such as significant price movements, earnings reports, or major company events.\n" +
              "   - Set the 'action' to 'getHistory'.\n" +
              "   - Provide a general description of the stock's performance over the given period.\n\n" +
              "Return only the JSON object without any markdown formatting.",
          },
          { role: "user", content: query },
        ],
      });

      const rawResponse = completion.choices[0].message.content;
      const cleanedContent = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleanedContent);

      onQueryProcessed(result);
    } catch (err) {
      setError("Failed to process query. Please try again.");
      console.error("Error processing query:", err);
    } finally {
      setLoading(false);
    }
  };

  return { processQuery, loading, error };
}

export default AIQueryProcessor;
