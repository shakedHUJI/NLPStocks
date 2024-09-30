import { useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function AIQueryProcessor({ onQueryProcessed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const processQuery = async (query) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/process_query`, { query });
      const result = response.data;
      console.log("Parsed AI result:", result);

      onQueryProcessed(result);
    } catch (err) {
      console.error("Error processing query:", err);
      setError("Failed to process query. Please check the console for more details.");
    } finally {
      setLoading(false);
    }
  };

  return { processQuery, loading, error };
}

export default AIQueryProcessor;
