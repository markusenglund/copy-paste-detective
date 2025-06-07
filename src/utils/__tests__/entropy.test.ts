import { describe, it, expect } from "@jest/globals";
import { calculateNumberEntropy } from "../entropy";

describe("calculateNumberEntropy", () => {
  it("should return 100 for years between 1900-2030", () => {
    expect(calculateNumberEntropy(1900)).toBe(100);
    expect(calculateNumberEntropy(2000)).toBe(100);
    expect(calculateNumberEntropy(2030)).toBe(100);
    expect(calculateNumberEntropy(1999)).toBe(100);
    expect(calculateNumberEntropy(2025)).toBe(100);
  });

  it("should not treat non-integers as years", () => {
    expect(calculateNumberEntropy(2000.5)).not.toBe(100);
    expect(calculateNumberEntropy(1950.1)).not.toBe(100);
  });

  it("should not treat numbers outside year range as years", () => {
    expect(calculateNumberEntropy(1899)).not.toBe(100);
    expect(calculateNumberEntropy(2031)).not.toBe(100);
    expect(calculateNumberEntropy(1800)).not.toBe(100);
    expect(calculateNumberEntropy(2100)).not.toBe(100);
  });

  it("should process decimal numbers by removing decimal point", () => {
    expect(calculateNumberEntropy(123.45)).toBe(1234); // removes trailing 5
    expect(calculateNumberEntropy(1.23)).toBe(123);
    expect(calculateNumberEntropy(0.5)).toBe(0); // removes trailing 5, becomes empty
  });

  it("should remove trailing zeros", () => {
    expect(calculateNumberEntropy(100)).toBe(1);
    expect(calculateNumberEntropy(1000)).toBe(1);
    expect(calculateNumberEntropy(12000)).toBe(12);
    expect(calculateNumberEntropy(123.400)).toBe(1234);
  });

  it("should remove one trailing five", () => {
    expect(calculateNumberEntropy(125)).toBe(12);
    expect(calculateNumberEntropy(555)).toBe(55);
    expect(calculateNumberEntropy(15)).toBe(1);
    expect(calculateNumberEntropy(1235)).toBe(123);
  });

  it("should handle repeating digits (4+ consecutive)", () => {
    expect(calculateNumberEntropy(1111)).toBe(1);
    expect(calculateNumberEntropy(12222)).toBe(12); // 4+ 2s become single 2
    expect(calculateNumberEntropy(123333)).toBe(123); // 4+ 3s become single 3
    expect(calculateNumberEntropy(1234444)).toBe(1234); // 4+ 4s become single 4
    expect(calculateNumberEntropy(11111111)).toBe(1);
  });

  it("should not affect short repeating sequences (3 or fewer)", () => {
    expect(calculateNumberEntropy(111)).toBe(111);
    expect(calculateNumberEntropy(1222)).toBe(1222);
    expect(calculateNumberEntropy(12333)).toBe(12333);
  });

  it("should handle edge cases", () => {
    expect(calculateNumberEntropy(0)).toBe(0);
    expect(calculateNumberEntropy(1)).toBe(1);
    expect(calculateNumberEntropy(5)).toBe(0); // removes trailing 5, becomes empty string
  });

  it("should handle complex combinations", () => {
    // Decimal with trailing zeros and fives
    expect(calculateNumberEntropy(123.4500)).toBe(1234); // removes .45 -> 1234500, removes 00 -> 12345, removes 5 -> 1234
    
    // Repeating digits with trailing zeros
    expect(calculateNumberEntropy(1222200)).toBe(12); // removes 00 -> 12222, 4+ 2s -> 12
    
    // Year-like numbers that are decimals (but JS treats 2000.0 as integer)
    expect(calculateNumberEntropy(2000.0)).toBe(100); // treated as year since 2000.0 is integer
    expect(calculateNumberEntropy(2000.1)).toBe(20001); // not integer, so processed normally
  });
});