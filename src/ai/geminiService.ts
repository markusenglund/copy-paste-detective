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
import {
  findByHash as findPdfReviewResultByHash,
  insertResult as insertPdfReviewResult,
} from "../repositories/aiPdfReviewResults/aiPdfReviewResultsRepository";
import { logger } from "../utils/logger";

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
      logger.error(`Error parsing Gemini API response: ${error}`);
      logger.error(`Response: ${response.text}`);
      logger.error(`Prompt: ${params.contents}`);
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
    logger.error(`Error calling Gemini API: ${error}`);
    logger.error(`Prompt: ${params.contents}`);
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
      logger.info(`Found cached AI result for '${params.sheetName}'`);
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
    logger.error(`Error calling Gemini API for review: ${error}`);
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
      logger.info(`Found cached review result for sheet '${sheetName}'`);
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

// ============ PDF Review ============

// Schema for parsing PDF review results from Gemini API
const pdfReviewResponseSchema = z.object({
  impactScore: z.number().int().min(1).max(10),
  response: z.string(),
});

export type PdfReviewResponse = z.infer<typeof pdfReviewResponseSchema>;

const pdfReviewModel = "gemini-3-pro-preview";

const pdfReviewGeminiSchema = {
  type: Type.OBJECT,
  properties: {
    response: {
      type: Type.STRING,
      description:
        "Full analysis of affected conclusions, overall impact, and supporting evidence",
    },
    impactScore: {
      type: Type.INTEGER,
      description:
        "Impact score from 1 to 10 (1 = no impact, 10 = conclusions entirely untrustworthy)",
    },
  },
  propertyOrdering: ["response", "impactScore"],
  required: ["response", "impactScore"],
} as const;

type PdfReviewParams = {
  model: string;
  contents: Array<{
    role: string;
    parts: Array<{
      text?: string;
      fileData?: { mimeType: string; fileUri: string };
    }>;
  }>;
  config: {
    temperature: number;
    responseMimeType: "application/json";
    responseSchema: typeof pdfReviewGeminiSchema;
  };
};

function buildPdfReviewParams(
  conversation: {
    originalUserPrompt: string;
    modelResponse: string;
    followUpPrompt: string;
  },
  fileUri: string,
): PdfReviewParams {
  return {
    model: pdfReviewModel,
    contents: [
      {
        role: "user",
        parts: [{ text: conversation.originalUserPrompt }],
      },
      {
        role: "model",
        parts: [{ text: conversation.modelResponse }],
      },
      {
        role: "user",
        parts: [
          { text: conversation.followUpPrompt },
          { fileData: { mimeType: "application/pdf", fileUri } },
        ],
      },
    ],
    config: {
      temperature: 1,
      responseMimeType: "application/json",
      responseSchema: pdfReviewGeminiSchema,
    },
  };
}

type PdfReviewHashParams = {
  model: string;
  conversation: {
    originalUserPrompt: string;
    modelResponse: string;
    followUpPrompt: string;
  };
  config: {
    temperature: number;
    responseMimeType: "application/json";
    responseSchema: typeof pdfReviewGeminiSchema;
  };
};

function buildPdfReviewHashParams(conversation: {
  originalUserPrompt: string;
  modelResponse: string;
  followUpPrompt: string;
}): PdfReviewHashParams {
  return {
    model: pdfReviewModel,
    conversation,
    config: {
      temperature: 1,
      responseMimeType: "application/json",
      responseSchema: pdfReviewGeminiSchema,
    },
  };
}

async function reviewPdfGemini(
  params: PdfReviewParams,
): Promise<PdfReviewResponse> {
  try {
    const response = await geminiClient.models.generateContent(params);

    if (!response.text) {
      throw new Error("No text received from Gemini API");
    }

    // Log token usage
    if (response.usageMetadata) {
      logger.info(
        `PDF review token usage: ` +
          `input=${response.usageMetadata.promptTokenCount ?? 0}, ` +
          `output=${response.usageMetadata.candidatesTokenCount ?? 0}, ` +
          `total=${response.usageMetadata.totalTokenCount ?? 0}` +
          (response.usageMetadata.cachedContentTokenCount
            ? `, cached=${response.usageMetadata.cachedContentTokenCount}`
            : ""),
      );
    }

    // Parse and validate the structured JSON response
    const parsed = JSON.parse(response.text);
    return pdfReviewResponseSchema.parse(parsed);
  } catch (error) {
    logger.error(`Error calling Gemini API for PDF review: ${error}`);
    throw new Error(
      `Failed to review PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Context needed for caching PDF review results in the database
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

/**
 * Higher-order function that wraps the PDF review Gemini API call with database caching.
 * - Computes a deterministic hash from conversation, config, and PDF content
 * - Checks DB for cached result
 * - If hit: returns cached data (no upload or API call)
 * - If miss: uploads PDF file to Gemini, calls API, stores result
 */
export async function reviewPdfWithCache(
  params: ReviewPdfWithCacheParams,
): Promise<PdfReviewResponse> {
  const { conversation, pdfBuffer, pdfFileName, aiReviewResultId, articleId } =
    params;

  // STEP 1: Calculate deterministic hash BEFORE uploading
  const hashParams = buildPdfReviewHashParams(conversation);
  const pdfHash = createHash("md5").update(pdfBuffer).digest("hex");
  const hash = createHash("md5")
    .update(JSON.stringify({ ...hashParams, pdfHash }))
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

  // STEP 3: Cache miss - upload PDF to Gemini
  const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });
  const uploadResult = await geminiClient.files.upload({
    file: pdfBlob,
    config: {
      displayName: pdfFileName,
    },
  });

  if (!uploadResult.uri) {
    throw new Error("Failed to upload PDF file: no URI returned");
  }

  const fileUri = uploadResult.uri;

  // STEP 4: Build full params with fileUri and call API
  const geminiParams = buildPdfReviewParams(conversation, fileUri);
  const result = await reviewPdfGemini(geminiParams);

  // STEP 5: Store with deterministic hash
  const promptForStorage = JSON.stringify({
    originalUserPrompt: conversation.originalUserPrompt,
    modelResponse: conversation.modelResponse,
    followUpPrompt: conversation.followUpPrompt,
  });

  await insertPdfReviewResult({
    aiReviewResultId,
    articleId,
    prompt: promptForStorage,
    model: pdfReviewModel,
    impactScore: result.impactScore,
    response: result.response,
    hash,
  });

  return result;
}
