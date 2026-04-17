import type { Sheet } from "../entities/Sheet";
import type { FormulaRelationship } from "../repositories/aiFormulaRelationshipResults/schema";
import {
  cellInterval,
  intervalGap,
  intervalsOverlap,
  type Interval,
} from "./intervalCheck";
import type { PythonRunner, RowIntervals } from "./pythonRunner";

export type SheetColumnInfo = {
  letter: string;
  name: string;
  isFormula: boolean;
};

export type FailureDetail = {
  rowIndex: number;
  observed: number;
  observedMin: number;
  observedMax: number;
  expectedMin: number;
  expectedMax: number;
  absError: number;
  errorMessage?: string;
};

export type CheckResult = {
  resultColumn: string;
  expression: string;
  usedOperands: string[];
  totalRows: number;
  passedRows: number;
  failedRows: number;
  skippedRows: number;
  topFailures: FailureDetail[];
};

type RowSnapshot = {
  rowIndex: number;
  intervals: RowIntervals;
  observedValue: number | null;
  observedInterval: Interval | null;
};

const MAX_TOP_FAILURES = 5;

function collectRowSnapshots(
  sheet: Sheet,
  columns: SheetColumnInfo[],
  resultColumnIndex: number,
): RowSnapshot[] {
  const snapshots: RowSnapshot[] = [];

  for (
    let rowIndex = sheet.firstDataRowIndex;
    rowIndex < sheet.numRows;
    rowIndex++
  ) {
    const intervals: RowIntervals = {};
    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      const cell = sheet.enhancedMatrix[rowIndex]?.[colIdx];
      const value = cell?.value;
      if (typeof value === "number" && Number.isFinite(value)) {
        intervals[columns[colIdx].letter] = cellInterval(value);
      }
    }

    const resultCell = sheet.enhancedMatrix[rowIndex]?.[resultColumnIndex];
    const resultValue = resultCell?.value;
    const hasNumericResult =
      typeof resultValue === "number" && Number.isFinite(resultValue);

    snapshots.push({
      rowIndex,
      intervals,
      observedValue: hasNumericResult ? resultValue : null,
      observedInterval: hasNumericResult ? cellInterval(resultValue) : null,
    });
  }

  return snapshots;
}

export async function checkRelationship(
  sheet: Sheet,
  columns: SheetColumnInfo[],
  relationship: FormulaRelationship,
  python: PythonRunner,
): Promise<CheckResult> {
  const resultColumnIndex = columns.findIndex(
    (col) =>
      col.letter.toUpperCase() === relationship.resultColumn.toUpperCase(),
  );
  if (resultColumnIndex === -1) {
    throw new Error(
      `result column ${relationship.resultColumn} not found in sheet`,
    );
  }

  const snapshots = collectRowSnapshots(sheet, columns, resultColumnIndex);
  const { usedOperands, results } = await python.evaluate(
    relationship.expression,
    snapshots.map((s) => s.intervals),
  );

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const failures: FailureDetail[] = [];

  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];
    const pythonResult = results[i];

    if (snapshot.observedInterval === null || snapshot.observedValue === null) {
      skipped++;
      continue;
    }

    const missingOperand = usedOperands.some(
      (op) => !(op in snapshot.intervals),
    );
    if (missingOperand) {
      skipped++;
      continue;
    }

    if (!pythonResult.ok) {
      failed++;
      failures.push({
        rowIndex: snapshot.rowIndex,
        observed: snapshot.observedValue,
        observedMin: snapshot.observedInterval[0],
        observedMax: snapshot.observedInterval[1],
        expectedMin: Number.NaN,
        expectedMax: Number.NaN,
        absError: Number.POSITIVE_INFINITY,
        errorMessage: pythonResult.error,
      });
      continue;
    }

    const expectedInterval: Interval = [pythonResult.min, pythonResult.max];
    if (intervalsOverlap(expectedInterval, snapshot.observedInterval)) {
      passed++;
    } else {
      failed++;
      failures.push({
        rowIndex: snapshot.rowIndex,
        observed: snapshot.observedValue,
        observedMin: snapshot.observedInterval[0],
        observedMax: snapshot.observedInterval[1],
        expectedMin: pythonResult.min,
        expectedMax: pythonResult.max,
        absError: intervalGap(expectedInterval, snapshot.observedInterval),
      });
    }
  }

  failures.sort((a, b) => b.absError - a.absError);

  return {
    resultColumn: relationship.resultColumn,
    expression: relationship.expression,
    usedOperands,
    totalRows: snapshots.length,
    passedRows: passed,
    failedRows: failed,
    skippedRows: skipped,
    topFailures: failures.slice(0, MAX_TOP_FAILURES),
  };
}
