export const FILTER_KEYS = {
  HIGH_PROBABILITY: "highProbability",
} as const;

export type FilterKey = (typeof FILTER_KEYS)[keyof typeof FILTER_KEYS];

export interface HighProbabilityFilter {
  key: typeof FILTER_KEYS.HIGH_PROBABILITY;
  enabled: boolean;
  threshold: number;
}

export type FilterConfig = HighProbabilityFilter;

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

  return { filters };
}
