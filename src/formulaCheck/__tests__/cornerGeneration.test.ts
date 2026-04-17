import { describe, it, expect } from "@jest/globals";
import { extractOperands, generateCorners } from "../cornerGeneration";

describe("extractOperands", () => {
  it("extracts uppercase column letters", () => {
    expect(extractOperands("A + B * C")).toEqual(["A", "B", "C"]);
  });

  it("deduplicates operands", () => {
    expect(extractOperands("A + A")).toEqual(["A"]);
  });

  it("returns sorted operands", () => {
    expect(extractOperands("C + A + B")).toEqual(["A", "B", "C"]);
  });

  it("ignores lowercase math module", () => {
    expect(extractOperands("math.sqrt(A)")).toEqual(["A"]);
  });

  it("handles multi-letter column names", () => {
    expect(extractOperands("AA + AB")).toEqual(["AA", "AB"]);
  });

  it("returns empty array for constant expression", () => {
    expect(extractOperands("1 + 2")).toEqual([]);
  });
});

describe("generateCorners", () => {
  it("returns single empty scope for zero operands", () => {
    expect(generateCorners([], {})).toEqual([{}]);
  });

  it("returns 2 corners for one operand", () => {
    const corners = generateCorners(["A"], { A: [1, 2] });
    expect(corners).toHaveLength(2);
    expect(corners).toContainEqual({ A: 1 });
    expect(corners).toContainEqual({ A: 2 });
  });

  it("returns 4 corners for two operands (Cartesian product)", () => {
    const corners = generateCorners(["A", "B"], { A: [1, 2], B: [3, 4] });
    expect(corners).toHaveLength(4);
    expect(corners).toContainEqual({ A: 1, B: 3 });
    expect(corners).toContainEqual({ A: 1, B: 4 });
    expect(corners).toContainEqual({ A: 2, B: 3 });
    expect(corners).toContainEqual({ A: 2, B: 4 });
  });

  it("returns 64 samples + midpoint for more than 6 operands", () => {
    const operands = ["A", "B", "C", "D", "E", "F", "G"];
    const intervals = Object.fromEntries(operands.map((op) => [op, [0, 1]]));
    const corners = generateCorners(operands, intervals as never, 0);
    expect(corners).toHaveLength(65);
    // last one is midpoint — all values should be 0.5
    const midpoint = corners[64];
    for (const op of operands) {
      expect(midpoint[op]).toBe(0.5);
    }
  });

  it("returns same corners for same seed (deterministic)", () => {
    const operands = ["A", "B", "C", "D", "E", "F", "G"];
    const intervals = Object.fromEntries(operands.map((op) => [op, [0, 1]]));
    const c1 = generateCorners(operands, intervals as never, 42);
    const c2 = generateCorners(operands, intervals as never, 42);
    expect(c1).toEqual(c2);
  });
});
