import { describe, it, expect } from "@jest/globals";
import { detectNaturalLogarithm } from "../logarithm";

describe("detectNaturalLogarithm", () => {
  it("should detect natural logarithm arguments", () => {
    expect(detectNaturalLogarithm(0.693147181)?.argument).toBe(2);
    expect(detectNaturalLogarithm(0.69315)?.argument).toBe(2);
    expect(detectNaturalLogarithm(0.69314)?.argument).toBe(2);
  });
  it("should not detect natural logarithm arguments if it's too far off or has too few decimals", () => {
    expect(detectNaturalLogarithm(0.6931)).toBeNull();
    expect(detectNaturalLogarithm(0.69318)).toBeNull();
    expect(detectNaturalLogarithm(0.693147108)).toBeNull();
  });
});
