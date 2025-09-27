import { describe, it, expect } from "@jest/globals";
import { detectSquareRoot } from "../squareRoot";

describe("detectSquareRoot", () => {
  it("should detect square roots", () => {
    expect(detectSquareRoot(0.547722557505166)?.radicand).toBe(0.3);
  });
});
