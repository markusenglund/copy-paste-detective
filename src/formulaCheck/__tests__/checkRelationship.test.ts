import { describe, it, expect } from "@jest/globals";
import xlsx from "xlsx";
import { Sheet } from "../../entities/Sheet";
import { checkRelationship, type SheetColumnInfo } from "../checkRelationship";
import type { PythonRunner, BatchItem, BatchResult } from "../pythonRunner";

function mockPython(
  evaluator: (items: BatchItem[]) => BatchResult[],
): PythonRunner {
  return {
    evaluateBatch: async (items: BatchItem[]) => evaluator(items),
    shutdown: async () => {},
  } as unknown as PythonRunner;
}

// Evaluates A / (B * B) at each point scope
function bmiEvaluator(items: BatchItem[]): BatchResult[] {
  return items.map(({ scopes }) => ({
    values: scopes.map((scope) => {
      const a = scope.A ?? 0;
      const b = scope.B ?? 0;
      if (b === 0)
        return {
          ok: false as const,
          error: "ZeroDivisionError: division by zero",
        };
      return { ok: true as const, value: a / (b * b) };
    }),
  }));
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
      [100, 2, 50], // fail: expected ~25, got 50
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

  it("counts rows where Python evaluation errors as failures", async () => {
    const sheet = createSheet([
      ["A", "B", "C"],
      [64, 1.6, 25], // pass
      [81, 1.8, 25], // will be forced to error
      [100, 2, 25], // pass
    ]);
    const columns = columnsFor(sheet);

    const python = mockPython((items) =>
      items.map(({ scopes }) => ({
        values: scopes.map((scope) => {
          const a = scope.A ?? 0;
          if (a === 81) {
            return { ok: false as const, error: "ZeroDivisionError: by zero" };
          }
          const b = scope.B ?? 1;
          return { ok: true as const, value: a / (b * b) };
        }),
      })),
    );

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
