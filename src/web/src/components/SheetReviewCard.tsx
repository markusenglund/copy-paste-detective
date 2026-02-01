import { CollapsibleSection } from "./CollapsibleSection";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { AIReview, PDFReview } from "../types/dataset";
import {
  getExcelDownloadUrl,
  getHighlightedExcelDownloadUrl,
} from "../api/client";

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
    return new Date(date).toLocaleString();
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
