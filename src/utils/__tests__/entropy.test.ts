import { describe, it, expect } from "@jest/globals";
import { calculateEntropyScore, calculateNumberEntropy } from "../entropy";
import { CategorizedColumn } from "../../columnCategorization/columnCategorization";

const mockCategorizedColumn: CategorizedColumn = {
  index: 0,
  id: "A",
  name: "Mock Column",
  isIncludedInAnalysis: true,
  isLnArgument: false,
  isRepeatingFraction: false,
  isSquareRoot: false,
};

describe("calculateNumberEntropy", () => {
  it("should return 100 for years between 1900-2030", () => {
    expect(calculateNumberEntropy(1900, mockCategorizedColumn)).toBe(100);
    expect(calculateNumberEntropy(2025, mockCategorizedColumn)).toBe(100);
    expect(calculateNumberEntropy(1899, mockCategorizedColumn)).not.toBe(100);
    expect(calculateNumberEntropy(2031, mockCategorizedColumn)).not.toBe(100);
  });

  it("should not treat non-integers as years", () => {
    expect(calculateNumberEntropy(2000.5, mockCategorizedColumn)).not.toBe(100);
    expect(calculateNumberEntropy(1950.1, mockCategorizedColumn)).not.toBe(100);
  });

  it("should process decimal numbers by removing decimal point", () => {
    expect(calculateNumberEntropy(123.46, mockCategorizedColumn)).toBe(12346);
    expect(calculateNumberEntropy(1.23, mockCategorizedColumn)).toBe(123);
    expect(calculateNumberEntropy(0.3, mockCategorizedColumn)).toBe(3);
  });

  it("should remove trailing zeros", () => {
    expect(calculateNumberEntropy(100, mockCategorizedColumn)).toBe(1);
    expect(calculateNumberEntropy(1000, mockCategorizedColumn)).toBe(1);
    expect(calculateNumberEntropy(12000, mockCategorizedColumn)).toBe(12);
    expect(calculateNumberEntropy(123.4, mockCategorizedColumn)).toBe(1234);
  });

  it("should handle common fractions by returning the entropy of the numerator", () => {
    expect(
      calculateNumberEntropy(4.333333333333333, mockCategorizedColumn),
    ).toBe(13); // 13 / 3
    expect(
      calculateNumberEntropy(-4.333333333333333, mockCategorizedColumn),
    ).toBe(13); // 13 / 3
    expect(calculateNumberEntropy(94.1111111111, mockCategorizedColumn)).toBe(
      847,
    ); // 847 / 9
    expect(calculateNumberEntropy(1.14285714286, mockCategorizedColumn)).toBe(
      8,
    ); // 8 / 7
    expect(calculateNumberEntropy(1.6667, mockCategorizedColumn)).toBe(5);
    expect(calculateNumberEntropy(1.667, mockCategorizedColumn)).toBe(1667); // Not close enough to an exact fraction
    expect(
      calculateNumberEntropy(9.20666666666667, mockCategorizedColumn),
    ).toBe(2762);
    expect(calculateNumberEntropy(23.125, mockCategorizedColumn)).toBe(185); // 185/8
  });

  it("should handle values created by square root", () => {
    expect(
      calculateNumberEntropy(0.547722557505166, mockCategorizedColumn),
    ).toBe(3); // Sqrt(0.3)
    expect(
      calculateNumberEntropy(1.58113883008419, mockCategorizedColumn),
    ).toBe(25); // Sqrt(2.5)
  });
  // Very small numbers will look close to the integer zero, but this does not mean that they are the result of a square root operation
  it("should handle values very close to zero", () => {
    expect(
      calculateNumberEntropy(0.000175420065225951, mockCategorizedColumn),
    ).toBe(175420065225951);
    expect(
      calculateNumberEntropy(-0.000386341501576126, mockCategorizedColumn),
    ).toBe(386341501576126);
  });
  it("should handle edge cases", () => {
    expect(calculateNumberEntropy(0, mockCategorizedColumn)).toBe(0);
    expect(calculateNumberEntropy(1, mockCategorizedColumn)).toBe(1);
    expect(calculateNumberEntropy(-1.327, mockCategorizedColumn)).toBe(1327);
  });

  it("Correctly handles regular high entropy numbers", () => {
    expect(
      calculateNumberEntropy(-19.15615292022578, mockCategorizedColumn),
    ).toBe(1915615292022578);
    expect(
      calculateNumberEntropy(1915615292022578, mockCategorizedColumn),
    ).toBe(1915615292022578);
  });
});

describe("calculateEntropyScore", () => {
  it("Deals correctly with 0", () => {
    expect(calculateEntropyScore(0)).toBe(0);
  });
});
