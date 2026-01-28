export const FILTER_KEYS = {
  HIGH_PROBABILITY: "highProbability",
  PDF_AVAILABILITY: "pdfAvailability",
} as const;

export type FilterKey = (typeof FILTER_KEYS)[keyof typeof FILTER_KEYS];

export type PdfAvailabilityOption = "all" | "available" | "not-available";

export interface HighProbabilityFilter {
  key: typeof FILTER_KEYS.HIGH_PROBABILITY;
  enabled: boolean;
  threshold: number;
}

export interface PdfAvailabilityFilter {
  key: typeof FILTER_KEYS.PDF_AVAILABILITY;
  option: PdfAvailabilityOption;
}

export type FilterConfig = HighProbabilityFilter | PdfAvailabilityFilter;

export interface FilterParams {
  filters: FilterConfig[];
}

export const DEFAULT_FILTERS: FilterParams = {
  filters: [
    {
      key: FILTER_KEYS.HIGH_PROBABILITY,
      enabled: true,
      threshold: 0.5,
    },
    {
      key: FILTER_KEYS.PDF_AVAILABILITY,
      option: "all",
    },
  ],
};

export function isValidFilterKey(key: string): key is FilterKey {
  return Object.values(FILTER_KEYS).includes(key as FilterKey);
}

export function serializeFilters(
  filterParams: FilterParams,
): Record<string, string> {
  const params: Record<string, string> = {};

  for (const filter of filterParams.filters) {
    if (filter.key === FILTER_KEYS.HIGH_PROBABILITY) {
      params[`filter_${filter.key}`] = filter.enabled.toString();
    } else if (filter.key === FILTER_KEYS.PDF_AVAILABILITY) {
      params[`filter_${filter.key}`] = filter.option;
    }
  }

  return params;
}

export function deserializeFilters(
  searchParams: URLSearchParams,
): FilterParams {
  const filters: FilterConfig[] = [];

  const highProbabilityParam = searchParams.get(
    `filter_${FILTER_KEYS.HIGH_PROBABILITY}`,
  );
  if (highProbabilityParam !== null) {
    filters.push({
      key: FILTER_KEYS.HIGH_PROBABILITY,
      enabled: highProbabilityParam === "true",
      threshold: 0.5,
    });
  } else {
    filters.push({
      key: FILTER_KEYS.HIGH_PROBABILITY,
      enabled: true,
      threshold: 0.5,
    });
  }

  const pdfAvailabilityParam = searchParams.get(
    `filter_${FILTER_KEYS.PDF_AVAILABILITY}`,
  );
  if (
    pdfAvailabilityParam !== null &&
    (pdfAvailabilityParam === "all" ||
      pdfAvailabilityParam === "available" ||
      pdfAvailabilityParam === "not-available")
  ) {
    filters.push({
      key: FILTER_KEYS.PDF_AVAILABILITY,
      option: pdfAvailabilityParam as PdfAvailabilityOption,
    });
  } else {
    filters.push({
      key: FILTER_KEYS.PDF_AVAILABILITY,
      option: "all",
    });
  }

  return { filters };
}
