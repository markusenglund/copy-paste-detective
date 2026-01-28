import React from "react";
import { FilterParams, FILTER_KEYS } from "../../../shared/filterTypes";

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

  const isHighProbabilityEnabled = highProbabilityFilter?.enabled ?? true;

  const activeFilterCount = filterParams.filters.filter(
    (f) => f.enabled,
  ).length;

  const handleHighProbabilityChange = (enabled: boolean): void => {
    const updatedFilters = filterParams.filters.map((filter) =>
      filter.key === FILTER_KEYS.HIGH_PROBABILITY
        ? { ...filter, enabled }
        : filter,
    );

    onFilterChange({ filters: updatedFilters });
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isHighProbabilityEnabled}
              onChange={(e) => handleHighProbabilityChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span>High probability only (≥50%)</span>
          </label>
        </div>
      </div>
    </div>
  );
}
