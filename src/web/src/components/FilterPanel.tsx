import React from "react";
import {
  FilterParams,
  FILTER_KEYS,
  PdfAvailabilityOption,
} from "../../../shared/filterTypes";

interface FilterPanelProps {
  filterParams: FilterParams;
  onFilterChange: (filterParams: FilterParams) => void;
}

export function FilterPanel({
  filterParams,
  onFilterChange,
}: FilterPanelProps): React.ReactElement {
  const highProbabilityFilter = filterParams.filters.find(
    (f) => f.key === FILTER_KEYS.HIGH_PROBABILITY,
  );

  const pdfAvailabilityFilter = filterParams.filters.find(
    (f) => f.key === FILTER_KEYS.PDF_AVAILABILITY,
  );

  const isHighProbabilityEnabled = highProbabilityFilter?.enabled ?? true;
  const pdfAvailabilityOption = pdfAvailabilityFilter?.option ?? "all";

  const activeFilterCount =
    (isHighProbabilityEnabled ? 1 : 0) +
    (pdfAvailabilityOption !== "all" ? 1 : 0);

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
        </div>
      </div>
    </div>
  );
}
