import { describe, it, expect } from "@jest/globals";
import xlsx from "xlsx";
import { Sheet } from "../../entities/Sheet";
import { checkRelationship, type SheetColumnInfo } from "../checkRelationship";
import type {
  EvaluateResult,
  PythonRunner,
  RowIntervals,
  RowResult,
} from "../pythonRunner";

type MockEvaluator = (
  expression: string,
  rows: RowIntervals[],
) => EvaluateResult;

function mockPython(evaluator: MockEvaluator): PythonRunner {
  return {
    evaluate: async (expression: string, rows: RowIntervals[]) =>
      evaluator(expression, rows),
    shutdown: async () => {},
  } as unknown as PythonRunner;
}

function createSheet(data: (string | number | null)[][]): Sheet {
  const worksheet = xlsx.utils.aoa_to_sheet(data);
  return new Sheet(worksheet, "Test", "test.xlsx");
}

function columnsFor(sheet: Sheet): SheetColumnInfo[] {
  return sheet.columnNames.map((name, idx) => ({
    letter: xlsx.utils.encode_col(idx),
    name,
    isFormula: false,
  }));
}

// Evaluates A / (B * B) over each row's 4 interval corners.
const bmiEvaluator: MockEvaluator = (_expression, rows) => {
  const results: RowResult[] = rows.map((row) => {
    const a = row.A;
    const b = row.B;
    if (!a || !b) {
      return { ok: false, error: "missing operand" };
    }
    const corners: number[] = [];
    for (const av of [a[0], a[1]]) {
      for (const bv of [b[0], b[1]]) {
        if (bv === 0) {
          return { ok: false, error: "ZeroDivisionError" };
        }
        corners.push(av / (bv * bv));
      }
    }
    return { ok: true, min: Math.min(...corners), max: Math.max(...corners) };
  });
  return { usedOperands: ["A", "B"], results };
};

describe("checkRelationship", () => {
  it("reports all rows as passing when the relationship holds exactly", async () => {
    const sheet = createSheet([
      ["A", "B", "C"],
      [64, 1.6, 25],
      [81, 1.8, 25],
      [100, 2, 25],
    ]);
    const columns = columnsFor(sheet);
    const python = mockPython(bmiEvaluator);

    const result = await checkRelationship(
      sheet,
      columns,
      { resultColumn: "C", expression: "A / (B * B)", description: "BMI" },
      python,
    );

    expect(result.totalRows).toBe(3);
    expect(result.passedRows).toBe(3);
    expect(result.failedRows).toBe(0);
    expect(result.skippedRows).toBe(0);
    expect(result.topFailures).toHaveLength(0);
    expect(result.usedOperands).toEqual(["A", "B"]);
  });

  it("reports rows outside tolerance as failures with absError", async () => {
    const sheet = createSheet([
      ["A", "B", "C"],
      [64, 1.6, 25], // pass
      [81, 1.8, 25], // pass
      [100, 2, 50], // fail: expected 25, got 50
    ]);
    const columns = columnsFor(sheet);
    const python = mockPython(bmiEvaluator);

    const result = await checkRelationship(
      sheet,
      columns,
      { resultColumn: "C", expression: "A / (B * B)", description: "BMI" },
      python,
    );

    expect(result.passedRows).toBe(2);
    expect(result.failedRows).toBe(1);
    expect(result.topFailures).toHaveLength(1);
    expect(result.topFailures[0].observed).toBe(50);
    expect(result.topFailures[0].absError).toBeGreaterThan(0);
  });

  it("skips rows where the result cell is non-numeric", async () => {
    const sheet = createSheet([
      ["A", "B", "C"],
      [64, 1.6, 25],
      [81, 1.8, "missing"],
      [100, 2, 25],
    ]);
    const columns = columnsFor(sheet);
    const python = mockPython(bmiEvaluator);

    const result = await checkRelationship(
      sheet,
      columns,
      { resultColumn: "C", expression: "A / (B * B)", description: "BMI" },
      python,
    );

    expect(result.totalRows).toBe(3);
    expect(result.skippedRows).toBe(1);
    expect(result.passedRows).toBe(2);
    expect(result.failedRows).toBe(0);
  });

  it("skips rows where an operand cell is missing", async () => {
    const sheet = createSheet([
      ["A", "B", "C"],
      [64, 1.6, 25],
      [null, 1.8, 25],
      [100, 2, 25],
    ]);
    const columns = columnsFor(sheet);
    const python = mockPython(bmiEvaluator);

    const result = await checkRelationship(
      sheet,
      columns,
      { resultColumn: "C", expression: "A / (B * B)", description: "BMI" },
      python,
    );

    expect(result.skippedRows).toBe(1);
    expect(result.passedRows).toBe(2);
    expect(result.failedRows).toBe(0);
  });

  it("counts rows where the Python evaluation errored as failures", async () => {
    const sheet = createSheet([
      ["A", "B", "C"],
      [64, 1.6, 25],
      [81, 1.8, 25],
      [100, 2, 25],
    ]);
    const columns = columnsFor(sheet);
    const python = mockPython((expression, rows) => {
      const base = bmiEvaluator(expression, rows);
      return {
        usedOperands: base.usedOperands,
        results: base.results.map((r, i) =>
          i === 1 ? { ok: false, error: "ZeroDivisionError: by zero" } : r,
        ),
      };
    });

    const result = await checkRelationship(
      sheet,
      columns,
      { resultColumn: "C", expression: "A / (B * B)", description: "BMI" },
      python,
    );

    expect(result.passedRows).toBe(2);
    expect(result.failedRows).toBe(1);
    expect(result.topFailures[0].errorMessage).toContain("ZeroDivisionError");
  });
});
