import { z } from "zod";
import { createHash } from "crypto";
import {
  generatePrompt,
  type IdentifyFormulaRelationshipsParams,
  type IdentifyFormulaRelationshipsResponse,
} from "./identifyFormulaRelationships";
import type { FormulaRelationship } from "../../repositories/aiFormulaRelationshipResults/schema";
import {
  findByHash,
  insertResult,
} from "../../repositories/aiFormulaRelationshipResults/aiFormulaRelationshipResultsRepository";
import { getProvider, getUseCaseConfig } from "../aiConfig";
import type { CheckResult } from "../../formulaCheck/checkRelationship";
import type { SheetColumnInfo } from "../../formulaCheck/checkRelationship";
import type { Sheet } from "../../entities/Sheet";
import { logger } from "../../utils/logger";

const relationshipSchema = z.object({
  resultColumn: z.string(),
  expression: z.string(),
  description: z.string(),
});

const responseSchema = z.object({
  explanation: z.string(),
  relationships: z.array(relationshipSchema),
});

export type RevisitFormulaRelationshipsParams = {
  originalParams: IdentifyFormulaRelationshipsParams;
  priorResponse: IdentifyFormulaRelationshipsResponse;
  checkResultsByColumn: Map<string, CheckResult>;
  confirmedColumns: Set<string>;
  triedExpressionsByColumn: Map<string, string[]>;
  datasetId?: number;
  datasetFileId?: number;
  sheet: Sheet;
  columns: SheetColumnInfo[];
};

function formatFailingRowsTable(
  sheet: Sheet,
  columns: SheetColumnInfo[],
  checkResult: CheckResult,
): string {
  if (checkResult.topFailures.length === 0) return "";

  const namedColumns = columns.filter((c) => c.name.trim() !== "");
  const headers = [
    "Row",
    ...namedColumns.map((c) => c.letter),
    "Observed",
    "Formula computed",
  ];
  const separator = headers.map(() => "---");

  const dataRows = checkResult.topFailures.map((failure) => {
    const rowCells = sheet.enhancedMatrix[failure.rowIndex] ?? [];
    const cellValues: string[] = [];
    columns.forEach((col, colIdx) => {
      if (col.name.trim() === "") return;
      cellValues.push(String(rowCells[colIdx]?.value ?? ""));
    });

    const formulaComputed =
      failure.expected === null
        ? `eval error: ${failure.errorMessage ?? "unknown"}`
        : String(failure.expected);

    return [
      String(failure.rowIndex + 1),
      ...cellValues,
      String(failure.observed),
      formulaComputed,
    ];
  });

  return [headers, separator, ...dataRows]
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");
}

function buildFeedbackSection(
  priorRelationships: FormulaRelationship[],
  checkResultsByColumn: Map<string, CheckResult>,
  confirmedColumns: Set<string>,
  triedExpressionsByColumn: Map<string, string[]>,
  sheet: Sheet,
  columns: SheetColumnInfo[],
): string {
  const lines: string[] = [
    "The software has validated your proposed formulas against all data rows. Here are the results:",
    "",
  ];

  for (const rel of priorRelationships) {
    const checkResult = checkResultsByColumn.get(rel.resultColumn);
    if (!checkResult) continue;

    if (confirmedColumns.has(rel.resultColumn)) {
      lines.push(
        `✓ Formula ${rel.resultColumn} = ${rel.expression}: all ${checkResult.passedRows} rows pass.`,
      );
    } else if (checkResult.passedRows === 0 && checkResult.failedRows > 0) {
      lines.push(
        `✗ Formula ${rel.resultColumn} = ${rel.expression}: all ${checkResult.failedRows} rows failed. Failing rows (showing top ${checkResult.topFailures.length}):`,
      );
      lines.push("");
      lines.push(formatFailingRowsTable(sheet, columns, checkResult));
    } else {
      lines.push(
        `~ Formula ${rel.resultColumn} = ${rel.expression}: ${checkResult.passedRows} rows pass, ${checkResult.failedRows} rows fail.`,
      );
    }

    const tried = triedExpressionsByColumn.get(rel.resultColumn) ?? [];
    if (tried.length > 0) {
      lines.push(
        `Previously tried expressions for column ${rel.resultColumn}: ${tried.map((e) => `"${e}"`).join(", ")}`,
      );
    }
    lines.push("");
  }

  lines.push(
    "Return an updated list of all formula relationships you believe hold.",
    '- Do not re-propose expressions listed under "Previously tried expressions".',
    "- Omit any relationship you are no longer confident about.",
    "- Confirmed formulas do not need to be included — they will be retained automatically.",
  );

  return lines.join("\n");
}

function buildRevisitPrompt(params: RevisitFormulaRelationshipsParams): string {
  const turn1 = generatePrompt(params.originalParams);
  const turn2Prior = JSON.stringify(
    {
      explanation: params.priorResponse.explanation,
      relationships: params.priorResponse.relationships,
    },
    null,
    2,
  );
  const turn2 = `Your previous response was:\n\`\`\`json\n${turn2Prior}\n\`\`\``;
  const turn3 = buildFeedbackSection(
    params.priorResponse.relationships,
    params.checkResultsByColumn,
    params.confirmedColumns,
    params.triedExpressionsByColumn,
    params.sheet,
    params.columns,
  );

  return `${turn1}\n\n---\n\n${turn2}\n\n---\n\n${turn3}`;
}

function buildHashInput(prompt: string): object {
  const config = getUseCaseConfig("identifyFormulaRelationships");
  return {
    model: config.model,
    contents: prompt,
    config: {
      temperature: config.temperature,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(responseSchema),
    },
  };
}

export async function revisitFormulaRelationshipsWithCache(
  params: RevisitFormulaRelationshipsParams,
): Promise<IdentifyFormulaRelationshipsResponse> {
  const prompt = buildRevisitPrompt(params);

  const hashInput = buildHashInput(prompt);
  const hash = createHash("md5")
    .update(JSON.stringify(hashInput))
    .digest("hex");

  const canCache = params.datasetId != null && params.datasetFileId != null;

  if (canCache) {
    const cached = await findByHash(hash);
    if (cached) {
      logger.info("Found cached AI revisit result");
      return {
        explanation: cached.explanation ?? "",
        relationships: cached.relationships,
      };
    }
  }

  const config = getUseCaseConfig("identifyFormulaRelationships");
  const provider = getProvider("identifyFormulaRelationships");
  const rawResult =
    await provider.generateText<IdentifyFormulaRelationshipsResponse>({
      model: config.model,
      prompt,
      temperature: config.temperature,
      responseSchema,
    });

  const result: IdentifyFormulaRelationshipsResponse = {
    explanation: rawResult.explanation,
    relationships: rawResult.relationships,
  };

  if (canCache) {
    await insertResult({
      datasetId: params.datasetId,
      datasetFileId: params.datasetFileId,
      sheetName: params.originalParams.sheetName,
      prompt,
      model: config.model,
      explanation: result.explanation,
      relationships: result.relationships,
      hash,
    });
  }

  return result;
}
