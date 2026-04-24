import { Command } from "@commander-js/extra-typings";
import pMap from "p-map";
import { closeDb } from "../db";
import {
  getDryadDatasetByExtId,
  type DryadDatasetWithFiles,
} from "../repositories/datasets/unifiedDatasetsRepository";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { maxSheetsPerExcelFileForFormulaCheck } from "../config/config";
import {
  identifyFormulaRelationshipsWithCache,
  type IdentifyFormulaRelationshipsParams,
} from "../ai/useCases/identifyFormulaRelationships";
import { PythonRunner } from "../formulaCheck/pythonRunner";
import {
  checkRelationship,
  type SheetColumnInfo,
} from "../formulaCheck/checkRelationship";
import { buildSheetColumnInfo } from "../formulaCheck/buildSheetColumnInfo";
import { runRelationshipLoop } from "../formulaCheck/runRelationshipLoop";
import type { FormulaRelationship } from "../repositories/aiFormulaRelationshipResults/schema";
import { logger } from "../utils/logger";

const SAMPLE_ROW_COUNT = 5;
const MAX_FORMULA_RETRIES = 3;

interface AcceptableForm {
  resultColumn: string;
  expression: string;
}

interface ExpectedRelationship {
  acceptableForms: AcceptableForm[];
  expectedFailingRowIndices: number[];
}

interface TestCase {
  extId: number;
  filename: string;
  sheetName: string;
  description: string;
  expectedRelationships: ExpectedRelationship[];
}

type ExpectedRelationshipOutcome =
  | {
      status: "pass";
      matchedAi: FormulaRelationship;
      totalFailingRows: number;
    }
  | {
      status: "fail";
      reason: "expected-form-not-found" | "failing-rows-mismatch";
      detail: string;
    };

type TestResult = {
  testCase: TestCase;
  aiRelationships: FormulaRelationship[];
  aiExplanation: string;
  outcomes: ExpectedRelationshipOutcome[];
  unexpectedExtras: FormulaRelationship[];
  passed: boolean;
  error?: string;
};

const testCases: TestCase[] = [
  {
    extId: 26240,
    filename: "TableS2Insect-Kraghede-1997-2018.2.xls",
    sheetName: "Sheet1",
    description:
      "Total Insects = Small Insects + Large insects (J = G + H) and Proportion large insects = Large insects / (Small Insects + Large insects + 1) (K = H / (G + H + 1)). Both relationships have rows that violate them — these are the discrepancies the tool is meant to surface.",
    expectedRelationships: [
      {
        acceptableForms: [
          { resultColumn: "J", expression: "G + H" },
          { resultColumn: "J", expression: "H + G" },
          { resultColumn: "G", expression: "J - H" },
          { resultColumn: "H", expression: "J - G" },
        ],
        expectedFailingRowIndices: [392, 393, 396, 399, 400],
      },
      {
        acceptableForms: [
          { resultColumn: "K", expression: "H / (G + H + 1)" },
          { resultColumn: "K", expression: "H / (H + G + 1)" },
          { resultColumn: "K", expression: "H / (G + 1 + H)" },
          { resultColumn: "K", expression: "H / (H + 1 + G)" },
          { resultColumn: "K", expression: "H / (1 + G + H)" },
          { resultColumn: "K", expression: "H / (1 + H + G)" },
          { resultColumn: "K", expression: "H / (J + 1)" },
          { resultColumn: "K", expression: "H / (1 + J)" },
        ],
        expectedFailingRowIndices: [396, 404, 408, 412, 418],
      },
    ],
  },
];

