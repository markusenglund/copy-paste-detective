import { describe, it, expect } from "@jest/globals";
import { calculateNumberEntropy } from "../entropy";

describe("calculateNumberEntropy", () => {
  it("should return 100 for years between 1900-2030", () => {
    expect(calculateNumberEntropy(1900)).toBe(100);
    expect(calculateNumberEntropy(2025)).toBe(100);
    expect(calculateNumberEntropy(1899)).not.toBe(100);
    expect(calculateNumberEntropy(2031)).not.toBe(100);
  });

  it("should not treat non-integers as years", () => {
    expect(calculateNumberEntropy(2000.5)).not.toBe(100);
    expect(calculateNumberEntropy(1950.1)).not.toBe(100);
  });

  it("should process decimal numbers by removing decimal point", () => {
    expect(calculateNumberEntropy(123.46)).toBe(12346);
    expect(calculateNumberEntropy(1.23)).toBe(123);
    expect(calculateNumberEntropy(0.3)).toBe(3);
  });

  it("should remove trailing zeros", () => {
    expect(calculateNumberEntropy(100)).toBe(1);
    expect(calculateNumberEntropy(1000)).toBe(1);
    expect(calculateNumberEntropy(12000)).toBe(12);
    expect(calculateNumberEntropy(123.4)).toBe(1234);
  });

  it("should handle common fractions by returning the entropy of the numerator", () => {
    expect(calculateNumberEntropy(4.333333333333333)).toBe(13); // 13 / 3
    expect(calculateNumberEntropy(94.1111111111)).toBe(847); // 847 / 9
    expect(calculateNumberEntropy(1.14285714286)).toBe(8); // 8 / 7
  });

  it("should handle edge cases", () => {
    expect(calculateNumberEntropy(0)).toBe(0);
    expect(calculateNumberEntropy(1)).toBe(1);
    expect(calculateNumberEntropy(-1.327)).toBe(1327);
  });
});
