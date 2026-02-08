export const FILTER_KEYS = {
  HIGH_PROBABILITY: "highProbability",
  PDF_AVAILABILITY: "pdfAvailability",
  MIN_IMPACT_SCORE: "minImpactScore",
  FIELD: "field",
  REVIEW_STATUS: "reviewStatus",
} as const;

export type FilterKey = (typeof FILTER_KEYS)[keyof typeof FILTER_KEYS];

export type PdfAvailabilityOption = "all" | "available" | "not-available";

export type ReviewStatusOption =
  | "all"
  | "has_review"
  | "no_review"
  | "true_positive"
  | "false_positive"
  | "ambiguous";

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

export interface FieldFilter {
  key: typeof FILTER_KEYS.FIELD;
  selectedField: string | null;
}

export interface ReviewStatusFilter {
  key: typeof FILTER_KEYS.REVIEW_STATUS;
  option: ReviewStatusOption;
}

export type FilterConfig =
  | HighProbabilityFilter
  | PdfAvailabilityFilter
  | MinImpactScoreFilter
  | FieldFilter
  | ReviewStatusFilter;

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
    {
      key: FILTER_KEYS.FIELD,
      selectedField: null,
    },
    {
      key: FILTER_KEYS.REVIEW_STATUS,
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
    } else if (filter.key === FILTER_KEYS.MIN_IMPACT_SCORE) {
      if (filter.minScore !== null) {
        params[`filter_${filter.key}`] = filter.minScore.toString();
      }
    } else if (filter.key === FILTER_KEYS.FIELD) {
      if (filter.selectedField !== null) {
        params[`filter_${filter.key}`] = filter.selectedField;
      }
    } else if (filter.key === FILTER_KEYS.REVIEW_STATUS) {
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

  const fieldParam = searchParams.get(`filter_${FILTER_KEYS.FIELD}`);
  filters.push({
    key: FILTER_KEYS.FIELD,
    selectedField: fieldParam !== null && fieldParam !== "" ? fieldParam : null,
  });

  const reviewStatusParam = searchParams.get(
    `filter_${FILTER_KEYS.REVIEW_STATUS}`,
  );
  const validReviewStatusOptions: ReviewStatusOption[] = [
    "all",
    "has_review",
    "no_review",
    "true_positive",
    "false_positive",
    "ambiguous",
  ];
  if (
    reviewStatusParam !== null &&
    validReviewStatusOptions.includes(reviewStatusParam as ReviewStatusOption)
  ) {
    filters.push({
      key: FILTER_KEYS.REVIEW_STATUS,
      option: reviewStatusParam as ReviewStatusOption,
    });
  } else {
    filters.push({
      key: FILTER_KEYS.REVIEW_STATUS,
      option: "all",
    });
  }

  return { filters };
}
