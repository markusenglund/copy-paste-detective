import React from "react";
import { ArticleForUpload } from "../types/article";
import { PdfDropzone } from "./PdfDropzone";
import { SortableColumnHeader } from "./SortableColumnHeader";
import { SortField, SortOrder, SORT_FIELDS } from "../../../shared/sortTypes";

interface ArticlesTableProps {
  articles: ArticleForUpload[];
  onUploadSuccess: () => void;
  currentSortBy: SortField;
  currentSortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

function getTruePositiveProbabilityColor(probability: number | null): string {
  if (probability === null) return "text-gray-400";
  if (probability >= 0.8) return "text-red-600 font-bold";
  if (probability >= 0.6) return "text-orange-500 font-semibold";
  if (probability >= 0.4) return "text-yellow-600";
  return "text-gray-600";
}

function getImpactScoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score === 5) return "text-red-600 font-bold";
  if (score === 4) return "text-orange-500 font-semibold";
  if (score === 3) return "text-yellow-600";
  return "text-gray-600";
}

function getImpactScoreLabel(score: number | null): string {
  if (score === null) return "-";
  if (score === 5) return "Severe";
  if (score === 4) return "High";
  if (score === 3) return "Medium";
  if (score === 2) return "Low";
  if (score === 1) return "None";
  return "-";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString();
}

function getCountryFlag(countryCode: string): string {
  // Convert ISO 3166-1 alpha-2 country code to flag emoji
  // Each letter is converted to a Regional Indicator Symbol
  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join("");
}

function formatSize(bytes: number): string {
  if (bytes < 1_000) {
    return `${bytes} B`;
  }
  if (bytes < 10_000) {
    return `${(bytes / 1000).toFixed(2)} kB`;
  }
  if (bytes < 100_000) {
    return `${(bytes / 1000).toFixed(1)} kB`;
  }
  if (bytes < 1_000_000) {
    return `${(bytes / 1000).toFixed(0)} kB`;
  }
  if (bytes < 10_000_000) {
    return `${(bytes / 1_000_000).toFixed(2)} MB`;
  }
  if (bytes < 100_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  if (bytes < 1_000_000_000) {
    return `${(bytes / 1_000_000).toFixed(0)} MB`;
  }
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}

export function ArticlesTable({
  articles,
  onUploadSuccess,
  currentSortBy,
  currentSortOrder,
  onSort,
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
              Country
            </th>
            <SortableColumnHeader
              label="Probability"
              field={SORT_FIELDS.PROBABILITY}
              currentSortBy={currentSortBy}
              currentSortOrder={currentSortOrder}
              onSort={onSort}
            />
            <SortableColumnHeader
              label="Impact"
              field={SORT_FIELDS.IMPACT}
              currentSortBy={currentSortBy}
              currentSortOrder={currentSortOrder}
              onSort={onSort}
            />
            <SortableColumnHeader
              label="Published"
              field={SORT_FIELDS.PUBLISHED}
              currentSortBy={currentSortBy}
              currentSortOrder={currentSortOrder}
              onSort={onSort}
            />
            <SortableColumnHeader
              label="Citations"
              field={SORT_FIELDS.CITATIONS}
              currentSortBy={currentSortBy}
              currentSortOrder={currentSortOrder}
              onSort={onSort}
            />
            <SortableColumnHeader
              label="Citation %"
              field={SORT_FIELDS.CITATION_PERCENTILE}
              currentSortBy={currentSortBy}
              currentSortOrder={currentSortOrder}
              onSort={onSort}
            />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              PDF File
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
              <td className="px-4 py-3 text-sm text-gray-600">
                {article.countryCode ? (
                  <span>
                    {getCountryFlag(article.countryCode)} {article.countryCode}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td
                className={`px-4 py-3 text-sm ${getTruePositiveProbabilityColor(article.truePositiveProbability)}`}
              >
                {article.truePositiveProbability !== null
                  ? `${(article.truePositiveProbability * 100).toFixed(0)}%`
                  : "-"}
              </td>
              <td
                className={`px-4 py-3 text-sm ${getImpactScoreColor(article.impactScore)}`}
              >
                {getImpactScoreLabel(article.impactScore)}
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
                {article.pdfFilename ? (
                  <div className="flex flex-col">
                    <a
                      href={`/api/articles/${article.id}/pdf/${article.pdfFilename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                      title={article.pdfFilename}
                    >
                      {article.pdfFilename.length > 30
                        ? `${article.pdfFilename.substring(0, 27)}...`
                        : article.pdfFilename}
                    </a>
                    {article.pdfFileSize && (
                      <span className="text-xs text-gray-500">
                        {formatSize(article.pdfFileSize)}
                      </span>
                    )}
                  </div>
                ) : (
                  <PdfDropzone
                    articleId={article.id}
                    onUploadSuccess={onUploadSuccess}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
