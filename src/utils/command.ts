import { StrategyName } from "../types/strategies";

export const parseIntArgument = (value: string): number => {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Must be a valid integer, got: ${value}`);
  }
  return parsed;
};

export const parseExtIds = (value: string): number[] => {
  const ids = value.split(",").map((s) => {
    const parsed = parseInt(s.trim(), 10);
    if (isNaN(parsed)) {
      throw new Error(
        `Must be a comma-separated list of integers, got: ${value}`,
      );
    }
    return parsed;
  });
  if (ids.length === 0) {
    throw new Error("Must provide at least one extId");
  }
  return ids;
};

export const parseColumns = (value: string): string[] => {
  const columns = value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (columns.length === 0) {
    throw new Error("Must provide at least one column name");
  }
  return columns;
};

export const parseStrategies = (value: string): StrategyName[] => {
  const allStrategies = Object.values(StrategyName);
  const requestedStrategies = value.split(",").map((s) => s.trim());
  const validStrategies = requestedStrategies.filter((s): s is StrategyName =>
    allStrategies.includes(s as StrategyName),
  );

  if (
    validStrategies.length === 0 ||
    validStrategies.length !== requestedStrategies.length
  ) {
    throw new Error(`Available valid strategies: ${allStrategies.join(", ")}`);
  }

  return validStrategies;
};
