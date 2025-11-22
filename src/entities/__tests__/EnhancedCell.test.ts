import { describe, it, expect } from "@jest/globals";
import { EnhancedCell } from "../EnhancedCell";
import xlsx from "xlsx";

describe("EnhancedCell.isDate", () => {
  it("should return false when originalCell is null", () => {
    const cell = new EnhancedCell(null, 0, 0);
    expect(cell.isDate).toBe(false);
  });

  it("should return true when cell type is explicitly date (t === 'd')", () => {
    const cellObject: xlsx.CellObject = {
      t: "d",
      v: new Date("2023-04-15"),
      w: "4/15/2023",
    };
    const cell = new EnhancedCell(cellObject, 0, 0);
    expect(cell.isDate).toBe(true);
  });

  describe("numeric cells with date patterns", () => {
    it("should return true for MM/DD/YYYY format", () => {
      const cellObject: xlsx.CellObject = {
        t: "n",
        v: 45000, // Excel date serial number
        w: "04/15/2023",
      };
      const cell = new EnhancedCell(cellObject, 0, 0);
      expect(cell.isDate).toBe(true);
    });

    it("should return true for M/D/YYYY format", () => {
      const cellObject: xlsx.CellObject = {
        t: "n",
        v: 45000,
        w: "4/15/2023",
      };
      const cell = new EnhancedCell(cellObject, 0, 0);
      expect(cell.isDate).toBe(true);
    });

    it("should return true for MM/DD/YY format", () => {
      const cellObject: xlsx.CellObject = {
        t: "n",
        v: 45000,
        w: "04/15/23",
      };
      const cell = new EnhancedCell(cellObject, 0, 0);
      expect(cell.isDate).toBe(true);
    });

    it("should return true for M/D/YY format", () => {
      const cellObject: xlsx.CellObject = {
        t: "n",
        v: 45000,
        w: "4/5/23",
      };
      const cell = new EnhancedCell(cellObject, 0, 0);
      expect(cell.isDate).toBe(true);
    });

    it("should return true for Apr-2023 format", () => {
      const cellObject: xlsx.CellObject = {
        t: "n",
        v: 45000,
        w: "Apr-2023",
      };
      const cell = new EnhancedCell(cellObject, 0, 0);
      expect(cell.isDate).toBe(true);
    });

    it("should return true for lowercase month abbreviation (apr-2023)", () => {
      const cellObject: xlsx.CellObject = {
        t: "n",
        v: 45000,
        w: "apr-2023",
      };
      const cell = new EnhancedCell(cellObject, 0, 0);
      expect(cell.isDate).toBe(true);
    });

    it("should return true for different month abbreviations", () => {
      const months = [
        "Jan-2023",
        "Feb-2023",
        "Mar-2023",
        "Apr-2023",
        "May-2023",
        "Jun-2023",
        "Jul-2023",
        "Aug-2023",
        "Sep-2023",
        "Oct-2023",
        "Nov-2023",
        "Dec-2023",
      ];

      months.forEach((month) => {
        const cellObject: xlsx.CellObject = {
          t: "n",
          v: 45000,
          w: month,
        };
        const cell = new EnhancedCell(cellObject, 0, 0);
        expect(cell.isDate).toBe(true);
      });
    });

    it("should return false for numeric cell without formatted value", () => {
      const cellObject: xlsx.CellObject = {
        t: "n",
        v: 12345,
      };
      const cell = new EnhancedCell(cellObject, 0, 0);
      expect(cell.isDate).toBe(false);
    });

    it("should return false for numeric cell with non-date formatted value", () => {
      const cellObject: xlsx.CellObject = {
        t: "n",
        v: 12345,
        w: "12,345.00",
      };
      const cell = new EnhancedCell(cellObject, 0, 0);
      expect(cell.isDate).toBe(false);
    });

    it("should return false for string cell type", () => {
      const cellObject: xlsx.CellObject = {
        t: "s",
        v: "04/15/2023",
        w: "04/15/2023",
      };
      const cell = new EnhancedCell(cellObject, 0, 0);
      expect(cell.isDate).toBe(false);
    });
  });
});
