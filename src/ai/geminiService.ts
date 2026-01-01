import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import pThrottle from "p-throttle";
import { createHash } from "crypto";
import { config } from "../config/env";
import type { PromptTemplateParams } from "./promptTemplate";
import { generateColumnCategorizationPrompt } from "./promptTemplate";
import {
  findByHash,
  insertResult,
} from "../repositories/aiColumnCategorizationResults/aiColumnCategorizationResultsRepository";

// Internal schema for parsing raw Gemini API response (uses prompt field names)
const geminiResponseSchema = z.object({
  motivation: z.string(),
  unique: z.array(z.string()),
  shared: z.array(z.string()),
});

// Public response type with renamed fields
export type ScreenColumnsResponse = {
  motivation: string;
  includedColumnNames: string[];
  excludedColumnNames: string[];
};

const geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });

// The limit is officially 15 requests per minute but we have to give it some buffer
const throttle = pThrottle({
  limit: 10,
  interval: 60000, // 1 minute
  strict: true,
});

const model = "gemini-2.5-flash-lite";

async function screenColumnsGeminiInternal(
  prompt: string,
): Promise<ScreenColumnsResponse> {
  try {
    const response = await geminiClient.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            motivation: {
              type: Type.STRING,
            },
            unique: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },
            shared: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },
          },
          propertyOrdering: ["unique", "shared"],
          required: ["unique", "shared"],
        },
      },
    });

    if (!response.text) {
      throw new Error("No text received from Gemini API");
    }

    // Parse and validate the structured JSON response
    const parsed = JSON.parse(response.text);
    const rawResult = geminiResponseSchema.parse(parsed);

    // Map to the new field names
    return {
      motivation: rawResult.motivation,
      includedColumnNames: rawResult.unique,
      excludedColumnNames: rawResult.shared,
    };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error(
      `Failed to categorize columns: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Throttled version of the Gemini API call
const screenColumnsGemini = throttle(screenColumnsGeminiInternal);

// Context needed for caching in the database (optional when not using Dryad index)
export type ScreenColumnsWithCacheParams = PromptTemplateParams & {
  dryadDatasetId?: number;
  dryadExcelFileId?: number;
  sheetName: string;
};

/**
 * Higher-order function that wraps the Gemini API call with database caching.
 * - Generates the prompt from params
 * - Computes a hash from prompt + model
 * - If database IDs are available: checks DB for cached result
 * - If hit: returns cached data
 * - If miss: calls throttled Gemini API, stores result (if IDs available), returns it
 */
export async function screenColumnsWithCache(
  params: ScreenColumnsWithCacheParams,
): Promise<ScreenColumnsResponse> {
  const prompt = generateColumnCategorizationPrompt(params);
  const hash = createHash("md5").update(`${prompt}${model}`).digest("hex");

  const canCache =
    params.dryadDatasetId !== undefined &&
    params.dryadExcelFileId !== undefined;

  // Check for cached result (only if we have database IDs)
  if (canCache) {
    const cached = await findByHash(hash);
    if (cached) {
      console.log(`Found cached AI result for '${params.excelFileName}'`);
      return {
        motivation: cached.motivation,
        includedColumnNames: cached.includedColumnNames,
        excludedColumnNames: cached.excludedColumnNames,
      };
    }
  }

  // Call the throttled Gemini API
  const result = await screenColumnsGemini(prompt);

  // Store in database (only if we have database IDs)
  if (canCache) {
    await insertResult({
      dryadDatasetId: params.dryadDatasetId!,
      dryadExcelFileId: params.dryadExcelFileId!,
      sheetName: params.sheetName,
      prompt,
      model,
      motivation: result.motivation,
      includedColumnNames: result.includedColumnNames,
      excludedColumnNames: result.excludedColumnNames,
      hash,
    });
  }

  return result;
}
