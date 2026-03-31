import { z } from "zod";
import { createHash } from "crypto";
import {
  findByHash as findMetaAnalysisByHash,
  insertResult as insertMetaAnalysisResult,
} from "../../repositories/aiMetaAnalysisResults/aiMetaAnalysisResultsRepository";
import { getProvider, getUseCaseConfig } from "../aiConfig";
import { logger } from "../../utils/logger";

// ============ Response schema & types ============

const responseSchema = z.object({
  reasoning: z.string(),
  isMetaAnalysis: z.boolean(),
});

export type MetaAnalysisResponse = z.infer<typeof responseSchema>;

// ============ Hash input ============

function buildHashInput(prompt: string): object {
  const config = getUseCaseConfig("classifyMetaAnalysis");
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

// ============ Prompt ============

function buildPrompt({
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

// ============ Cache wrapper ============

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
  const prompt = buildPrompt({ title, abstract, dataDescription });
  const hashInput = buildHashInput(prompt);
  const hash = createHash("md5")
    .update(JSON.stringify(hashInput))
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

  const config = getUseCaseConfig("classifyMetaAnalysis");
  const provider = getProvider("classifyMetaAnalysis");
  const result = await provider.generateText<MetaAnalysisResponse>({
    model: config.model,
    prompt,
    temperature: config.temperature,
    responseSchema,
  });

  if (canCache) {
    await insertMetaAnalysisResult({
      dryadDatasetId: params.dryadDatasetId!,
      prompt,
      model: config.model,
      reasoning: result.reasoning,
      isMetaAnalysis: result.isMetaAnalysis,
      hash,
    });
  }

  return result;
}
