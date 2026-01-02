import { GoogleGenAI } from "@google/genai";
import { config } from "../config/env";

const geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });

async function listGeminiModels() {
  console.log("Fetching available Gemini models...\n");

  const pager = await geminiClient.models.list();

  for await (const model of pager) {
    console.log(`Model: ${model.name}`);
    console.log(`  Display Name: ${model.displayName}`);
    console.log(`  Supported Methods: ${model.supportedActions?.join(", ") || "N/A"}`);
    console.log("");
  }
}

listGeminiModels().catch(console.error);

