import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { createHash } from "crypto";
import { config } from "../config/env";
import type { PromptTemplateParams } from "./promptTemplate";
import { generateColumnCategorizationPrompt } from "./promptTemplate";
import {
  findByHash as findColumnCategorizationByHash,
  insertResult as insertColumnCategorizationResult,
} from "../repositories/aiColumnCategorizationResults/aiColumnCategorizationResultsRepository";
import {
  findByHash as findReviewResultByHash,
  insertResult as insertReviewResult,
} from "../repositories/aiReviewResults/aiReviewResultsRepository";

// Internal schema for parsing raw Gemini API response (uses prompt field names)
const columnCategorizationSchema = z.object({
  columnName: z.string(),
  category: z.enum(["unique", "shared"]),
});

const geminiResponseSchema = z.object({
  motivation: z.string(),
  columns: z.array(columnCategorizationSchema),
});

// Public response type with renamed fields
export type ScreenColumnsResponse = {
  motivation: string;
  includedColumnNames: string[];
  excludedColumnNames: string[];
};

const geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });

const screenColumnsModel = "gemini-2.5-flash-lite";

const screenColumnsResponseSchema = {
  type: Type.OBJECT,
  properties: {
    motivation: { type: Type.STRING },
    columns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          columnName: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: ["unique", "shared"],
          },
        },
        required: ["columnName", "category"],
      },
    },
  },
  propertyOrdering: ["motivation", "columns"],
  required: ["motivation", "columns"],
} as const;

type ScreenColumnsParams = {
  model: string;
  contents: string;
  config: {
    temperature: number;
    responseMimeType: "application/json";
    responseSchema: typeof screenColumnsResponseSchema;
  };
};

function buildScreenColumnsParams(prompt: string): ScreenColumnsParams {
  return {
    model: screenColumnsModel,
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: screenColumnsResponseSchema,
    },
  };
}

