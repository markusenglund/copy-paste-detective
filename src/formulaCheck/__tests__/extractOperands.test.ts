import { describe, it, expect } from "@jest/globals";
import { extractOperands } from "../extractOperands";

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
