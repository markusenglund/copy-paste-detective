import { describe, expect, it } from "@jest/globals";
import { validatePdfMagicBytes } from "../downloadPdf";

describe("validatePdfMagicBytes", () => {
  it("should return true for valid PDF bytes", () => {
    // PDF magic bytes: %PDF- followed by version
    const validPdfBytes = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34,
    ]);
    expect(validatePdfMagicBytes(validPdfBytes)).toBe(true);
  });

  it("should return true for valid PDF bytes with minimal length", () => {
    // Exactly the magic bytes
    const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(validatePdfMagicBytes(validPdfBytes)).toBe(true);
  });

  it("should return false for invalid bytes (HTML)", () => {
    // HTML: <html>
    const htmlBytes = new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c]);
    expect(validatePdfMagicBytes(htmlBytes)).toBe(false);
  });

  it("should return false for too short byte array", () => {
    const shortBytes = new Uint8Array([0x25, 0x50]);
    expect(validatePdfMagicBytes(shortBytes)).toBe(false);
  });

  it("should return false for empty array", () => {
    const emptyBytes = new Uint8Array([]);
    expect(validatePdfMagicBytes(emptyBytes)).toBe(false);
  });

  it("should return false for bytes that start correctly but are incomplete", () => {
    const incompleteBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    expect(validatePdfMagicBytes(incompleteBytes)).toBe(false);
  });

  it("should return false for bytes that almost match", () => {
    // %PDE- instead of %PDF-
    const almostBytes = new Uint8Array([0x25, 0x50, 0x44, 0x45, 0x2d]);
    expect(validatePdfMagicBytes(almostBytes)).toBe(false);
  });
});
