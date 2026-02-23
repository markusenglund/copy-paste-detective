import React, { useEffect, useRef, useState } from "react";
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

interface CompactSelectOption {
  value: string;
  label: string;
}

function CompactSelect({
  label,
  value,
  options,
  onChange,
  allLabel = "All",
}: {
  label: string;
  value: string | null;
  options: CompactSelectOption[];
  onChange: (value: string | null) => void;
  allLabel?: string;
}): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return (): void =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? allLabel;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-gray-700 font-medium">{label}</span>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center justify-between gap-1 max-w-[160px] w-[160px] text-sm text-gray-700 border border-gray-300 rounded bg-white px-2 py-1 focus:ring-blue-500 focus:border-blue-500 text-left cursor-pointer"
        >
          <span className="truncate">{selectedLabel}</span>
          <svg
            className="w-3.5 h-3.5 shrink-0 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute z-20 mt-1 min-w-max max-h-[300px] overflow-y-auto bg-white border border-gray-300 rounded shadow-lg">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 cursor-pointer ${
                value === null
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700"
              }`}
            >
              {allLabel}
            </button>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 cursor-pointer ${
                  value === option.value
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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

  const impactOptions: CompactSelectOption[] = [
    { value: "1", label: "None (1)" },
    { value: "2", label: "Low (2)" },
    { value: "3", label: "Medium (3)" },
    { value: "4", label: "High (4)" },
    { value: "5", label: "Severe (5)" },
  ];

  const reviewStatusOptions: CompactSelectOption[] = [
    { value: "has_review", label: "Has Review" },
    { value: "no_review", label: "No Review" },
    { value: "true_positive", label: "True Positive" },
    { value: "false_positive", label: "False Positive" },
    { value: "ambiguous", label: "Ambiguous" },
  ];

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
        {activeFilterCount > 0 && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
            {activeFilterCount}
          </span>
        )}
      </div>

      <div className="flex items-start gap-4">
        {/* Left group: PDF, Field, Case Status */}
        <div className="flex items-start gap-4">
          {/* PDF Availability - stacked radio buttons */}
          <div className="flex flex-col gap-1">
            <span className="text-sm text-gray-700 font-medium">PDF</span>
            <div className="flex flex-col gap-0.5">
              <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="pdfAvailability"
                  value="all"
                  checked={pdfAvailabilityOption === "all"}
                  onChange={() => handlePdfAvailabilityChange("all")}
                  className="w-3.5 h-3.5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
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
                  className="w-3.5 h-3.5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
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
                  className="w-3.5 h-3.5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <span>Not available</span>
              </label>
            </div>
          </div>

          <div className="w-px self-stretch bg-gray-200" />

          {/* Field selector - compact dropdown */}
          <CompactSelect
            label="Field"
            value={selectedField}
            options={availableFields.map((f) => ({ value: f, label: f }))}
            onChange={handleFieldChange}
            allLabel="All fields"
          />

          <div className="w-px self-stretch bg-gray-200" />

          {/* Case Status - compact dropdown */}
          <CompactSelect
            label="Case Status"
            value={selectedCaseStatusId}
            options={prosecutionStatuses.map((s) => ({
              value: String(s.id),
              label: s.name,
            }))}
            onChange={handleCaseStatusChange}
            allLabel="All statuses"
          />
        </div>

        <div className="flex-1" />

        {/* Right group: AI Review, Human Review */}
        <div className="flex items-start gap-4">
          {/* AI Review group */}
          <div className="border border-blue-200 bg-blue-50/50 rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
              AI Review
            </span>
            <div className="flex items-end gap-4 mt-1.5">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-700 font-medium">
                  Probability
                </span>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={isHighProbabilityEnabled}
                    onChange={(e) =>
                      handleHighProbabilityChange(e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span>High only (&ge;50%)</span>
                </label>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-700 font-medium">
                  Min Impact
                </span>
                <select
                  value={minImpactScore ?? ""}
                  onChange={(e) =>
                    handleMinImpactScoreChange(
                      e.target.value === ""
                        ? null
                        : parseInt(e.target.value, 10),
                    )
                  }
                  className="text-sm text-gray-700 border border-gray-300 rounded bg-white px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All</option>
                  {impactOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Human Review group */}
          <div className="border border-amber-200 bg-amber-50/50 rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              Human Review
            </span>
            <div className="flex items-end gap-4 mt-1.5">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-700 font-medium">
                  Verdict
                </span>
                <select
                  value={reviewStatusOption}
                  onChange={(e) =>
                    handleReviewStatusChange(
                      e.target.value as ReviewStatusOption,
                    )
                  }
                  className="text-sm text-gray-700 border border-gray-300 rounded bg-white px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All</option>
                  {reviewStatusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-700 font-medium">
                  Min Impact
                </span>
                <select
                  value={minHumanReviewImpactScore ?? ""}
                  onChange={(e) =>
                    handleMinHumanReviewImpactScoreChange(
                      e.target.value === ""
                        ? null
                        : parseInt(e.target.value, 10),
                    )
                  }
                  className="text-sm text-gray-700 border border-gray-300 rounded bg-white px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All</option>
                  {impactOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
