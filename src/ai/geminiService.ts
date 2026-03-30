import { ApiError, GoogleGenAI, Type } from "@google/genai";
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
import {
  findByHash as findMetaAnalysisByHash,
  insertResult as insertMetaAnalysisResult,
} from "../repositories/aiMetaAnalysisResults/aiMetaAnalysisResultsRepository";
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
    if (error instanceof ApiError) {
      if (error.status === 503) {
        throw error;
      }
    }

    logger.error(`Prompt: ${params.contents}`);
    throw new Error(
      `Failed to screen columns: ${error instanceof Error ? error.message : "Unknown error"}`,
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
  response: z.string(),
  truePositiveProbability: z.number().min(0).max(1),
});

export type ReviewResultsResponse = z.infer<typeof reviewResultsResponseSchema>;

const reviewResultsModel = "gemini-3.1-pro-preview";

const reviewResultsGeminiSchema = {
  type: Type.OBJECT,
  properties: {
    response: {
      type: Type.STRING,
      description: "Full response to the prompt",
    },
    truePositiveProbability: {
      type: Type.NUMBER,
      description:
        "The probability between 0 and 1 that the data contain real issues.",
    },
  },
  propertyOrdering: ["response", "truePositiveProbability"],
  required: ["response", "truePositiveProbability"],
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
        response: cached.response,
        truePositiveProbability: cached.truePositiveProbability,
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
      response: result.response,
      truePositiveProbability: result.truePositiveProbability,
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

const pdfReviewModel = "gemini-3.1-pro-preview";

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
      description: "Impact score from 1 to 5",
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

// ============ Meta-Analysis Classification ============

const metaAnalysisResponseSchema = z.object({
  reasoning: z.string(),
  isMetaAnalysis: z.boolean(),
});

export type MetaAnalysisResponse = z.infer<typeof metaAnalysisResponseSchema>;

const metaAnalysisModel = "gemini-2.5-flash-lite";

const metaAnalysisGeminiSchema = {
  type: Type.OBJECT,
  properties: {
    reasoning: {
      type: Type.STRING,
      description: "Brief reasoning for the classification",
    },
    isMetaAnalysis: {
      type: Type.BOOLEAN,
      description:
        "Whether the dataset is from a meta-analysis or systematic review",
    },
  },
  propertyOrdering: ["reasoning", "isMetaAnalysis"],
  required: ["reasoning", "isMetaAnalysis"],
} as const;

type MetaAnalysisParams = {
  model: string;
  contents: string;
  config: {
    temperature: number;
    responseMimeType: "application/json";
    responseSchema: typeof metaAnalysisGeminiSchema;
  };
};

function buildMetaAnalysisPrompt({
  title,
  abstract,
  dataDescription,
}: {
  title: string;
  abstract: string;
  dataDescription?: string;
}): string {
  const sections = [
    `Classify whether this scientific dataset is from a meta-analysis/systematic review (compiles data from multiple published studies) vs an original empirical study.`,
    `Title: ${title}`,
    `Abstract: ${abstract}`,
  ];
  if (dataDescription) {
    sections.push(`Data description: ${dataDescription}`);
  }
  return sections.join("\n\n");
}

function buildMetaAnalysisParams(prompt: string): MetaAnalysisParams {
  return {
    model: metaAnalysisModel,
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: metaAnalysisGeminiSchema,
    },
  };
}

async function classifyMetaAnalysisGemini(
  params: MetaAnalysisParams,
): Promise<MetaAnalysisResponse> {
  try {
    const response = await geminiClient.models.generateContent(params);

    if (!response.text) {
      throw new Error("No text received from Gemini API");
    }

    const parsed = JSON.parse(response.text);
    return metaAnalysisResponseSchema.parse(parsed);
  } catch (error) {
    logger.error(
      `Error calling Gemini API for meta-analysis classification: ${error}`,
    );
    throw new Error(
      `Failed to classify meta-analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export type ClassifyMetaAnalysisWithCacheParams = {
  title: string;
  abstract: string;
  dataDescription?: string;
  dryadDatasetId?: number;
};

export async function classifyMetaAnalysisWithCache(
  params: ClassifyMetaAnalysisWithCacheParams,
): Promise<MetaAnalysisResponse> {
  const { title, abstract, dataDescription } = params;
  const prompt = buildMetaAnalysisPrompt({ title, abstract, dataDescription });
  const geminiParams = buildMetaAnalysisParams(prompt);
  const hash = createHash("md5")
    .update(JSON.stringify(geminiParams))
    .digest("hex");

  const canCache = params.dryadDatasetId !== undefined;

  if (canCache) {
    const cached = await findMetaAnalysisByHash(hash);
    if (cached) {
      logger.info(
        `Found cached meta-analysis result for dataset ${params.dryadDatasetId}`,
      );
      return {
        reasoning: cached.reasoning,
        isMetaAnalysis: cached.isMetaAnalysis,
      };
    }
  }

  const result = await classifyMetaAnalysisGemini(geminiParams);

  if (canCache) {
    await insertMetaAnalysisResult({
      dryadDatasetId: params.dryadDatasetId!,
      prompt,
      model: metaAnalysisModel,
      reasoning: result.reasoning,
      isMetaAnalysis: result.isMetaAnalysis,
      hash,
    });
  }

  return result;
}
