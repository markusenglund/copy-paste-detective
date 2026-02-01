import React, { useCallback, useEffect, useState } from "react";
import { StatisticsResponse } from "../types/statistics";
import { fetchStatistics } from "../api/client";

export function Statistics(): React.ReactElement {
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStatistics();
      setStatistics(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load statistics",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-8xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Dataset Statistics
          </h1>
          <button
            onClick={loadStatistics}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {loading && !statistics ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          statistics && (
            <div className="bg-white shadow rounded-lg p-8">
              <div className="text-center">
                <div className="text-6xl font-bold text-blue-600 mb-4">
                  {statistics.totalDatasets.toLocaleString()}
                </div>
                <div className="text-xl text-gray-700">
                  Total Datasets Indexed from Dryad
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
