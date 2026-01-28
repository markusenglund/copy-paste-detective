import { SortField, SortOrder, SORT_ORDERS } from "../../../shared/sortTypes";

interface SortableColumnHeaderProps {
  label: string;
  field: SortField;
  currentSortBy: SortField;
  currentSortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

export function SortableColumnHeader({
  label,
  field,
  currentSortBy,
  currentSortOrder,
  onSort,
}: SortableColumnHeaderProps) {
  const isActive = currentSortBy === field;
  const sortIndicator = isActive
    ? currentSortOrder === SORT_ORDERS.DESC
      ? " ↓"
      : " ↑"
    : "";

  return (
    <th
      onClick={() => onSort(field)}
      style={{
        cursor: "pointer",
        userSelect: "none",
      }}
      className="sortable-header"
    >
      {label}
      {sortIndicator}
    </th>
  );
}
