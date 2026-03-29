// Shared type definitions for sorting functionality
// Used by both frontend and backend to ensure type safety

export const SORT_FIELDS = {
  PROBABILITY: "probability",
  IMPACT: "impact",
  PUBLISHED: "published",
  CITATIONS: "citations",
  CITATION_SCORE: "citationScore",
  HUMAN_REVIEW_DATE: "humanReviewDate",
} as const;

export const SORT_ORDERS = {
  ASC: "asc",
  DESC: "desc",
} as const;

export type SortField = (typeof SORT_FIELDS)[keyof typeof SORT_FIELDS];
export type SortOrder = (typeof SORT_ORDERS)[keyof typeof SORT_ORDERS];

export interface SortParams {
  sortBy: SortField;
  sortOrder: SortOrder;
}

export const DEFAULT_SORT: SortParams = {
  sortBy: SORT_FIELDS.PROBABILITY,
  sortOrder: SORT_ORDERS.DESC,
};

// Validation helpers
export function isValidSortField(value: unknown): value is SortField {
  return (
    typeof value === "string" &&
    Object.values(SORT_FIELDS).includes(value as SortField)
  );
}

export function isValidSortOrder(value: unknown): value is SortOrder {
  return (
    typeof value === "string" &&
    Object.values(SORT_ORDERS).includes(value as SortOrder)
  );
}
