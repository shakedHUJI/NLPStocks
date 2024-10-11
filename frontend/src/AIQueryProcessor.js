import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from './config';

function AIQueryProcessor({ onQueryProcessed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const processQuery = async (query) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/process_query`, {
        query,
      });
      const result = response.data;
      console.log("Parsed AI result:", result);

      if (!result || !result.actions) {
        throw new Error("Invalid response from server");
      }

      onQueryProcessed(result);
      return result; // Make sure to return the result
    } catch (err) {
      console.error("Error processing query:", err);
      setError(
        "Failed to process query. Please check the console for more details."
      );
      throw err; // Re-throw the error so it can be caught in handleSubmit
    } finally {
      setLoading(false);
    }
  };

  return { processQuery, loading, error };
}

export default AIQueryProcessor;
