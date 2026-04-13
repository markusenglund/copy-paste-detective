import React from "react";
import { Link } from "react-router-dom";
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

function getVerdictLabel(verdict: string): string {
  if (verdict === "true_positive") return "True Positive";
  if (verdict === "false_positive") return "False Positive";
  if (verdict === "ambiguous") return "Ambiguous";
  return "-";
}

function getVerdictClass(verdict: string): string {
  if (verdict === "true_positive") return "font-bold";
  if (verdict === "false_positive") return "font-semibold";
  if (verdict === "ambiguous") return "font-semibold";
  return "";
}

function getVerdictEmoji(verdict: string): string {
  if (verdict === "true_positive") return "✅";
  if (verdict === "false_positive") return "❌";
  if (verdict === "ambiguous") return "❓";
  return "";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toISOString().split("T")[0];
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
      <div className="text-center py-8 text-gray-500">No articles found</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="divide-y divide-gray-200"
        style={{ tableLayout: "fixed", width: "100%" }}
      >
        <thead className="bg-gray-50">
          <tr>
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "110px" }}
            >
              ID
            </th>
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "320px" }}
            >
              Title
            </th>
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "120px" }}
            >
              Links
            </th>
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "160px" }}
            >
              Journal
            </th>
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "160px" }}
            >
              Subfield
            </th>
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "100px" }}
            >
              Country
            </th>
            <SortableColumnHeader
              label="Prob (AI)"
              field={SORT_FIELDS.PROBABILITY}
              currentSortBy={currentSortBy}
              currentSortOrder={currentSortOrder}
              onSort={onSort}
              width="110px"
            />
            <SortableColumnHeader
              label="Impact (AI)"
              field={SORT_FIELDS.IMPACT}
              currentSortBy={currentSortBy}
              currentSortOrder={currentSortOrder}
              onSort={onSort}
              width="120px"
            />
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "150px" }}
            >
              Human Review
            </th>
            <SortableColumnHeader
              label="Review Date"
              field={SORT_FIELDS.HUMAN_REVIEW_DATE}
              currentSortBy={currentSortBy}
              currentSortOrder={currentSortOrder}
              onSort={onSort}
              width="130px"
            />
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "180px" }}
            >
              Tags
            </th>
            <SortableColumnHeader
              label="Published"
              field={SORT_FIELDS.PUBLISHED}
              currentSortBy={currentSortBy}
              currentSortOrder={currentSortOrder}
              onSort={onSort}
              width="140px"
            />
            <SortableColumnHeader
              label="Citations"
              field={SORT_FIELDS.CITATIONS}
              currentSortBy={currentSortBy}
              currentSortOrder={currentSortOrder}
              onSort={onSort}
              width="110px"
            />
            <SortableColumnHeader
              label="Cit Score"
              field={SORT_FIELDS.CITATION_SCORE}
              currentSortBy={currentSortBy}
              currentSortOrder={currentSortOrder}
              onSort={onSort}
              width="110px"
            />
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "170px" }}
            >
              PDF File
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {articles.map((article) => (
            <tr key={article.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-600">
                {article.extId ?? "-"}
              </td>
              <td className="px-4 py-3 text-sm">
                {article.datasetId ? (
                  <Link
                    to={`/dataset/${article.datasetId}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline line-clamp-3 block"
                    title={article.title}
                  >
                    {article.title}
                  </Link>
                ) : article.doi ? (
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
              <td className="px-4 py-3 text-sm">
                <div className="flex flex-col gap-1">
                  {article.doi && (
                    <a
                      href={`https://doi.org/${article.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Article
                      <svg
                        className="w-3.5 h-3.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                  {article.fullPdfUrl && (
                    <a
                      href={article.fullPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      PDF
                      <svg
                        className="w-3.5 h-3.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                  {!article.doi && !article.fullPdfUrl && (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm">
                {article.journalTitle ? (
                  <span
                    className="line-clamp-2 block"
                    title={article.journalTitle}
                  >
                    {article.journalTitle}
                    {article.journalSjrScore !== null &&
                      ` (${article.journalSjrScore.toFixed(1)})`}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                {article.subfield ? (
                  <span className="line-clamp-2 block" title={article.subfield}>
                    {article.subfield}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {article.countryCode ? (
                  <span className="truncate block" title={article.countryCode}>
                    {getCountryFlag(article.countryCode)} {article.countryCode}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td
                className={`px-4 py-3 text-sm ${getTruePositiveProbabilityColor(article.truePositiveProbability)}`}
              >
                <span className="truncate block">
                  {article.truePositiveProbability !== null
                    ? `${(article.truePositiveProbability * 100).toFixed(0)}%`
                    : "-"}
                </span>
              </td>
              <td
                className={`px-4 py-3 text-sm ${getImpactScoreColor(article.impactScore)}`}
              >
                <span className="truncate block">
                  {getImpactScoreLabel(article.impactScore)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                {article.humanReviewVerdict !== null ? (
                  <div className="flex flex-col">
                    <span
                      className={getVerdictClass(article.humanReviewVerdict)}
                    >
                      {getVerdictEmoji(article.humanReviewVerdict)}{" "}
                      {getVerdictLabel(article.humanReviewVerdict)}
                    </span>
                    <span
                      className={`text-xs ${getImpactScoreColor(article.humanReviewImpactScore)}`}
                    >
                      {getImpactScoreLabel(article.humanReviewImpactScore)}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400">No review</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <span className="truncate block">
                  {formatDate(article.humanReviewUpdatedAt)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex flex-wrap gap-1">
                  {article.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: tag.color + "20",
                        color: tag.color,
                        border: `1px solid ${tag.color}40`,
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <span className="truncate block">
                  {formatDate(article.publicationDate)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <span className="truncate block">{article.numCitations}</span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <span className="truncate block">
                  {article.citationScore.toFixed(2)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                {article.pdfFilename ? (
                  <div className="flex flex-col min-w-0">
                    <a
                      href={`/api/articles/${article.id}/pdf/${article.pdfFilename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline truncate block"
                      title={article.pdfFilename}
                    >
                      {article.pdfFilename}
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
