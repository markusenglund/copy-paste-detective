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

  // Format column headers
  const columnHeaders = columnNames.join("\t");

  // Format sample rows
  const sampleRows = columnData.map((row) => row.join("\t")).join("\n");

  return `Your job is to categorize all columns from an excel sheet by whether or not its data is expected to be shared by multiple rows. You will create two lists - 'shared' and 'unique'. The columns in the 'shared' list should represent data that applies to a group of rows while the 'unique' list should have data that only belongs to this particular row.

Example:
You are given a spreadsheet where every row is a house. The spreadsheet has the following columns: price, cityPopulation, address, livingArea, yardArea, annualPrecipitation, meanTemperatureJanuary.

In this case a good response would be

\`\`\`
{
  unique: ["price", "address", "livingArea", "yardArea"],
  shared: ["cityPopulation", "annualPrecipitation", "meanTemperatureJanuary"]
}
\`\`\`

Explanation: A house's price, address, living area and yard area are data that are specific to this one house. But the population and weather data (annual precipitation and mean temperature in January) is expected to be shared by many rows since two houses in the same city will have weather data from the exact same weather station. Although two houses could potentially sell for the exact same price or have the exact same yard area, these are still individual data points so do not count as shared.

Assignment:

The data is a supplement of a scientific paper called "${paperName}"

The excel file is called "${excelFileName}"

Here's the README that describes the data: 

\`\`\`
${readmeContent}
\`\`\`

Here are the column names and sample rows:

${columnHeaders}
${sampleRows}


Categorize every column name into either unique or shared.`;
}
