import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from './config';

/**
 * AIQueryProcessor component for handling AI query processing
 * @param {Object} props - Component props
 * @param {Function} props.onQueryProcessed - Callback function to handle processed query results
 * @returns {Object} - Object containing processQuery function, loading state, and error state
 */
const AIQueryProcessor = ({ onQueryProcessed }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Process the user's query
   * @param {string} query - The user's input query
   * @returns {Promise<Object>} - The processed query result
   * @throws {Error} - If there's an error processing the query
   */
  const processQuery = async (query) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/process_query`, { query });
      const result = response.data;
      console.log("Parsed AI result:", result);

      if (!result || !result.actions) {
        throw new Error("Invalid response from server");
      }

      onQueryProcessed(result);
      return result;
    } catch (err) {
      console.error("Error processing query:", err);
      setError("Failed to process query. Please check the console for more details.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { processQuery, loading, error };
};

export default AIQueryProcessor;
