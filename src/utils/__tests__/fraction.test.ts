import { describe, it, expect } from "@jest/globals";
import {
  detectRepeatingFraction,
  type RepeatingFractionMatch,
} from "../fraction";

describe("detectRepeatingFraction", () => {
  it("should detect repeating fractions", () => {
    const negativeRepeatingFractionResult = {
      denominator: 3,
      numerator: 13,
      numeratorRoundingOffset: expect.any(Number),
    };
    expect(detectRepeatingFraction(-4.33333)).toEqual(
      negativeRepeatingFractionResult,
    );
    expect(detectRepeatingFraction(-4.3333338)).toEqual(
      negativeRepeatingFractionResult,
    );
    const complexRepeatingFractionResult = {
      denominator: 9,
      numerator: 37375,
      numeratorRoundingOffset: expect.any(Number),
    };
    expect(detectRepeatingFraction(4.15277777777778)).toEqual(
      complexRepeatingFractionResult,
    );
    expect(detectRepeatingFraction(4.152777778)).toEqual(
      complexRepeatingFractionResult,
    );
    expect(detectRepeatingFraction(4.15277777772)).toEqual(
      complexRepeatingFractionResult,
    );
    expect(detectRepeatingFraction(1.6667)).toMatchObject({
      numerator: 5,
      denominator: 3,
    });
  });
  it("should not detect numbers that aren't fractions", () => {
    expect(detectRepeatingFraction(123.46)).toBeNull();
    expect(detectRepeatingFraction(14.3332066454532)).toBeNull();
    expect(detectRepeatingFraction(-4.3333388)).toBeNull();
    expect(detectRepeatingFraction(-4.333)).toBeNull();
    expect(detectRepeatingFraction(4.15277778)).toBeNull();
    expect(detectRepeatingFraction(4.15277777722)).toBeNull();
    let detectedRepeatedFraction: RepeatingFractionMatch | null = null;
    for (let i = 16670; i < 16900; i += 1) {
      const value = i / 10000;
      detectedRepeatedFraction = detectRepeatingFraction(value);
      if (detectedRepeatedFraction) {
        break;
      }
    }
    expect(detectedRepeatedFraction).toBeNull();
  });
});
