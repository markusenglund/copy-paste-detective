import { describe, it, expect } from "@jest/globals";
import { detectNaturalLogarithm } from "../logarithm";

describe("detectNaturalLogarithm", () => {
  it("should detect natural logarithm arguments", () => {
    expect(detectNaturalLogarithm(0.693147181)?.argument).toBe(2);
    expect(detectNaturalLogarithm(0.69315)?.argument).toBe(2);
    expect(detectNaturalLogarithm(0.69314)?.argument).toBe(2);
    expect(detectNaturalLogarithm(2.23001440015921)?.argument).toBe(9.3);
    expect(detectNaturalLogarithm(2.2300144)?.argument).toBe(9.3);
    expect(detectNaturalLogarithm(2.74297323089144)?.argument).toBe(15.5331);
  });
  it("should not detect natural logarithm arguments if it's too far off or has too few decimals", () => {
    expect(detectNaturalLogarithm(0.6931)).toBeNull();
    expect(detectNaturalLogarithm(0.69318)).toBeNull();
    expect(detectNaturalLogarithm(0.693147108)).toBeNull();
    expect(detectNaturalLogarithm(2.23002)).toBeNull();
    expect(detectNaturalLogarithm(2.7429732)).toBeNull();
  });
});