function normalize(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

function relationshipKey(resultColumn: string, expression: string): string {
  return `${normalize(resultColumn)}|${normalize(expression)}`;
}

function findMatchingAiRelationship(
  expected: ExpectedRelationship,
  aiRelationships: FormulaRelationship[],
): FormulaRelationship | undefined {
  const acceptable = new Set(
    expected.acceptableForms.map((form) =>
      relationshipKey(form.resultColumn, form.expression),
    ),
  );
  return aiRelationships.find((ai) =>
    acceptable.has(relationshipKey(ai.resultColumn, ai.expression)),
  );
}

function findUnexpectedExtras(
  expectedRelationships: ExpectedRelationship[],
  aiRelationships: FormulaRelationship[],
): FormulaRelationship[] {
  const acceptable = new Set<string>();
  for (const expected of expectedRelationships) {
    for (const form of expected.acceptableForms) {
      acceptable.add(relationshipKey(form.resultColumn, form.expression));
    }
  }
  return aiRelationships.filter(
    (ai) => !acceptable.has(relationshipKey(ai.resultColumn, ai.expression)),
  );
}

async function evaluateExpectedRelationship(
  expected: ExpectedRelationship,
  aiRelationships: FormulaRelationship[],
  sheet: import("../entities/Sheet").Sheet,
  columns: SheetColumnInfo[],
  python: PythonRunner,
): Promise<ExpectedRelationshipOutcome> {
  const matchedAi = findMatchingAiRelationship(expected, aiRelationships);
  if (!matchedAi) {
    const aiList = aiRelationships
      .map((r) => `${r.resultColumn} = ${r.expression}`)
      .join(", ");
    const acceptableList = expected.acceptableForms
      .map((f) => `${f.resultColumn} = ${f.expression}`)
      .join(", ");
    return {
      status: "fail",
      reason: "expected-form-not-found",
      detail: `No AI relationship matched any acceptable form. Acceptable: [${acceptableList}]. AI proposed: [${aiList || "none"}]`,
    };
  }

  const checkResult = await checkRelationship(
    sheet,
    columns,
    matchedAi,
    python,
  );
  const actualFailing = new Set(checkResult.allFailingRowIndices);

  if (expected.expectedFailingRowIndices.length === 0) {
    if (actualFailing.size > 0) {
      return {
        status: "fail",
        reason: "failing-rows-mismatch",
        detail: `Expected zero failing rows (true negative), but got ${actualFailing.size}. Sample failing indices: [${checkResult.allFailingRowIndices.slice(0, 10).join(", ")}]`,
      };
    }
    return {
      status: "pass",
      matchedAi,
      totalFailingRows: 0,
    };
  }

  const missing = expected.expectedFailingRowIndices.filter(
    (idx) => !actualFailing.has(idx),
  );
  if (missing.length > 0) {
    return {
      status: "fail",
      reason: "failing-rows-mismatch",
      detail: `Expected failing rows [${expected.expectedFailingRowIndices.join(", ")}] were not all reported as failing. Missing: [${missing.join(", ")}]. Total failing rows reported: ${actualFailing.size}`,
    };
  }

  return {
    status: "pass",
    matchedAi,
    totalFailingRows: actualFailing.size,
  };
}

async function processTestCase(
  testCase: TestCase,
  python: PythonRunner,
): Promise<TestResult> {
  try {
    const dataset: DryadDatasetWithFiles | undefined =
      await getDryadDatasetByExtId(testCase.extId);
    if (!dataset) {
      return emptyResult(
        testCase,
        `Dataset with extId ${testCase.extId} not found`,
      );
    }

    const excelFiles = dataset.dataFiles.filter((f) => f.fileType === "excel");
    const fileIndex = excelFiles.findIndex(
      (f) => f.filename === testCase.filename,
    );
    if (fileIndex === -1) {
      return emptyResult(
        testCase,
        `File "${testCase.filename}" not found in dataset ${testCase.extId}`,
      );
    }

    const excelFileData = loadExcelFileFromDryadIndex(
      dataset,
      fileIndex,
      maxSheetsPerExcelFileForFormulaCheck,
    );

    const sheet = excelFileData.sheets.find(
      (s) => s.name === testCase.sheetName,
    );
    if (!sheet) {
      return emptyResult(
        testCase,
        `Sheet "${testCase.sheetName}" not found in file "${testCase.filename}"`,
      );
    }

    const columns = buildSheetColumnInfo(sheet);
    const sampleRows = sheet.getSampleData(
      Math.min(SAMPLE_ROW_COUNT, sheet.numRows - sheet.firstDataRowIndex),
    );

    const originalParams: IdentifyFormulaRelationshipsParams = {
      excelFileName: excelFileData.excelFileName,
      sheetName: sheet.name,
      columns,
      sampleRows,
      datasetId: dataset.id,
      datasetFileId: excelFiles[fileIndex].id,
      articleName: excelFileData.articleName,
      abstract: excelFileData.abstract,
      dataDescription: excelFileData.dataDescription,
      source: excelFileData.source,
    };

    const initialAiResponse =
      await identifyFormulaRelationshipsWithCache(originalParams);

    const loopResult = await runRelationshipLoop({
      initialAiResponse,
      originalParams,
      sheet,
      columns,
      python,
      datasetId: dataset.id,
      datasetFileId: excelFiles[fileIndex].id,
      maxRetries: MAX_FORMULA_RETRIES,
    });

    const outcomes: ExpectedRelationshipOutcome[] = [];
    for (const expected of testCase.expectedRelationships) {
      const outcome = await evaluateExpectedRelationship(
        expected,
        loopResult.finalRelationships,
        sheet,
        columns,
        python,
      );
      outcomes.push(outcome);
    }

    const unexpectedExtras = findUnexpectedExtras(
      testCase.expectedRelationships,
      loopResult.finalRelationships,
    );

    const passed =
      outcomes.every((o) => o.status === "pass") &&
      unexpectedExtras.length === 0;

    return {
      testCase,
      aiRelationships: loopResult.finalRelationships,
      aiExplanation: loopResult.finalAiResponse.explanation,
      outcomes,
      unexpectedExtras,
      passed,
    };
  } catch (error) {
    return emptyResult(
      testCase,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function emptyResult(testCase: TestCase, error: string): TestResult {
  return {
    testCase,
    aiRelationships: [],
    aiExplanation: "",
    outcomes: [],
    unexpectedExtras: [],
    passed: false,
    error,
  };
}

function printResults(results: TestResult[]): void {
  console.log("\n=== Individual Test Results ===\n");

  for (const result of results) {
    const { testCase, outcomes, error, aiRelationships } = result;
    console.log(
      `[${testCase.extId}] ${testCase.filename} :: ${testCase.sheetName}`,
    );

    if (error) {
      console.log(`  Status: ERROR | ${error}`);
      console.log("");
      continue;
    }

    const status = result.passed ? "PASS" : "FAIL";
    console.log(`  Status: ${status}`);
    console.log(
      `  AI proposed ${aiRelationships.length} relationship(s): ${aiRelationships.map((r) => `${r.resultColumn} = ${r.expression}`).join(" | ") || "(none)"}`,
    );

    for (let i = 0; i < outcomes.length; i++) {
      const outcome = outcomes[i];
      const expected = testCase.expectedRelationships[i];
      const accepted = expected.acceptableForms
        .map((f) => `${f.resultColumn} = ${f.expression}`)
        .join(" or ");
      if (outcome.status === "pass") {
        console.log(
          `  [${i + 1}] PASS | matched ${outcome.matchedAi.resultColumn} = ${outcome.matchedAi.expression} | failingRows=${outcome.totalFailingRows}`,
        );
      } else {
        console.log(
          `  [${i + 1}] FAIL (${outcome.reason}) | expected one of: ${accepted}`,
        );
        console.log(`      ${outcome.detail}`);
      }
    }

    if (result.unexpectedExtras.length > 0) {
      console.log(
        `  [extras] FAIL (unexpected-extra-relationship) | AI reported ${result.unexpectedExtras.length} relationship(s) that were not in any expected acceptable form:`,
      );
      for (const extra of result.unexpectedExtras) {
        console.log(`      - ${extra.resultColumn} = ${extra.expression}`);
      }
    }
    console.log("");
  }

  const completed = results.filter((r) => !r.error);
  const passed = completed.filter((r) => r.passed);
  const failed = completed.filter((r) => !r.passed);
  const errors = results.filter((r) => r.error);

  console.log("=== Summary ===\n");
  console.log(`Total: ${results.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(
    `Passed: ${passed.length}/${completed.length} (${completed.length > 0 ? ((passed.length / completed.length) * 100).toFixed(1) : 0}%)`,
  );
  console.log(`Failed: ${failed.length}`);

  if (errors.length > 0) {
    console.log("\n=== Errors ===\n");
    for (const result of errors) {
      console.log(`[${result.testCase.extId}]: ${result.error}`);
    }
  }
}

const program = new Command();

program
  .name("test-formula-prompt")
  .description(
    "Test the formula relationship identification prompt against known cases.",
  )
  .version("0.1.0")
  .option(
    "--ext-id <extId>",
    "Run only the test case with this extId",
    parseInt,
  )
  .action(async (options) => {
    const startTime = Date.now();
    const python = await PythonRunner.start();

    try {
      let selectedCases = testCases;
      if (options.extId !== undefined) {
        selectedCases = testCases.filter((tc) => tc.extId === options.extId);
      }
      if (selectedCases.length === 0) {
        logger.error("No test cases match the specified criteria");
        process.exit(1);
      }

      logger.info(`Running ${selectedCases.length} formula test case(s)...`);

      const results = await pMap(
        selectedCases,
        (tc) => processTestCase(tc, python),
        { concurrency: 4 },
      );

      printResults(results);

      const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\nExecution time: ${durationSeconds}s`);

      const anyFailed = results.some((r) => !r.passed);
      if (anyFailed) {
        process.exitCode = 1;
      }
    } finally {
      await python.shutdown();
      await closeDb();
    }
  });

program.parse();
