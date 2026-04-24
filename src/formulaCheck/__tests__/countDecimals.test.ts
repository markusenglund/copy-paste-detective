import { describe, it, expect } from "@jest/globals";
import { countDecimals } from "../countDecimals";

describe("countDecimals", () => {
  it("returns 0 for integers", () => {
    expect(countDecimals(0)).toBe(0);
    expect(countDecimals(22)).toBe(0);
    expect(countDecimals(-5)).toBe(0);
    expect(countDecimals(1500)).toBe(0);
  });

  it("counts decimal places in plain decimals", () => {
    expect(countDecimals(22.4)).toBe(1);
    expect(countDecimals(22.41)).toBe(2);
    expect(countDecimals(22.417583)).toBe(6);
    expect(countDecimals(0.001)).toBe(3);
  });

  it("returns 0 for non-finite values", () => {
    expect(countDecimals(Number.POSITIVE_INFINITY)).toBe(0);
    expect(countDecimals(Number.NaN)).toBe(0);
  });
});
