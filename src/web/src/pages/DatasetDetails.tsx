import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchDatasetDetails } from "../api/client";
import { DatasetDetails as DatasetDetailsType } from "../types/dataset";
import { SheetReviewCard } from "../components/SheetReviewCard";

export function DatasetDetails(): React.ReactElement {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();

  // Parse datasetId from URL parameter
  const parsedDatasetId = datasetId ? parseInt(datasetId, 10) : null;

  const [data, setData] = useState<DatasetDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle invalid datasetId
  if (!parsedDatasetId || isNaN(parsedDatasetId)) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">Invalid dataset ID</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        const details = await fetchDatasetDetails(parsedDatasetId);
        setData(details);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dataset details",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [parsedDatasetId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error || "Dataset not found"}</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const formatDate = (date: Date | null): string => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <button
        onClick={() => navigate("/")}
        className="mb-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
      >
        Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold mb-6">{data.article.title}</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Article Metadata</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.article.doi && (
            <div>
              <span className="font-semibold">Article DOI:</span>{" "}
              <a
                href={`https://doi.org/${data.article.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {data.article.doi}
              </a>
            </div>
          )}
          <div>
            <span className="font-semibold">Dataset DOI:</span>{" "}
            <a
              href={`https://doi.org/${data.dataset.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {data.dataset.doi}
            </a>
          </div>
          {data.article.journalName && (
            <div>
              <span className="font-semibold">Journal:</span>{" "}
              {data.article.journalName}
              {data.article.journalSjrScore && (
                <span className="text-gray-600">
                  {" "}
                  (SJR: {data.article.journalSjrScore.toFixed(2)})
                </span>
              )}
            </div>
          )}
          <div>
            <span className="font-semibold">Publication Date:</span>{" "}
            {formatDate(data.article.publicationDate)}
          </div>
          {data.article.citations !== null && (
            <div>
              <span className="font-semibold">Citations:</span>{" "}
              {data.article.citations}
            </div>
          )}
          {data.article.citationScore !== null && (
            <div>
              <span className="font-semibold">Citation Score:</span>{" "}
              {data.article.citationScore.toFixed(2)}
            </div>
          )}
          <div>
            <span className="font-semibold">Dryad external ID:</span>{" "}
            {data.dataset.extId}
          </div>
        </div>

        {data.article.authors.length > 0 && (
          <div className="mt-4">
            <span className="font-semibold">Authors:</span>
            <ul className="ml-4 mt-2">
              {data.article.authors.map((author, idx) => (
                <li key={idx} className="text-sm">
                  {author.name}
                  {author.institution && (
                    <span className="text-gray-600">
                      {" "}
                      ({author.institution})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.dataset.abstract && (
          <div className="mt-4">
            <span className="font-semibold">Abstract:</span>
            <div
              className="text-sm text-gray-700 mt-2"
              dangerouslySetInnerHTML={{ __html: data.dataset.abstract }}
            />
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold mb-4">Sheet Reviews</h2>
      {data.sheetReviews.map((review, idx) => (
        <SheetReviewCard
          key={idx}
          datasetId={data.dataset.id}
          sheetName={review.sheetName}
          excelFileName={review.excelFileName}
          hasHighlightedVersion={review.hasHighlightedVersion}
          aiReview={review.aiReview}
          pdfReview={review.pdfReview}
        />
      ))}
    </div>
  );
}
