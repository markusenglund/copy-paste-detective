import { z } from "zod";
import { createHash } from "crypto";
import { markdownTable } from "markdown-table";
import { maxPromptDataDescriptionChars } from "../../config/config";
import {
  findByHash as findColumnCategorizationByHash,
  insertResult as insertColumnCategorizationResult,
} from "../../repositories/aiColumnCategorizationResults/aiColumnCategorizationResultsRepository";
import { getProvider, getUseCaseConfig } from "../aiConfig";
import { logger } from "../../utils/logger";

// ============ Response schema & types ============

const responseSchema = z.object({
  motivation: z.string(),
  columns: z.array(
    z.object({
      columnName: z.string(),
      category: z.enum(["unique", "shared"]),
    }),
  ),
});

export type ScreenColumnsResponse = {
  motivation: string;
  includedColumnNames: string[];
  excludedColumnNames: string[];
};

// ============ Hash input ============

function buildHashInput(prompt: string): object {
  const config = getUseCaseConfig("screenColumns");
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

// ============ Prompt ============

export interface PromptTemplateParams {
  paperName: string;
  excelFileName: string;
  readmeContent: string;
  columnNames: string[];
  columnData: string[][];
}

function generatePrompt(params: PromptTemplateParams): string {
  const { paperName, excelFileName, readmeContent, columnNames, columnData } =
    params;

  const truncatedReadmeContent =
    readmeContent.length > maxPromptDataDescriptionChars
      ? `${readmeContent.slice(0, maxPromptDataDescriptionChars)}... (content truncated due to exceeding character limit)`
      : params.readmeContent;

  const seenColumnNames = new Set<string>();
  const tableWithNonEmptyUniqueColumnNames: [string[], string[], string[]] = [
    [],
    [],
    [],
  ];
  for (let i = 0; i < columnNames.length; i++) {
    const columnName = columnNames[i];
    if (columnName !== "" && !seenColumnNames.has(columnName)) {
      seenColumnNames.add(columnName);
      tableWithNonEmptyUniqueColumnNames[0].push(columnName);
      tableWithNonEmptyUniqueColumnNames[1].push(columnData[0][i]);
      tableWithNonEmptyUniqueColumnNames[2].push(columnData[1][i]);
    }
  }

  const markdownFormattedTable = markdownTable(
    tableWithNonEmptyUniqueColumnNames,
  );

  return `**Your Task:**

You are an expert data scientist analyzing a dataset from a scientific paper. Your goal is to determine which data columns represent direct measurements of individual samples and which represent contextual or grouping information.

You will categorize every column name by assigning it one of two categories: \`unique\` or \`shared\`.

* **\`unique\`**: Columns where each value is a direct measurement or observation of the specific, individual subject of that row.
* **\`shared\`**: Columns where the same value is expected to apply to multiple rows because they belong to the same group or location (e.g., location-level weather data).

**Output Structure:**

1.  **\`motivation\`**: First, provide a brief explanation of the logic you applied to categorize the columns.
2.  **\`columns\`**: Then, provide a list of objects representing every column header. Each object must have a \`columnName\` and a \`category\` ("unique" or "shared").

**General Rules & Heuristics**

Apply these rules when categorizing columns:

1.  Geographic coordinates (Latitude, Longitude, etc.) should usually be considered \`shared\` unless you're certain they are unique to each specific row.
2.  IDs should be considered \`shared\`, as they are not really data.
3.  When in doubt, categorize the column as \`unique\`.

**Example Scenario:**

-   **Context:** A spreadsheet about house sales.
-   **Columns:** \`price\`, \`address\`, \`livingArea\`, \`cityPopulation\`, \`annualPrecipitation\`
-   **Correct Output:**
    \`\`\`json
    {
      "motivation": "The 'unique' columns are properties of an individual house. The 'shared' columns, cityPopulation and annualPrecipitation, are characteristics of the entire city and would be the same for all houses in that location.",
      "columns": [
        { "columnName": "price", "category": "unique" },
        { "columnName": "address", "category": "unique" },
        { "columnName": "livingArea", "category": "unique" },
        { "columnName": "cityPopulation", "category": "shared" },
        { "columnName": "annualPrecipitation", "category": "shared" }
      ]
    }
    \`\`\`

---

**Assignment Details:**

**1. Scientific Paper:** "${paperName}"
**2. Data File:** "${excelFileName}"
**3. Data Description (from README):**

\`\`\`
${truncatedReadmeContent}
\`\`\`

**4. Column Headers & Sample Data:**

${markdownFormattedTable}

---

**Your Analysis:**

Based on all the information provided, categorize the column headers. Start with your \`motivation\`, then generate the itemized list of columns.
`;
}

// ============ Cache wrapper ============

export type ScreenColumnsWithCacheParams = PromptTemplateParams & {
  dryadDatasetId?: number;
  dryadExcelFileId?: number;
  sheetName: string;
};

export async function screenColumnsWithCache(
  params: ScreenColumnsWithCacheParams,
): Promise<ScreenColumnsResponse> {
  const prompt = generatePrompt(params);
  const hashInput = buildHashInput(prompt);
  const hash = createHash("md5")
    .update(JSON.stringify(hashInput))
    .digest("hex");

  const canCache =
    params.dryadDatasetId !== undefined &&
    params.dryadExcelFileId !== undefined;

  if (canCache) {
    const cached = await findColumnCategorizationByHash(hash);
    if (cached) {
      logger.info(`Found cached AI result for '${params.sheetName}'`);
      return {
        motivation: cached.motivation,
        includedColumnNames: cached.includedColumnNames,
        excludedColumnNames: cached.excludedColumnNames,
      };
    }
  }

  const config = getUseCaseConfig("screenColumns");
  const provider = getProvider("screenColumns");
  const rawResult = await provider.generateText<z.infer<typeof responseSchema>>(
    {
      model: config.model,
      prompt,
      temperature: config.temperature,
      responseSchema,
    },
  );

  const includedColumnNames = rawResult.columns
    .filter((col) => col.category === "unique")
    .map((col) => col.columnName);
  const excludedColumnNames = rawResult.columns
    .filter((col) => col.category === "shared")
    .map((col) => col.columnName);

  const result: ScreenColumnsResponse = {
    motivation: rawResult.motivation,
    includedColumnNames,
    excludedColumnNames,
  };

  if (canCache) {
    await insertColumnCategorizationResult({
      dryadDatasetId: params.dryadDatasetId!,
      dryadExcelFileId: params.dryadExcelFileId!,
      sheetName: params.sheetName,
      prompt,
      model: config.model,
      motivation: result.motivation,
      includedColumnNames: result.includedColumnNames,
      excludedColumnNames: result.excludedColumnNames,
      hash,
    });
  }

  return result;
}
