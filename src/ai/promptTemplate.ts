import { markdownTable } from "markdown-table";

export interface PromptTemplateParams {
  paperName: string;
  excelFileName: string;
  readmeContent: string;
  columnNames: string[];
  columnData: string[][];
}

export function generateColumnCategorizationPrompt(
  params: PromptTemplateParams,
): string {
  const { paperName, excelFileName, readmeContent, columnNames, columnData } =
    params;

  const nonEmptyTable: [string[], string[], string[]] = [[], [], []];
  for (let i = 0; i < columnNames.length; i++) {
    const columnName = columnNames[i];
    if (columnName !== "") {
      nonEmptyTable[0].push(columnName);
      nonEmptyTable[1].push(columnData[0][i]);
      nonEmptyTable[2].push(columnData[1][i]);
    }
  }

  const markdownFormattedTable = markdownTable(nonEmptyTable);

  return `**Your Task:**

You are an expert data scientist analyzing a dataset from a scientific paper. Your goal is to determine which data columns represent direct measurements of individual samples and which represent contextual or grouping information.

You will categorize every column name into one of two lists: \`unique\` or \`shared\`.

* **\`unique\`**: Columns where each value is a direct measurement or observation of the specific, individual subject of that row.
* **\`shared\`**: Columns where the same value is expected to apply to multiple rows because they belong to the same group or location (e.g., location-level weather data).

After categorizing the columns, you will provide a brief \`motivation\` for your choices in the same JSON object.

**General Rules & Heuristics**

Apply these rules when categorizing columns:

1.  Geographic coordinates (Latitude, Longitude, etc.) should usually be considered \`shared\` unless you're certain they are unique to each specific row.
2.  IDs should be considered \`shared\`, as they are not really data.

**Example Scenario:**

-   **Context:** A spreadsheet about house sales.
-   **Columns:** \`price\`, \`address\`, \`livingArea\`, \`cityPopulation\`, \`annualPrecipitation\`
-   **Correct Output:**
    \`\`\`json
    {
      "motivation": "The 'unique' columns are properties of an individual house. The 'shared' columns, cityPopulation and annualPrecipitation, are characteristics of the entire city and would be the same for all houses in that location.",
      "unique": ["price", "address", "livingArea"],
      "shared": ["cityPopulation", "annualPrecipitation"]
    }
    \`\`\`

---

**Assignment Details:**

**1. Scientific Paper:** "${paperName}"
**2. Data File:** "${excelFileName}"
**3. Data Description (from README):**

\`\`\`
${readmeContent}
\`\`\`

**4. Column Headers & Sample Data:**

${markdownFormattedTable}

---

**Your Analysis:**

Based on all the information provided, categorize the column headers. In your \`motivation\`, explain the general logic you applied, especially referencing the README.
`;
}
