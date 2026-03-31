import { z } from "zod";
import { createHash } from "crypto";
import {
  findByHash as findPdfReviewResultByHash,
  insertResult as insertPdfReviewResult,
} from "../../repositories/aiPdfReviewResults/aiPdfReviewResultsRepository";
import { getProvider, getUseCaseConfig } from "../aiConfig";
import { logger } from "../../utils/logger";

// ============ Response schema & types ============

const responseSchema = z.object({
  impactScore: z.number().int().min(1).max(10),
  response: z.string(),
});

export type PdfReviewResponse = z.infer<typeof responseSchema>;

// ============ Hash input ============

function buildHashInput(conversation: {
  originalUserPrompt: string;
  modelResponse: string;
  followUpPrompt: string;
}): object {
  const config = getUseCaseConfig("reviewPdf");
  return {
    model: config.model,
    conversation,
    config: {
      temperature: config.temperature,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(responseSchema),
    },
  };
}

// ============ Cache wrapper ============

export type ReviewPdfWithCacheParams = {
  conversation: {
    originalUserPrompt: string;
    modelResponse: string;
    followUpPrompt: string;
  };
  pdfBuffer: Buffer;
  pdfFileName: string;
  aiReviewResultId: number;
  articleId: number;
};

export async function reviewPdfWithCache(
  params: ReviewPdfWithCacheParams,
): Promise<PdfReviewResponse> {
  const { conversation, pdfBuffer, pdfFileName, aiReviewResultId, articleId } =
    params;

  // STEP 1: Calculate deterministic hash BEFORE uploading
  const hashInput = buildHashInput(conversation);
  const pdfHash = createHash("md5").update(pdfBuffer).digest("hex");
  const hash = createHash("md5")
    .update(JSON.stringify({ ...hashInput, pdfHash }))
    .digest("hex");

  // STEP 2: Check cache with deterministic hash
  const cached = await findPdfReviewResultByHash(hash);
  if (cached) {
    logger.info(`Found cached PDF review result for article ${articleId}`);
    return {
      impactScore: cached.impactScore,
      response: cached.response,
    };
  }

  // STEP 3: Cache miss - call provider with multi-turn conversation
  const config = getUseCaseConfig("reviewPdf");
  const provider = getProvider("reviewPdf");
  const result = await provider.generateMultiTurn<PdfReviewResponse>({
    model: config.model,
    messages: [
      { role: "user", content: conversation.originalUserPrompt },
      { role: "assistant", content: conversation.modelResponse },
      {
        role: "user",
        content: conversation.followUpPrompt,
        pdfBuffer,
        pdfFileName,
      },
    ],
    temperature: config.temperature,
    responseSchema,
  });

  // STEP 4: Store with deterministic hash
  const promptForStorage = JSON.stringify({
    originalUserPrompt: conversation.originalUserPrompt,
    modelResponse: conversation.modelResponse,
    followUpPrompt: conversation.followUpPrompt,
  });

  await insertPdfReviewResult({
    aiReviewResultId,
    articleId,
    prompt: promptForStorage,
    model: config.model,
    impactScore: result.impactScore,
    response: result.response,
    hash,
  });

  return result;
}
