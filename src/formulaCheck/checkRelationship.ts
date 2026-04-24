import type { Sheet } from "../entities/Sheet";
import type { FormulaRelationship } from "../repositories/aiFormulaRelationshipResults/schema";
import { extractOperands } from "./extractOperands";
import { countDecimals } from "./countDecimals";
import type { PythonRunner, PointScope } from "./pythonRunner";

export type SheetColumnInfo = {
  letter: string;
  name: string;
  isFormula: boolean;
};

export type FailureDetail = {
  rowIndex: number;
  observed: number;
  expected: number | null;
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

const MAX_TOP_FAILURES = 5;

function findColumnIndex(columns: SheetColumnInfo[], letter: string): number {
  const upper = letter.toUpperCase();
  return columns.findIndex((c) => c.letter.toUpperCase() === upper);
}

function computeTolerance(observedValue: number): number {
  const decimals = countDecimals(observedValue);
  const absObserved = Math.abs(observedValue);
  if (
    decimals === 0 &&
    absObserved > 0 &&
    (absObserved < 1e-6 || absObserved >= 1e21)
  ) {
    return absObserved * 1e-6;
  }
  return 0.5 * Math.pow(10, -decimals);
}

export async function checkRelationship(
  sheet: Sheet,
  columns: SheetColumnInfo[],
  relationship: FormulaRelationship,
  python: PythonRunner,
): Promise<CheckResult> {
  const totalRows = sheet.numRows - sheet.firstDataRowIndex;
  const usedOperands = extractOperands(relationship.expression);

  const emptyResult = (skippedRows: number): CheckResult => ({
    resultColumn: relationship.resultColumn,
    expression: relationship.expression,
    usedOperands,
    totalRows,
    passedRows: 0,
    failedRows: 0,
    skippedRows,
    allFailingRowIndices: [],
    topFailures: [],
  });

  const resultColumnIndex = findColumnIndex(columns, relationship.resultColumn);
  if (resultColumnIndex === -1) {
    return emptyResult(totalRows);
  }

  const operandColumnIndices: number[] = [];
  for (const operand of usedOperands) {
    const colIdx = findColumnIndex(columns, operand);
    if (colIdx === -1) {
      return emptyResult(totalRows);
    }
    operandColumnIndices.push(colIdx);
  }

  type RowToEval = {
    rowIndex: number;
    observedValue: number;
    tolerance: number;
  };
  const rowsToEval: RowToEval[] = [];
  const scopes: PointScope[] = [];
  let skipped = 0;

  for (
    let rowIndex = sheet.firstDataRowIndex;
    rowIndex < sheet.numRows;
    rowIndex++
  ) {
    const row = sheet.enhancedMatrix[rowIndex];
    const observedValue = row?.[resultColumnIndex]?.value;
    if (typeof observedValue !== "number" || !Number.isFinite(observedValue)) {
      skipped++;
      continue;
    }

    const scope: PointScope = {};
    let missingOperand = false;
    for (let i = 0; i < usedOperands.length; i++) {
      const value = row?.[operandColumnIndices[i]]?.value;
      if (typeof value !== "number" || !Number.isFinite(value)) {
        missingOperand = true;
        break;
      }
      scope[usedOperands[i]] = value;
    }
    if (missingOperand) {
      skipped++;
      continue;
    }

    rowsToEval.push({
      rowIndex,
      observedValue,
      tolerance: computeTolerance(observedValue),
    });
    scopes.push(scope);
  }

  const [{ values }] = await python.evaluateBatch([
    { expression: relationship.expression, scopes },
  ]);

  let passed = 0;
  let failed = 0;
  const failures: FailureDetail[] = [];

  for (let i = 0; i < rowsToEval.length; i++) {
    const { rowIndex, observedValue, tolerance } = rowsToEval[i];
    const result = values[i];

    if (!result.ok) {
      failed++;
      failures.push({
        rowIndex,
        observed: observedValue,
        expected: null,
        absError: Number.POSITIVE_INFINITY,
        errorMessage: result.error,
      });
    } else if (Math.abs(result.value - observedValue) <= tolerance) {
      passed++;
    } else {
      failed++;
      failures.push({
        rowIndex,
        observed: observedValue,
        expected: result.value,
        absError: Math.abs(result.value - observedValue),
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
    totalRows,
    passedRows: passed,
    failedRows: failed,
    skippedRows: skipped,
    allFailingRowIndices,
    topFailures: failures.slice(0, MAX_TOP_FAILURES),
  };
}
