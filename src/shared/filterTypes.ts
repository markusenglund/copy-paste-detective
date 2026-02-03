export const FILTER_KEYS = {
  HIGH_PROBABILITY: "highProbability",
  PDF_AVAILABILITY: "pdfAvailability",
  MIN_IMPACT_SCORE: "minImpactScore",
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

export interface MinImpactScoreFilter {
  key: typeof FILTER_KEYS.MIN_IMPACT_SCORE;
  minScore: number | null;
}

export type FilterConfig =
  | HighProbabilityFilter
  | PdfAvailabilityFilter
  | MinImpactScoreFilter;

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
    {
      key: FILTER_KEYS.MIN_IMPACT_SCORE,
      minScore: null,
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
    } else if (filter.key === FILTER_KEYS.MIN_IMPACT_SCORE) {
      if (filter.minScore !== null) {
        params[`filter_${filter.key}`] = filter.minScore.toString();
      }
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

  const minImpactScoreParam = searchParams.get(
    `filter_${FILTER_KEYS.MIN_IMPACT_SCORE}`,
  );
  const parsedMinImpactScore =
    minImpactScoreParam !== null ? parseInt(minImpactScoreParam, 10) : NaN;
  filters.push({
    key: FILTER_KEYS.MIN_IMPACT_SCORE,
    minScore:
      !isNaN(parsedMinImpactScore) &&
      parsedMinImpactScore >= 1 &&
      parsedMinImpactScore <= 5
        ? parsedMinImpactScore
        : null,
  });

  return { filters };
}
