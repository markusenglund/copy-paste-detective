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
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-xs">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[80px]">
              PDF URL
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[200px]">
              Journal
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[200px]">
              Subfield
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Suspicion
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Published
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Citations
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Citation %
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Upload
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {articles.map((article) => (
            <tr key={article.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm max-w-xs">
                {article.doi ? (
                  <a
                    href={`https://doi.org/${article.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline line-clamp-3"
                    title={article.title}
                  >
                    {article.title}
                  </a>
                ) : (
                  <span className="line-clamp-3" title={article.title}>
                    {article.title}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm max-w-[80px]">
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
                  <span className="text-gray-400">No URL</span>
                )}
              </td>
              <td
                className="px-4 py-3 text-sm max-w-[160px]"
                title={article.journalTitle || undefined}
              >
                {article.journalTitle ? (
                  <span className="line-clamp-3" title={article.journalTitle}>
                    {article.journalTitle}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td
                className="px-4 py-3 text-sm max-w-[200px]"
                title={article.subfield || undefined}
              >
                {article.subfield ? (
                  <span className="line-clamp-3" title={article.subfield}>
                    {article.subfield}
                  </span>
                ) : (
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
              <td className="px-4 py-3 text-sm text-gray-600">
                {article.citationNormalizedPercentile !== null
                  ? `${(article.citationNormalizedPercentile * 100).toFixed(1)}%`
                  : "-"}
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
