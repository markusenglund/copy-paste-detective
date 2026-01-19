import React from "react";
import { ArticleForUpload } from "../types/article";
import { PdfDropzone } from "./PdfDropzone";

interface ArticlesTableProps {
  articles: ArticleForUpload[];
  onUploadSuccess: () => void;
}

function getSuspicionScoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 8) return "text-red-600 font-bold";
  if (score >= 6) return "text-orange-500 font-semibold";
  if (score >= 4) return "text-yellow-600";
  return "text-gray-600";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString();
}

export function ArticlesTable({
  articles,
  onUploadSuccess,
}: ArticlesTableProps): React.ReactElement {
  if (articles.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No articles pending PDF upload
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              DOI
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              PDF URL
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-xs">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Journal
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Suspicion
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Citations
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Upload
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {articles.map((article) => (
            <tr key={article.id} className="hover:bg-gray-50 h-20">
              <td className="px-4 py-3 text-sm">
                {article.doi ? (
                  <a
                    href={`https://doi.org/${article.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {article.doi.length > 30
                      ? article.doi.substring(0, 30) + "..."
                      : article.doi}
                  </a>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                {article.fullPdfUrl ? (
                  <a
                    href={article.fullPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Open PDF
                  </a>
                ) : (
                  <span className="text-gray-400">No PDF URL</span>
                )}
              </td>
              <td
                className="px-4 py-3 text-sm max-w-xs truncate"
                title={article.title}
              >
                {article.title}
              </td>
              <td
                className="px-4 py-3 text-sm max-w-[200px] truncate"
                title={article.journalTitle || undefined}
              >
                {article.journalTitle || (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td
                className={`px-4 py-3 text-sm ${getSuspicionScoreColor(article.suspicionScore)}`}
              >
                {article.suspicionScore ?? "-"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {formatDate(article.publicationDate)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {article.numCitations}
              </td>
              <td className="px-4 py-3 text-sm">
                <PdfDropzone
                  articleId={article.id}
                  onUploadSuccess={onUploadSuccess}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
