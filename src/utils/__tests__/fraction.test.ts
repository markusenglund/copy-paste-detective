import { describe, it, expect } from "@jest/globals";
import { detectRepeatingFraction } from "../fraction";

describe("detectRepeatingFraction", () => {
  it("should not detect numbers that aren't fractions", () => {
    expect(detectRepeatingFraction(123.46)).toBeNull();
    expect(detectRepeatingFraction(14.3332066454532)).toBeNull();
  });
});
