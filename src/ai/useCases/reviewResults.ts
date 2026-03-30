import { z } from "zod";
import { createHash } from "crypto";
import {
  findByHash as findReviewResultByHash,
  insertResult as insertReviewResult,
} from "../../repositories/aiReviewResults/aiReviewResultsRepository";
import { getProvider, getUseCaseConfig } from "../aiConfig";
import { logger } from "../../utils/logger";

// ============ Response schema & types ============

const responseSchema = z.object({
  response: z.string(),
  truePositiveProbability: z.number().min(0).max(1),
});

export type ReviewResultsResponse = z.infer<typeof responseSchema>;

// ============ Hash input (must match legacy geminiService.ts exactly) ============

const hashResponseSchema = {
  type: "OBJECT",
  properties: {
    response: {
      type: "STRING",
      description: "Full response to the prompt",
    },
    truePositiveProbability: {
      type: "NUMBER",
      description:
        "The probability between 0 and 1 that the data contain real issues.",
    },
  },
  propertyOrdering: ["response", "truePositiveProbability"],
  required: ["response", "truePositiveProbability"],
} as const;

function buildHashInput(prompt: string): object {
  const config = getUseCaseConfig("reviewResults");
  return {
    model: config.model,
    contents: prompt,
    config: {
      temperature: config.temperature,
      responseMimeType: "application/json",
      responseSchema: hashResponseSchema,
    },
  };
}

// ============ Cache wrapper ============

export type ReviewResultsWithCacheParams = {
  prompt: string;
  dryadDatasetId?: number;
  dryadExcelFileId?: number;
  sheetName: string;
};

export async function reviewResultsWithCache(
  params: ReviewResultsWithCacheParams,
): Promise<ReviewResultsResponse> {
  const { prompt, sheetName } = params;
  const hashInput = buildHashInput(prompt);
  const hash = createHash("md5")
    .update(JSON.stringify(hashInput))
    .digest("hex");

  const canCache =
    params.dryadDatasetId !== undefined &&
    params.dryadExcelFileId !== undefined;

  if (canCache) {
    const cached = await findReviewResultByHash(hash);
    if (cached) {
      logger.info(`Found cached review result for sheet '${sheetName}'`);
      return {
        response: cached.response,
        truePositiveProbability: cached.truePositiveProbability,
      };
    }
  }

  const config = getUseCaseConfig("reviewResults");
  const provider = getProvider("reviewResults");
  const result = await provider.generateText<ReviewResultsResponse>({
    model: config.model,
    prompt,
    temperature: config.temperature,
    responseSchema,
  });

  if (canCache) {
    await insertReviewResult({
      dryadDatasetId: params.dryadDatasetId!,
      dryadExcelFileId: params.dryadExcelFileId!,
      sheetName,
      prompt,
      model: config.model,
      response: result.response,
      truePositiveProbability: result.truePositiveProbability,
      hash,
    });
  }

  return result;
}
