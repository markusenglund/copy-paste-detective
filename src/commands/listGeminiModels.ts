import { GoogleGenAI } from "@google/genai";
import { config } from "../config/env";
import { logger } from "../utils/logger";

const geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });

async function listGeminiModels() {
  logger.info("Fetching available Gemini models...\n");

  const pager = await geminiClient.models.list();

  for await (const model of pager) {
    logger.info(`Model: ${model.name}`);
    logger.info(`  Display Name: ${model.displayName}`);
    logger.info(`  Supported Methods: ${model.supportedActions?.join(", ") || "N/A"}`);
    logger.info("");
  }
}

listGeminiModels().catch((err) => logger.error(err));

