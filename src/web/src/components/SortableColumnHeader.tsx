import { SortField, SortOrder, SORT_ORDERS } from "../../../shared/sortTypes";

interface SortableColumnHeaderProps {
  label: string;
  field: SortField;
  currentSortBy: SortField;
  currentSortOrder: SortOrder;
  onSort: (field: SortField) => void;
  className?: string;
  width?: string;
}

export function SortableColumnHeader({
  label,
  field,
  currentSortBy,
  currentSortOrder,
  onSort,
  className,
  width,
}: SortableColumnHeaderProps): React.ReactElement {
  const isActive = currentSortBy === field;
  const sortIndicator = isActive
    ? currentSortOrder === SORT_ORDERS.DESC
      ? "↓"
      : "↑"
    : "↕";

  return (
    <th
      onClick={() => onSort(field)}
      style={{
        cursor: "pointer",
        userSelect: "none",
        width: width,
      }}
      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className || ""}`}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          whiteSpace: "nowrap",
        }}
      >
        <span>{label}</span>
        <span style={{ opacity: isActive ? 1 : 0.4 }}>{sortIndicator}</span>
      </div>
    </th>
  );
}
