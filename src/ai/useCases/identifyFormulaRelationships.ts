import { z } from "zod";
import { createHash } from "crypto";
import {
  findByHash as findFormulaRelationshipsByHash,
  insertResult as insertFormulaRelationshipsResult,
} from "../../repositories/aiFormulaRelationshipResults/aiFormulaRelationshipResultsRepository";
import { type AiFormulaRelationshipResultRow } from "../../repositories/aiFormulaRelationshipResults/schema";
import { getProvider, getUseCaseConfig } from "../aiConfig";
import { logger } from "../../utils/logger";
import { maxPromptDataDescriptionChars } from "../../config/config";
import { wrapInCodeBlock } from "../../utils/markdown";

const relationshipSchema = z.object({
  resultColumn: z.string(),
  expression: z.string(),
  description: z.string(),
});

const responseSchema = z.object({
  explanation: z.string(),
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
  articleName?: string;
  abstract?: string;
  dataDescription?: string;
  fileCaption?: string;
  fullText?: string;
  source?: "dryad" | "pmc" | "standalone";
};

function createContextSection(
  params: IdentifyFormulaRelationshipsParams,
): string {
  const shouldIncludeAbstract =
    !!params.abstract && !(params.source === "pmc" && !!params.fullText);

  if (params.dataDescription) {
    const truncated =
      params.dataDescription.length > maxPromptDataDescriptionChars
        ? `${params.dataDescription.slice(0, maxPromptDataDescriptionChars)}... (content truncated due to exceeding character limit)`
        : params.dataDescription;
    return (
      (shouldIncludeAbstract ? `\n# Abstract\n\n${params.abstract}\n` : "") +
      `\n# Description of the data\n\nThe following description of the dataset was provided by the authors.\n\n${wrapInCodeBlock(truncated)}\n`
    );
  }

  if (params.source === "pmc") {
    const parts: string[] = [];
    if (shouldIncludeAbstract) {
      parts.push(`# Abstract\n\n${params.abstract}`);
    }
    if (params.fileCaption) {
      parts.push(
        `# File caption\n\nThe following caption was provided for this data file:\n\n${wrapInCodeBlock(params.fileCaption)}`,
      );
    }
    if (params.fullText) {
      parts.push(
        `# Full text of the paper\n\nUse it to understand what the data represents.\n\n${wrapInCodeBlock(params.fullText)}`,
      );
    }
    return parts.length > 0 ? "\n" + parts.join("\n\n") + "\n" : "";
  }

  return shouldIncludeAbstract ? `\n# Abstract\n\n${params.abstract}\n` : "";
}

export function generatePrompt(
  params: IdentifyFormulaRelationshipsParams,
): string {
  const columnDescriptions = params.columns
    .filter((col) => col.name.trim() !== "")
    .map((col) => {
      const label = col.isFormula ? `${col.letter} [FORMULA]` : col.letter;
      return `- ${label} (${col.name})`;
    });

  return `You are analyzing an Excel sheet from a scientific paper to identify mathematical relationships between columns — cases where one column is likely computed row-by-row from other columns.

# Basic info

- Title: '${params.articleName ?? ""}'
- Excel filename: '${params.excelFileName}'
- Sheet name: '${params.sheetName}'
${createContextSection(params)}
# Columns

${columnDescriptions.join("\n")}

# Your task

Based on the column names and scientific context, identify columns that are likely to have been derived from other columns with a mathematical formula. Do not attempt to verify against data values — that will be done separately. Report relationships even if you are uncertain whether they hold exactly in every row.

Rules:
- Columns marked [FORMULA] may appear as inputs in an expression but never as the result.
- Write expressions as valid Python using column letters as variables (e.g. \`A + B\`, \`A / (B * B)\`, \`math.log(A)\`). The math module is available.
- For any group of columns that share a mathematical relationship, report at most one formula — choose the resultColumn that is most likely derived from the others, not one of the independent measurements.

Output schema:
{
  "explanation": "Brief reasoning about what relationships were found or why none were identified",
  "relationships": [
    {
      "resultColumn": "C",
      "expression": "A / (B * B)",
      "description": "BMI is calculated from weight and height"
    }
  ]
}`;
}

function mapCachedResult(
  cached: AiFormulaRelationshipResultRow,
): IdentifyFormulaRelationshipsResponse {
  return {
    explanation: cached.explanation ?? "",
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

  const result: IdentifyFormulaRelationshipsResponse = {
    explanation: rawResult.explanation,
    relationships: rawResult.relationships,
  };

  if (canCache) {
    await insertFormulaRelationshipsResult({
      datasetId: params.datasetId,
      datasetFileId: params.datasetFileId,
      sheetName: params.sheetName,
      prompt,
      model: config.model,
      explanation: result.explanation,
      relationships: result.relationships,
      hash,
    });
  }

  return result;
}
