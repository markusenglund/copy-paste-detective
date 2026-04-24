import type { Sheet } from "../entities/Sheet";
import type { FormulaRelationship } from "../repositories/aiFormulaRelationshipResults/schema";
import type {
  IdentifyFormulaRelationshipsParams,
  IdentifyFormulaRelationshipsResponse,
} from "../ai/useCases/identifyFormulaRelationships";
import { revisitFormulaRelationshipsWithCache } from "../ai/useCases/revisitFormulaRelationships";
import {
  checkRelationship,
  type CheckResult,
  type SheetColumnInfo,
} from "./checkRelationship";
import type { PythonRunner } from "./pythonRunner";

export type RelationshipLoopCallbacks = {
  onAttemptStart?: (attempt: number, toCheck: FormulaRelationship[]) => void;
  beforeCheck?: (rel: FormulaRelationship) => void;
  afterCheck?: (rel: FormulaRelationship, result: CheckResult) => void;
  onAllConfirmed?: () => void;
  onMaxRetriesReached?: (unconfirmedCount: number) => void;
  onRevisitStart?: (unconfirmedCount: number) => void;
  onRevisitDone?: (
    response: IdentifyFormulaRelationshipsResponse,
    durationMs: number,
  ) => void;
};

export type RunRelationshipLoopArgs = {
  initialAiResponse: IdentifyFormulaRelationshipsResponse;
  originalParams: IdentifyFormulaRelationshipsParams;
  sheet: Sheet;
  columns: SheetColumnInfo[];
  python: PythonRunner;
  datasetId?: number;
  datasetFileId?: number;
  maxRetries: number;
  callbacks?: RelationshipLoopCallbacks;
};

export type RelationshipLoopResult = {
  finalRelationships: FormulaRelationship[];
  finalAiResponse: IdentifyFormulaRelationshipsResponse;
  confirmedColumns: Set<string>;
  checkResultsByColumn: Map<string, CheckResult>;
  triedExpressionsByColumn: Map<string, string[]>;
};

export async function runRelationshipLoop(
  args: RunRelationshipLoopArgs,
): Promise<RelationshipLoopResult> {
  const {
    initialAiResponse,
    originalParams,
    sheet,
    columns,
    python,
    datasetId,
    datasetFileId,
    maxRetries,
    callbacks,
  } = args;

  let currentRelationships = initialAiResponse.relationships;
  let priorAiResponse = initialAiResponse;
  const confirmedColumns = new Set<string>();
  const checkResultsByColumn = new Map<string, CheckResult>();
  const triedExpressionsByColumn = new Map<string, string[]>();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const toCheck = currentRelationships.filter(
      (r) => !confirmedColumns.has(r.resultColumn),
    );
    callbacks?.onAttemptStart?.(attempt, toCheck);

    for (const rel of toCheck) {
      callbacks?.beforeCheck?.(rel);
      triedExpressionsByColumn.set(rel.resultColumn, [
        ...(triedExpressionsByColumn.get(rel.resultColumn) ?? []),
        rel.expression,
      ]);
      const result = await checkRelationship(sheet, columns, rel, python);
      checkResultsByColumn.set(rel.resultColumn, result);
      if (result.passedRows > 0 && result.failedRows === 0) {
        confirmedColumns.add(rel.resultColumn);
      }
      callbacks?.afterCheck?.(rel, result);
    }

    const stillUnconfirmed = currentRelationships.filter(
      (r) => !confirmedColumns.has(r.resultColumn),
    );

    if (stillUnconfirmed.length === 0) {
      callbacks?.onAllConfirmed?.();
      break;
    }
    if (attempt === maxRetries) {
      callbacks?.onMaxRetriesReached?.(stillUnconfirmed.length);
      break;
    }

    callbacks?.onRevisitStart?.(stillUnconfirmed.length);
    const revisitStart = Date.now();
    const revisit = await revisitFormulaRelationshipsWithCache({
      originalParams,
      priorResponse: priorAiResponse,
      checkResultsByColumn,
      confirmedColumns,
      triedExpressionsByColumn,
      datasetId,
      datasetFileId,
      sheet,
      columns,
    });
    callbacks?.onRevisitDone?.(revisit, Date.now() - revisitStart);

    priorAiResponse = revisit;
    currentRelationships = [
      ...currentRelationships.filter((r) =>
        confirmedColumns.has(r.resultColumn),
      ),
      ...revisit.relationships.filter(
        (r) => !confirmedColumns.has(r.resultColumn),
      ),
    ];
  }

  return {
    finalRelationships: currentRelationships,
    finalAiResponse: priorAiResponse,
    confirmedColumns,
    checkResultsByColumn,
    triedExpressionsByColumn,
  };
}
