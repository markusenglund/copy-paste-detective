import { describe, it, expect } from "@jest/globals";
import { intervalGap, intervalsOverlap } from "../intervalCheck";

describe("intervalsOverlap", () => {
  it("returns true when intervals overlap", () => {
    expect(intervalsOverlap([0, 5], [3, 8])).toBe(true);
    expect(intervalsOverlap([3, 8], [0, 5])).toBe(true);
  });

  it("returns true when one interval contains the other", () => {
    expect(intervalsOverlap([0, 10], [3, 5])).toBe(true);
    expect(intervalsOverlap([3, 5], [0, 10])).toBe(true);
  });

  it("returns true when intervals touch at an edge", () => {
    expect(intervalsOverlap([0, 5], [5, 10])).toBe(true);
  });

  it("returns false for disjoint intervals", () => {
    expect(intervalsOverlap([0, 5], [6, 10])).toBe(false);
    expect(intervalsOverlap([6, 10], [0, 5])).toBe(false);
  });
});

describe("intervalGap", () => {
  it("returns 0 for overlapping intervals", () => {
    expect(intervalGap([0, 5], [3, 8])).toBe(0);
    expect(intervalGap([0, 5], [5, 10])).toBe(0);
  });

  it("returns the positive distance between disjoint intervals", () => {
    expect(intervalGap([0, 5], [7, 10])).toBeCloseTo(2, 6);
    expect(intervalGap([7, 10], [0, 5])).toBeCloseTo(2, 6);
  });
});
