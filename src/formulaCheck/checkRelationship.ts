import type { Sheet } from "../entities/Sheet";
import type { FormulaRelationship } from "../repositories/aiFormulaRelationshipResults/schema";
import {
  cellInterval,
  intervalGap,
  intervalsOverlap,
  type Interval,
} from "./intervalCheck";
import { extractOperands, generateCorners } from "./cornerGeneration";
import type { PythonRunner, PointScope, PointValue } from "./pythonRunner";

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
  allFailingRowIndices: number[];
  topFailures: FailureDetail[];
};

type RowSnapshot = {
  rowIndex: number;
  intervals: Record<string, Interval>;
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
    const intervals: Record<string, Interval> = {};
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

function aggregateCornerValues(
  cornerValues: PointValue[],
): { ok: true; min: number; max: number } | { ok: false; error: string } {
  const nums: number[] = [];
  for (const v of cornerValues) {
    if (!v.ok) return v;
    nums.push(v.value);
  }
  return { ok: true, min: Math.min(...nums), max: Math.max(...nums) };
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

  const usedOperands = extractOperands(relationship.expression);
  const snapshots = collectRowSnapshots(sheet, columns, resultColumnIndex);

  type EvalRow = { snapshotIdx: number; cornerCount: number };
  const evalRows: EvalRow[] = [];
  const allScopes: PointScope[] = [];

  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];
    if (snapshot.observedInterval === null) continue;
    if (usedOperands.some((op) => !(op in snapshot.intervals))) continue;
    const corners = generateCorners(usedOperands, snapshot.intervals, i);
    evalRows.push({ snapshotIdx: i, cornerCount: corners.length });
    allScopes.push(...corners);
  }

  const [{ values }] = await python.evaluateBatch([
    { expression: relationship.expression, scopes: allScopes },
  ]);

  let passed = 0;
  let failed = 0;
  let skipped =
    snapshots.length -
    evalRows.reduce((sum, r) => sum + (r.cornerCount > 0 ? 1 : 0), 0);
  const failures: FailureDetail[] = [];

  let offset = 0;
  for (const evalRow of evalRows) {
    const snapshot = snapshots[evalRow.snapshotIdx];
    const cornerValues = values.slice(offset, offset + evalRow.cornerCount);
    offset += evalRow.cornerCount;

    const rowResult = aggregateCornerValues(cornerValues);

    if (!rowResult.ok) {
      failed++;
      failures.push({
        rowIndex: snapshot.rowIndex,
        observed: snapshot.observedValue!,
        observedMin: snapshot.observedInterval![0],
        observedMax: snapshot.observedInterval![1],
        expectedMin: Number.NaN,
        expectedMax: Number.NaN,
        absError: Number.POSITIVE_INFINITY,
        errorMessage: rowResult.error,
      });
      continue;
    }

    const expectedInterval: Interval = [rowResult.min, rowResult.max];
    if (intervalsOverlap(expectedInterval, snapshot.observedInterval!)) {
      passed++;
    } else {
      failed++;
      failures.push({
        rowIndex: snapshot.rowIndex,
        observed: snapshot.observedValue!,
        observedMin: snapshot.observedInterval![0],
        observedMax: snapshot.observedInterval![1],
        expectedMin: rowResult.min,
        expectedMax: rowResult.max,
        absError: intervalGap(expectedInterval, snapshot.observedInterval!),
      });
    }
  }

  const allFailingRowIndices = failures
    .map((f) => f.rowIndex)
    .sort((a, b) => a - b);

  failures.sort((a, b) => b.absError - a.absError);

  return {
    resultColumn: relationship.resultColumn,
    expression: relationship.expression,
    usedOperands,
    totalRows: snapshots.length,
    passedRows: passed,
    failedRows: failed,
    skippedRows: skipped,
    allFailingRowIndices,
    topFailures: failures.slice(0, MAX_TOP_FAILURES),
  };
}
