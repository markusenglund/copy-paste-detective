import { StrategyName } from "../types/strategies";

export const parseIntArgument = (value: string): number => {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Must be a valid integer, got: ${value}`);
  }
  return parsed;
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
