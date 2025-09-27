import { describe, it, expect } from "@jest/globals";
import { detectSquareRoot, detectSquareRootOfFraction } from "../squareRoot";

describe("detectSquareRoot", () => {
  it("should detect square roots", () => {
    expect(detectSquareRoot(0.547722557505166)?.radicand).toBe(0.3);
  });
});

describe("detectSquareRootOfFraction", () => {
  it("should not detect non-square roots", () => {
    expect(detectSquareRootOfFraction(32.9039)).toBeNull();
    expect(detectSquareRootOfFraction(0.7)).toBeNull();
  });
});
