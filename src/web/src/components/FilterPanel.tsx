import React, { useEffect, useState } from "react";
import {
  FilterParams,
  FILTER_KEYS,
  PdfAvailabilityOption,
  ReviewStatusOption,
} from "../../../shared/filterTypes";
import {
  fetchAvailableFields,
  fetchProsecutionStatuses,
  ProsecutionStatus,
} from "../api/client";

interface FilterPanelProps {
  filterParams: FilterParams;
  onFilterChange: (filterParams: FilterParams) => void;
}

export function FilterPanel({
  filterParams,
  onFilterChange,
}: FilterPanelProps): React.ReactElement {
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [prosecutionStatuses, setProsecutionStatuses] = useState<
    ProsecutionStatus[]
  >([]);

  useEffect(() => {
    fetchAvailableFields()
      .then(setAvailableFields)
      .catch((err) => console.error("Failed to fetch available fields:", err));
    fetchProsecutionStatuses()
      .then(setProsecutionStatuses)
      .catch((err) =>
        console.error("Failed to fetch prosecution statuses:", err),
      );
  }, []);

  const highProbabilityFilter = filterParams.filters.find(
    (f) => f.key === FILTER_KEYS.HIGH_PROBABILITY,
  );

  const pdfAvailabilityFilter = filterParams.filters.find(
    (f) => f.key === FILTER_KEYS.PDF_AVAILABILITY,
  );

  const minImpactScoreFilter = filterParams.filters.find(
    (f) => f.key === FILTER_KEYS.MIN_IMPACT_SCORE,
  );

  const minHumanReviewImpactScoreFilter = filterParams.filters.find(
    (f) => f.key === FILTER_KEYS.MIN_HUMAN_REVIEW_IMPACT_SCORE,
  );

  const fieldFilter = filterParams.filters.find(
    (f) => f.key === FILTER_KEYS.FIELD,
  );

  const reviewStatusFilter = filterParams.filters.find(
    (f) => f.key === FILTER_KEYS.REVIEW_STATUS,
  );

  const caseStatusFilter = filterParams.filters.find(
    (f) => f.key === FILTER_KEYS.CASE_STATUS,
  );

  const isHighProbabilityEnabled = highProbabilityFilter?.enabled ?? true;
  const pdfAvailabilityOption = pdfAvailabilityFilter?.option ?? "all";
  const minImpactScore = minImpactScoreFilter?.minScore ?? null;
  const minHumanReviewImpactScore =
    minHumanReviewImpactScoreFilter?.minScore ?? null;
  const selectedField = fieldFilter?.selectedField ?? null;
  const reviewStatusOption = reviewStatusFilter?.option ?? "all";
  const selectedCaseStatusId = caseStatusFilter?.selectedStatusId ?? null;

  const activeFilterCount =
    (isHighProbabilityEnabled ? 1 : 0) +
    (pdfAvailabilityOption !== "all" ? 1 : 0) +
    (minImpactScore !== null ? 1 : 0) +
    (minHumanReviewImpactScore !== null ? 1 : 0) +
    (selectedField !== null ? 1 : 0) +
    (reviewStatusOption !== "all" ? 1 : 0) +
    (selectedCaseStatusId !== null ? 1 : 0);

  const handleHighProbabilityChange = (enabled: boolean): void => {
    const updatedFilters = filterParams.filters.map((filter) =>
      filter.key === FILTER_KEYS.HIGH_PROBABILITY
        ? { ...filter, enabled }
        : filter,
    );

    onFilterChange({ filters: updatedFilters });
  };

  const handlePdfAvailabilityChange = (option: PdfAvailabilityOption): void => {
    const updatedFilters = filterParams.filters.map((filter) =>
      filter.key === FILTER_KEYS.PDF_AVAILABILITY
        ? { ...filter, option }
        : filter,
    );

    onFilterChange({ filters: updatedFilters });
  };

  const handleMinImpactScoreChange = (value: number | null): void => {
    const updatedFilters = filterParams.filters.map((filter) =>
      filter.key === FILTER_KEYS.MIN_IMPACT_SCORE
        ? { ...filter, minScore: value }
        : filter,
    );

    onFilterChange({ filters: updatedFilters });
  };

  const handleMinHumanReviewImpactScoreChange = (
    value: number | null,
  ): void => {
    const updatedFilters = filterParams.filters.map((filter) =>
      filter.key === FILTER_KEYS.MIN_HUMAN_REVIEW_IMPACT_SCORE
        ? { ...filter, minScore: value }
        : filter,
    );

    onFilterChange({ filters: updatedFilters });
  };

  const handleFieldChange = (value: string | null): void => {
    const updatedFilters = filterParams.filters.map((filter) =>
      filter.key === FILTER_KEYS.FIELD
        ? { ...filter, selectedField: value }
        : filter,
    );

    onFilterChange({ filters: updatedFilters });
  };

  const handleReviewStatusChange = (value: ReviewStatusOption): void => {
    const updatedFilters = filterParams.filters.map((filter) =>
      filter.key === FILTER_KEYS.REVIEW_STATUS
        ? { ...filter, option: value }
        : filter,
    );

    onFilterChange({ filters: updatedFilters });
  };

  const handleCaseStatusChange = (value: string | null): void => {
    const updatedFilters = filterParams.filters.map((filter) =>
      filter.key === FILTER_KEYS.CASE_STATUS
        ? { ...filter, selectedStatusId: value }
        : filter,
    );

    onFilterChange({ filters: updatedFilters });
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <div className="flex items-start gap-8">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-6 flex-1">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isHighProbabilityEnabled}
              onChange={(e) => handleHighProbabilityChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span>High probability only (≥50%)</span>
          </label>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 font-medium">PDF:</span>
            <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="pdfAvailability"
                value="all"
                checked={pdfAvailabilityOption === "all"}
                onChange={() => handlePdfAvailabilityChange("all")}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
              />
              <span>All</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="pdfAvailability"
                value="available"
                checked={pdfAvailabilityOption === "available"}
                onChange={() => handlePdfAvailabilityChange("available")}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
              />
              <span>Available</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="pdfAvailability"
                value="not-available"
                checked={pdfAvailabilityOption === "not-available"}
                onChange={() => handlePdfAvailabilityChange("not-available")}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
              />
              <span>Not available</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">
              Min Impact:
            </span>
            <select
              value={minImpactScore ?? ""}
              onChange={(e) =>
                handleMinImpactScoreChange(
                  e.target.value === "" ? null : parseInt(e.target.value, 10),
                )
              }
              className="text-sm text-gray-700 border border-gray-300 rounded bg-white px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              <option value={1}>None (1)</option>
              <option value={2}>Low (2)</option>
              <option value={3}>Medium (3)</option>
              <option value={4}>High (4)</option>
              <option value={5}>Severe (5)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">
              Min HR Impact:
            </span>
            <select
              value={minHumanReviewImpactScore ?? ""}
              onChange={(e) =>
                handleMinHumanReviewImpactScoreChange(
                  e.target.value === "" ? null : parseInt(e.target.value, 10),
                )
              }
              className="text-sm text-gray-700 border border-gray-300 rounded bg-white px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              <option value={1}>None (1)</option>
              <option value={2}>Low (2)</option>
              <option value={3}>Medium (3)</option>
              <option value={4}>High (4)</option>
              <option value={5}>Severe (5)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">Field:</span>
            <select
              value={selectedField ?? ""}
              onChange={(e) =>
                handleFieldChange(e.target.value === "" ? null : e.target.value)
              }
              className="text-sm text-gray-700 border border-gray-300 rounded bg-white px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              {availableFields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">
              Review Status:
            </span>
            <select
              value={reviewStatusOption}
              onChange={(e) =>
                handleReviewStatusChange(e.target.value as ReviewStatusOption)
              }
              className="text-sm text-gray-700 border border-gray-300 rounded bg-white px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="has_review">Has Review</option>
              <option value="no_review">No Review</option>
              <option value="true_positive">True Positive</option>
              <option value="false_positive">False Positive</option>
              <option value="ambiguous">Ambiguous</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">
              Case Status:
            </span>
            <select
              value={selectedCaseStatusId ?? ""}
              onChange={(e) =>
                handleCaseStatusChange(
                  e.target.value === "" ? null : e.target.value,
                )
              }
              className="text-sm text-gray-700 border border-gray-300 rounded bg-white px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              {prosecutionStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
