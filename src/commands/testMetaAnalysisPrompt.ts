import path from "path";
import { Command } from "@commander-js/extra-typings";
import pMap from "p-map";
import { getDatasetWithFiles } from "../repositories/datasets/datasetsRepository";
import type { DryadDatasetWithFiles } from "../repositories/datasets/datasetsRepository";
import { classifyMetaAnalysisWithCache } from "../ai/geminiService";
import { logger } from "../utils/logger";
import { closeDb } from "../db";
import { readTextFile } from "../utils/readTextFile";
import { storagePaths } from "../utils/paths/storagePaths";

interface TestCase {
  extId: number;
  isMetaAnalysis: boolean;
}

type TestResult = {
  testCase: TestCase;
  aiResult: boolean | null;
  passed: boolean | null;
  reasoning?: string;
  error?: string;
};

const metaAnalyses: TestCase[] = [
  {
    extId: 52841,
    isMetaAnalysis: true,
  },
  {
    extId: 24008,
    isMetaAnalysis: true,
  },
  {
    extId: 26649,
    isMetaAnalysis: true,
  },
  {
    extId: 19966,
    isMetaAnalysis: true,
  },
  {
    extId: 4763,
    isMetaAnalysis: true,
  },
  {
    extId: 52636,
    isMetaAnalysis: true,
  },
  {
    extId: 25928,
    isMetaAnalysis: true,
  },
  {
    extId: 26448,
    isMetaAnalysis: true,
  },
  {
    extId: 81273,
    isMetaAnalysis: true,
  },
  {
    extId: 121567,
    isMetaAnalysis: true,
  },
  {
    extId: 70773,
    isMetaAnalysis: true,
  },
];

const nonMetaAnalyses: TestCase[] = [
  {
    extId: 139667,
    isMetaAnalysis: false,
  },
  {
    extId: 146898,
    isMetaAnalysis: false,
  },
  {
    extId: 8685,
    isMetaAnalysis: false,
  },
  {
    extId: 26305,
    isMetaAnalysis: false,
  },
  {
    extId: 92897,
    isMetaAnalysis: false,
  },
  {
    extId: 154992,
    isMetaAnalysis: false,
  },
  {
    extId: 155108,
    isMetaAnalysis: false,
  },
  {
    extId: 90062,
    isMetaAnalysis: false,
  },
  {
    extId: 16328,
    isMetaAnalysis: false,
  },
  {
    extId: 155414,
    isMetaAnalysis: false,
  },
  {
    extId: 142655,
    isMetaAnalysis: false,
  },
  {
    extId: 146873,
    isMetaAnalysis: false,
  },
  {
    extId: 9683,
    isMetaAnalysis: false,
  },
  {
    extId: 6408,
    isMetaAnalysis: false,
  },
];

function getDataDescription(
  dataset: DryadDatasetWithFiles,
): string | undefined {
  if (dataset.readmeFile) {
    const datasetFolder = storagePaths.dryadDataset(dataset.extId);
    const readmePath = path.join(datasetFolder, dataset.readmeFile.filename);
    try {
      return readTextFile(readmePath);
    } catch {
      // Fall through to usageNotes
    }
  }
  return dataset.usageNotes ?? undefined;
}

async function processTestCase(testCase: TestCase): Promise<TestResult> {
  const { extId } = testCase;

  try {
    const dataset = await getDatasetWithFiles(extId);
    if (!dataset) {
      return {
        testCase,
        aiResult: null,
        passed: null,
        error: `Dataset with extId ${extId} not found`,
      };
    }

    const dataDescription = getDataDescription(dataset);

    const result = await classifyMetaAnalysisWithCache({
      title: dataset.title,
      abstract: dataset.abstract!,
      dataDescription,
      dryadDatasetId: dataset.id,
    });

    const passed = result.isMetaAnalysis === testCase.isMetaAnalysis;

    return {
      testCase,
      aiResult: result.isMetaAnalysis,
      passed,
      reasoning: result.reasoning,
    };
  } catch (error) {
    return {
      testCase,
      aiResult: null,
      passed: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function printResults(results: TestResult[]): void {
  console.log("\n=== Individual Test Results ===\n");

  for (const result of results) {
    const { testCase, aiResult, passed, reasoning, error } = result;

    console.log(`[${testCase.extId}] Expected: ${testCase.isMetaAnalysis}`);

    if (error) {
      console.log(`  Status: ERROR | ${error}`);
    } else {
      const status = passed ? "PASS" : "FAIL";
      console.log(`  Status: ${status} | AI said: ${aiResult}`);
      if (!passed && reasoning) {
        console.log(`  Reasoning: ${reasoning}`);
      }
    }
    console.log("");
  }

  // Summary
  const completed = results.filter((r) => r.passed !== null);
  const passed = completed.filter((r) => r.passed);
  const failed = completed.filter((r) => !r.passed);
  const errors = results.filter((r) => r.error);

  const falsePositives = failed.filter(
    (r) => r.aiResult === true && !r.testCase.isMetaAnalysis,
  );
  const falseNegatives = failed.filter(
    (r) => r.aiResult === false && r.testCase.isMetaAnalysis,
  );

  console.log("=== Summary ===\n");
  console.log(`Total: ${results.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(
    `Passed: ${passed.length}/${completed.length} (${completed.length > 0 ? ((passed.length / completed.length) * 100).toFixed(1) : 0}%)`,
  );
  console.log(
    `  False positives: ${falsePositives.length} (AI said meta-analysis, was not)`,
  );
  console.log(
    `  False negatives: ${falseNegatives.length} (AI missed meta-analysis)`,
  );

  if (errors.length > 0) {
    console.log("\n=== Errors ===\n");
    for (const result of errors) {
      console.log(`[${result.testCase.extId}]: ${result.error}`);
    }
  }
}

const program = new Command();

program
  .name("test-meta-analysis-prompt")
  .description(
    "Test meta-analysis classification prompt accuracy against test cases",
  )
  .version("0.1.0")
  .option("--ext-id <extId>", "Run only test case(s) with this extId", parseInt)
  .action(async (options) => {
    const startTime = Date.now();

    try {
      let allTestCases: TestCase[] = [...metaAnalyses, ...nonMetaAnalyses];

      if (options.extId !== undefined) {
        allTestCases = allTestCases.filter((tc) => tc.extId === options.extId);
      }

      if (allTestCases.length === 0) {
        logger.error("No test cases match the specified criteria");
        process.exit(1);
      }

      logger.info(`Running ${allTestCases.length} test cases...`);

      const results = await pMap(
        allTestCases,
        (testCase) => processTestCase(testCase),
        { concurrency: 8 },
      );

      printResults(results);

      const endTime = Date.now();
      const durationSeconds = ((endTime - startTime) / 1000).toFixed(1);
      console.log(`\nExecution time: ${durationSeconds}s`);
    } finally {
      await closeDb();
    }
  });

program.parse();
