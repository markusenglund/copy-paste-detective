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

// ============ Hash input ============

function buildHashInput(prompt: string): object {
  const config = getUseCaseConfig("reviewResults");
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

// ============ Cache wrapper ============

export type ReviewResultsWithCacheParams = {
  prompt: string;
  datasetId?: number;
  datasetFileId?: number;
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
    (params.datasetId != null && params.datasetFileId != null) ||
    (params.dryadDatasetId != null && params.dryadExcelFileId != null);

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
      dryadDatasetId: params.dryadDatasetId,
      dryadExcelFileId: params.dryadExcelFileId,
      datasetId: params.datasetId,
      datasetFileId: params.datasetFileId,
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
