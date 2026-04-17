import { describe, it, expect } from "@jest/globals";
import { cellInterval } from "../intervalCheck";

describe("cellInterval", () => {
  it("produces ±0.05 for values displayed to 1 decimal", () => {
    const [lo, hi] = cellInterval(22.4);
    expect(lo).toBeCloseTo(22.35, 6);
    expect(hi).toBeCloseTo(22.45, 6);
  });

  it("produces ±0.5 for integer values (0 decimals)", () => {
    const [lo, hi] = cellInterval(5);
    expect(lo).toBeCloseTo(4.5, 6);
    expect(hi).toBeCloseTo(5.5, 6);
  });

  it("produces a very tight interval for high-precision values", () => {
    const [lo, hi] = cellInterval(0.003);
    expect(lo).toBeCloseTo(0.0025, 6);
    expect(hi).toBeCloseTo(0.0035, 6);
  });
});