async function screenColumnsGemini(
  params: ScreenColumnsParams,
): Promise<ScreenColumnsResponse> {
  try {
    const response = await geminiClient.models.generateContent(params);

    if (!response.text) {
      throw new Error("No text received from Gemini API");
    }
    let rawResult: z.infer<typeof geminiResponseSchema>;
    try {
      // Parse and validate the structured JSON response
      const parsed = JSON.parse(response.text);
      rawResult = geminiResponseSchema.parse(parsed);
    } catch (error) {
      console.error("Error parsing Gemini API response:", error);
      console.error("Response:", response.text);
      console.error("Prompt:", params.contents);
      throw new Error(
        `Failed to parse Gemini API response: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Transform columns array into included/excluded arrays
    const includedColumnNames = rawResult.columns
      .filter((col) => col.category === "unique")
      .map((col) => col.columnName);
    const excludedColumnNames = rawResult.columns
      .filter((col) => col.category === "shared")
      .map((col) => col.columnName);

    return {
      motivation: rawResult.motivation,
      includedColumnNames,
      excludedColumnNames,
    };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    console.error("Prompt:", params.contents);
    throw new Error(
      `Failed to categorize columns: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Context needed for caching in the database (optional when not using Dryad index)
export type ScreenColumnsWithCacheParams = PromptTemplateParams & {
  dryadDatasetId?: number;
  dryadExcelFileId?: number;
  sheetName: string;
};

/**
 * Higher-order function that wraps the Gemini API call with database caching.
 * - Generates the prompt from params
 * - Builds the full Gemini API params object
 * - Computes a hash from the full params object (model, prompt, config)
 * - If database IDs are available: checks DB for cached result
 * - If hit: returns cached data
 * - If miss: stores result (if IDs available), returns it
 */
export async function screenColumnsWithCache(
  params: ScreenColumnsWithCacheParams,
): Promise<ScreenColumnsResponse> {
  const prompt = generateColumnCategorizationPrompt(params);
  const geminiParams = buildScreenColumnsParams(prompt);
  const hash = createHash("md5")
    .update(JSON.stringify(geminiParams))
    .digest("hex");

  const canCache =
    params.dryadDatasetId !== undefined &&
    params.dryadExcelFileId !== undefined;

  // Check for cached result (only if we have database IDs)
  if (canCache) {
    const cached = await findColumnCategorizationByHash(hash);
    if (cached) {
      console.log(`Found cached AI result for '${params.sheetName}'`);
      return {
        motivation: cached.motivation,
        includedColumnNames: cached.includedColumnNames,
        excludedColumnNames: cached.excludedColumnNames,
      };
    }
  }

  const result = await screenColumnsGemini(geminiParams);

  // Store in database (only if we have database IDs)
  if (canCache) {
    await insertColumnCategorizationResult({
      dryadDatasetId: params.dryadDatasetId!,
      dryadExcelFileId: params.dryadExcelFileId!,
      sheetName: params.sheetName,
      prompt,
      model: screenColumnsModel,
      motivation: result.motivation,
      includedColumnNames: result.includedColumnNames,
      excludedColumnNames: result.excludedColumnNames,
      hash,
    });
  }

  return result;
}

// ============ Review Results ============

// Schema for parsing review results from Gemini API
const reviewResultsResponseSchema = z.object({
  explanation: z.string(),
  falsePositiveTheory: z.string(),
  suspicionScore: z.number().int().min(1).max(10),
  impactScore: z.number().int().min(1).max(10),
});

export type ReviewResultsResponse = z.infer<typeof reviewResultsResponseSchema>;

const reviewResultsModel = "gemini-3-pro-preview";

const reviewResultsGeminiSchema = {
  type: Type.OBJECT,
  properties: {
    explanation: {
      type: Type.STRING,
      description: "Best explanation for the duplicates",
    },
    falsePositiveTheory: {
      type: Type.STRING,
      description:
        "Theory for how this could be a false positive with an innocent explanation",
    },
    suspicionScore: {
      type: Type.INTEGER,
      description:
        "Suspiciousness score from 1 to 10 expressing the probability of real issues (1 = certain false positive, 10 = 100% real issue)",
    },
    impactScore: {
      type: Type.INTEGER,
      description:
        "Impact score from 1 to 10 expressing how seriously the issue might impact the paper's conclusions (1 = no impact, 10 = conclusions entirely untrustworthy)",
    },
  },
  required: [
    "explanation",
    "falsePositiveTheory",
    "suspicionScore",
    "impactScore",
  ],
} as const;

type ReviewResultsParams = {
  model: string;
  contents: string;
  config: {
    temperature: number;
    responseMimeType: "application/json";
    responseSchema: typeof reviewResultsGeminiSchema;
  };
};

function buildReviewResultsParams(prompt: string): ReviewResultsParams {
  return {
    model: reviewResultsModel,
    contents: prompt,
    config: {
      temperature: 1,
      responseMimeType: "application/json",
      responseSchema: reviewResultsGeminiSchema,
    },
  };
}

async function reviewResultsGemini(
  params: ReviewResultsParams,
): Promise<ReviewResultsResponse> {
  try {
    const response = await geminiClient.models.generateContent(params);

    if (!response.text) {
      throw new Error("No text received from Gemini API");
    }

    // Parse and validate the structured JSON response
    const parsed = JSON.parse(response.text);
    return reviewResultsResponseSchema.parse(parsed);
  } catch (error) {
    console.error("Error calling Gemini API for review:", error);
    throw new Error(
      `Failed to review results: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Context needed for caching review results in the database
export type ReviewResultsWithCacheParams = {
  prompt: string;
  dryadDatasetId?: number;
  dryadExcelFileId?: number;
  sheetName: string;
};

/**
 * Higher-order function that wraps the review results Gemini API call with database caching.
 * - Builds the full Gemini API params object
 * - Computes a hash from the full params object (model, prompt, config)
 * - If database IDs are available: checks DB for cached result
 * - If hit: returns cached data
 * - If miss: stores result (if IDs available), returns it
 */
export async function reviewResultsWithCache(
  params: ReviewResultsWithCacheParams,
): Promise<ReviewResultsResponse> {
  const { prompt, sheetName } = params;
  const geminiParams = buildReviewResultsParams(prompt);
  const hash = createHash("md5")
    .update(JSON.stringify(geminiParams))
    .digest("hex");

  const canCache =
    params.dryadDatasetId !== undefined &&
    params.dryadExcelFileId !== undefined;

  // Check for cached result (only if we have database IDs)
  if (canCache) {
    const cached = await findReviewResultByHash(hash);
    if (cached) {
      console.log(`Found cached review result for sheet '${sheetName}'`);
      return {
        explanation: cached.explanation,
        falsePositiveTheory: cached.falsePositiveTheory,
        suspicionScore: cached.suspicionScore,
        impactScore: cached.impactScore,
      };
    }
  }

  const result = await reviewResultsGemini(geminiParams);

  // Store in database (only if we have database IDs)
  if (canCache) {
    await insertReviewResult({
      dryadDatasetId: params.dryadDatasetId!,
      dryadExcelFileId: params.dryadExcelFileId!,
      sheetName,
      prompt,
      model: reviewResultsModel,
      explanation: result.explanation,
      falsePositiveTheory: result.falsePositiveTheory,
      suspicionScore: result.suspicionScore,
      impactScore: result.impactScore,
      hash,
    });
  }

  return result;
}
