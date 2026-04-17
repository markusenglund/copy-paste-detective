import { z } from "zod";
import { createHash } from "crypto";
import { markdownTable } from "markdown-table";
import {
  findByHash as findFormulaRelationshipsByHash,
  insertResult as insertFormulaRelationshipsResult,
} from "../../repositories/aiFormulaRelationshipResults/aiFormulaRelationshipResultsRepository";
import {
  type FormulaRelationship,
  type AiFormulaRelationshipResultRow,
} from "../../repositories/aiFormulaRelationshipResults/schema";
import { getProvider, getUseCaseConfig } from "../aiConfig";
import { logger } from "../../utils/logger";

const relationshipSchema = z.object({
  resultColumn: z.string(),
  expression: z.string(),
  description: z.string(),
});

const responseSchema = z.object({
  relationships: z.array(relationshipSchema),
});

export type IdentifyFormulaRelationshipsResponse = z.infer<
  typeof responseSchema
>;

export type IdentifyFormulaRelationshipsParams = {
  excelFileName: string;
  sheetName: string;
  columns: Array<{ letter: string; name: string; isFormula: boolean }>;
  sampleRows: string[][];
  datasetId?: number;
  datasetFileId?: number;
};

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function generatePrompt(
  params: IdentifyFormulaRelationshipsParams,
): string {
  const columnDescriptions = params.columns.map((col) => {
    const label = col.isFormula ? `${col.letter} [FORMULA]` : col.letter;
    const name = col.name.trim() === "" ? "(empty header)" : col.name;
    return `- ${label} (${name})`;
  });

  const sampleRows = params.sampleRows.slice(0, 5);
  const tableRows = [
    params.columns.map((col) => col.letter),
    ...sampleRows.map((row) => row.map((cell) => escapeCell(cell))),
  ];
  const sampleTable = markdownTable(tableRows);

  return `You are analyzing an Excel sheet to identify mathematical relationships between columns.

Find implicit formulas where one result column can be computed row-by-row from other columns.

Important rules:
- Only include relationships where resultColumn is a non-formula column.
- Never return a [FORMULA] column as resultColumn.
- Operand columns in expression may be formula columns.
- Use only Excel column letters in expression (for example: A + B, A / (B * B)).
- Focus on row-level arithmetic relationships, not correlations.
- Return valid JSON only in the required schema.

File: ${params.excelFileName}
Sheet: ${params.sheetName}

Columns:
${columnDescriptions.join("\n")}

Sample rows (5 rows max):
${sampleTable}

Output schema:
{
  "relationships": [
    {
      "resultColumn": "C",
      "expression": "A / (B * B)",
      "description": "BMI is calculated from weight and height"
    }
  ]
}`;
}

function normalizeRelationship(
  relationship: FormulaRelationship,
): FormulaRelationship {
  return {
    resultColumn: relationship.resultColumn.trim().toUpperCase(),
    expression: relationship.expression.trim(),
    description: relationship.description.trim(),
  };
}

function sanitizeRelationships(
  relationships: FormulaRelationship[],
  columns: IdentifyFormulaRelationshipsParams["columns"],
): FormulaRelationship[] {
  const formulaByLetter = new Map(
    columns.map((col) => [col.letter.toUpperCase(), col.isFormula]),
  );

  return relationships
    .map((relationship) => normalizeRelationship(relationship))
    .filter((relationship) => {
      const isFormula = formulaByLetter.get(relationship.resultColumn);
      return isFormula === false;
    });
}

function mapCachedResult(
  cached: AiFormulaRelationshipResultRow,
): IdentifyFormulaRelationshipsResponse {
  return {
    relationships: cached.relationships,
  };
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

export async function identifyFormulaRelationshipsWithCache(
  params: IdentifyFormulaRelationshipsParams,
): Promise<IdentifyFormulaRelationshipsResponse> {
  const prompt = generatePrompt(params);
  const hashInput = buildHashInput(prompt);
  const hash = createHash("md5")
    .update(JSON.stringify(hashInput))
    .digest("hex");

  const canCache = params.datasetId != null && params.datasetFileId != null;

  if (canCache) {
    const cached = await findFormulaRelationshipsByHash(hash);
    if (cached) {
      logger.info(`Found cached AI result for '${params.sheetName}'`);
      return mapCachedResult(cached);
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

  const relationships = sanitizeRelationships(
    rawResult.relationships,
    params.columns,
  );
  const result: IdentifyFormulaRelationshipsResponse = { relationships };

  if (canCache) {
    await insertFormulaRelationshipsResult({
      datasetId: params.datasetId,
      datasetFileId: params.datasetFileId,
      sheetName: params.sheetName,
      prompt,
      model: config.model,
      relationships: result.relationships,
      hash,
    });
  }

  return result;
}
