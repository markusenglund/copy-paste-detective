import React, { useCallback, useEffect, useState } from "react";
import { ArticleForUpload } from "./types/article";
import { fetchArticles } from "./api/client";
import { ArticlesTable } from "./components/ArticlesTable";
import {
  SortField,
  SortOrder,
  SortParams,
  DEFAULT_SORT,
  SORT_ORDERS,
  isValidSortField,
  isValidSortOrder,
} from "../../shared/sortTypes";

function getSortFromUrl(): SortParams {
  const params = new URLSearchParams(window.location.search);
  const sortBy = params.get("sortBy");
  const sortOrder = params.get("sortOrder");

  return {
    sortBy:
      sortBy && isValidSortField(sortBy) ? sortBy : DEFAULT_SORT.sortBy,
    sortOrder:
      sortOrder && isValidSortOrder(sortOrder)
        ? sortOrder
        : DEFAULT_SORT.sortOrder,
  };
}

function App(): React.ReactElement {
  const [articles, setArticles] = useState<ArticleForUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortParams, setSortParams] = useState<SortParams>(getSortFromUrl);

  const loadArticles = useCallback(async (params: SortParams) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchArticles(params);
      setArticles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load articles");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSort = useCallback(
    (field: SortField) => {
      const newSortParams: SortParams = {
        sortBy: field,
        sortOrder:
          sortParams.sortBy === field && sortParams.sortOrder === SORT_ORDERS.DESC
            ? SORT_ORDERS.ASC
            : SORT_ORDERS.DESC,
      };

      setSortParams(newSortParams);

      const params = new URLSearchParams({
        sortBy: newSortParams.sortBy,
        sortOrder: newSortParams.sortOrder,
      });
      window.history.pushState(
        {},
        "",
        `${window.location.pathname}?${params.toString()}`,
      );

      loadArticles(newSortParams);
    },
    [sortParams, loadArticles],
  );

  useEffect(() => {
    loadArticles(sortParams);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const newSortParams = getSortFromUrl();
      setSortParams(newSortParams);
      loadArticles(newSortParams);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loadArticles]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Science detective dashboard
          </h1>
          <button
            onClick={() => loadArticles(sortParams)}
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

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading && articles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <ArticlesTable
              articles={articles}
              onUploadSuccess={() => loadArticles(sortParams)}
              currentSortBy={sortParams.sortBy}
              currentSortOrder={sortParams.sortOrder}
              onSort={handleSort}
            />
          )}
        </div>

        <div className="mt-4 text-sm text-gray-500">
          {articles.length} article{articles.length !== 1 ? "s" : ""} pending
          PDF upload
        </div>
      </div>
    </div>
  );
}

export default App;
