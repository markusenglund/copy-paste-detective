import { CollapsibleSection } from "./CollapsibleSection";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { AIReview, PDFReview } from "../types/dataset";
import {
  getExcelDownloadUrl,
  getHighlightedExcelDownloadUrl,
} from "../api/client";

function getImpactScoreLabel(score: number): string {
  if (score === 5) return "Severe";
  if (score === 4) return "High";
  if (score === 3) return "Medium";
  if (score === 2) return "Low";
  if (score === 1) return "None";
  return "-";
}

function getImpactScoreColor(score: number): string {
  if (score === 5) return "text-red-600 font-bold";
  if (score === 4) return "text-orange-500 font-semibold";
  if (score === 3) return "text-yellow-600";
  return "text-gray-600";
}

interface SheetReviewCardProps {
  datasetId: number;
  sheetName: string;
  excelFileName: string;
  hasHighlightedVersion: boolean;
  aiReview: AIReview;
  pdfReview: PDFReview | null;
}

export function SheetReviewCard({
  datasetId,
  sheetName,
  excelFileName,
  hasHighlightedVersion,
  aiReview,
  pdfReview,
}: SheetReviewCardProps): React.ReactElement {
  const formatDate = (date: Date): string => {
    return new Date(date).toISOString().split("T")[0];
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
      <h3 className="text-xl font-semibold mb-2">{sheetName}</h3>
      <p className="text-sm text-gray-600 mb-4">File: {excelFileName}</p>
      <p className="text-sm text-gray-600 mb-4">
        <a
          href={getExcelDownloadUrl(datasetId, excelFileName)}
          download
          className="text-blue-600 hover:underline"
        >
          Original Version
        </a>
        {hasHighlightedVersion && (
          <>
            {" | "}
            <a
              href={getHighlightedExcelDownloadUrl(datasetId, excelFileName)}
              download
              className="text-blue-600 hover:underline"
            >
              Highlighted Version
            </a>
          </>
        )}
      </p>

      <div className="flex flex-wrap gap-4 text-sm mb-4">
        <span className="bg-gray-100 rounded px-3 py-1">
          <strong>True Positive Probability:</strong>{" "}
          {(aiReview.truePositiveProbability * 100).toFixed(0)}%
        </span>
        {pdfReview && (
          <span
            className={`bg-gray-100 rounded px-3 py-1 ${getImpactScoreColor(pdfReview.impactScore)}`}
          >
            <strong>Impact Score:</strong> {pdfReview.impactScore} (
            {getImpactScoreLabel(pdfReview.impactScore)})
          </span>
        )}
      </div>

      <CollapsibleSection title="AI Review Prompt" defaultOpen={false}>
        <MarkdownRenderer content={aiReview.prompt} />
      </CollapsibleSection>

      <CollapsibleSection title="AI Review Response" defaultOpen={false}>
        <div className="mb-4">
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
            <span>
              <strong>Model:</strong> {aiReview.model}
            </span>
            <span>
              <strong>Probability:</strong>{" "}
              {(aiReview.truePositiveProbability * 100).toFixed(1)}%
            </span>
            <span>
              <strong>Created:</strong> {formatDate(aiReview.createdAt)}
            </span>
          </div>
          <MarkdownRenderer content={aiReview.response} />
        </div>
      </CollapsibleSection>

      {pdfReview && (
        <CollapsibleSection title="PDF Review" defaultOpen={false}>
          <div className="mb-4">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
              <span>
                <strong>Model:</strong> {pdfReview.model}
              </span>
              <span>
                <strong>Impact Score:</strong> {pdfReview.impactScore}
              </span>
              <span>
                <strong>Created:</strong> {formatDate(pdfReview.createdAt)}
              </span>
            </div>
            <MarkdownRenderer content={pdfReview.response} />
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
