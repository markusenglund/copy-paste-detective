import type { AiProvider } from "./providers/types";
import { geminiProvider } from "./providers/geminiProvider";
import { claudeProvider } from "./providers/claudeProvider";
import { openaiProvider } from "./providers/openaiProvider";

export type ProviderName = "gemini" | "claude" | "openai";

export type UseCaseName =
  | "screenColumns"
  | "reviewResults"
  | "reviewPdf"
  | "classifyMetaAnalysis"
  | "identifyFormulaRelationships";

type UseCaseConfig = {
  provider: ProviderName;
  model: string;
  temperature: number;
};

const defaults: Record<UseCaseName, UseCaseConfig> = {
  screenColumns: {
    provider: "gemini",
    model: "gemini-2.5-flash-lite",
    temperature: 0,
  },
  reviewResults: {
    provider: "gemini",
    model: "gemini-3.1-pro-preview",
    temperature: 1,
  },
  reviewPdf: {
    provider: "gemini",
    model: "gemini-3.1-pro-preview",
    temperature: 1,
  },
  classifyMetaAnalysis: {
    provider: "gemini",
    model: "gemini-2.5-flash-lite",
    temperature: 0,
  },
  identifyFormulaRelationships: {
    provider: "gemini",
    model: "gemini-3.1-pro-preview",
    temperature: 1,
  },
};

const envKeyMap: Record<UseCaseName, { provider: string; model: string }> = {
  screenColumns: {
    provider: "AI_SCREEN_COLUMNS_PROVIDER",
    model: "AI_SCREEN_COLUMNS_MODEL",
  },
  reviewResults: {
    provider: "AI_REVIEW_RESULTS_PROVIDER",
    model: "AI_REVIEW_RESULTS_MODEL",
  },
  reviewPdf: {
    provider: "AI_REVIEW_PDF_PROVIDER",
    model: "AI_REVIEW_PDF_MODEL",
  },
  classifyMetaAnalysis: {
    provider: "AI_CLASSIFY_META_ANALYSIS_PROVIDER",
    model: "AI_CLASSIFY_META_ANALYSIS_MODEL",
  },
  identifyFormulaRelationships: {
    provider: "AI_IDENTIFY_FORMULA_RELATIONSHIPS_PROVIDER",
    model: "AI_IDENTIFY_FORMULA_RELATIONSHIPS_MODEL",
  },
};

function isProviderName(value: string): value is ProviderName {
  return ["gemini", "claude", "openai"].includes(value);
}

export function getUseCaseConfig(name: UseCaseName): UseCaseConfig {
  const config = { ...defaults[name] };
  const keys = envKeyMap[name];

  const providerEnv = process.env[keys.provider];
  if (providerEnv) {
    if (!isProviderName(providerEnv)) {
      throw new Error(
        `Invalid provider "${providerEnv}" in ${keys.provider}. Must be one of: gemini, claude, openai`,
      );
    }
    config.provider = providerEnv;
  }

  const modelEnv = process.env[keys.model];
  if (modelEnv) {
    config.model = modelEnv;
  }

  return config;
}

export function getProvider(name: UseCaseName): AiProvider {
  const config = getUseCaseConfig(name);

  switch (config.provider) {
    case "gemini":
      return geminiProvider;
    case "claude":
      return claudeProvider;
    case "openai":
      return openaiProvider;
  }
}
