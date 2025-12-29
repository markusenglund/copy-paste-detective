import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import pThrottle from "p-throttle";
import { createHash } from "crypto";
import { writeFile, mkdir, readFile } from "fs/promises";
import { dirname } from "path";
import { config } from "../config/env";
import type { PromptTemplateParams } from "./promptTemplate";
import { generateColumnCategorizationPrompt } from "./promptTemplate";
import { slugify } from "../utils/slugify";

const screenColumnsResponseSchema = z.object({
  motivation: z.string(),
  unique: z.array(z.string()),
  shared: z.array(z.string()),
});

export type ScreenColumnsResponse = z.infer<typeof screenColumnsResponseSchema>;
const geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });

// The limit is officially 15 requests per minute but we have to give it some buffer
const throttle = pThrottle({
  limit: 10,
  interval: 60000, // 1 minute
  strict: true,
});

const model = "gemini-2.5-flash-lite";

async function screenColumnsGeminiInternal(
  params: PromptTemplateParams,
): Promise<ScreenColumnsResponse> {
  const prompt = generateColumnCategorizationPrompt(params);

  // Check if the prompt is in the file cache
  const cacheFolder = `.cache/categorized-columns/${slugify(params.paperName.slice(0, 32))}`;
  const promptHash = createHash("md5").update(prompt).digest("hex").slice(0, 8);
  const filenameBase = `${slugify(params.excelFileName.slice(0, 32))}-${promptHash}`;
  const promptFilePath = `${cacheFolder}/${filenameBase}-prompt.md`;

  await mkdir(dirname(promptFilePath), { recursive: true });
  await writeFile(promptFilePath, prompt, "utf-8");
  const responseFilePath = `${cacheFolder}/${filenameBase}-${model}.json`;

  try {
    const cachedResponse = await readFile(responseFilePath, "utf-8");
    console.log(`Found a cached version of '${params.excelFileName}'`);
    const parsed = JSON.parse(cachedResponse);
    const result = screenColumnsResponseSchema.parse(parsed);
    return result;
  } catch (error) {
    // File doesn't exist or is invalid, proceed with API call
    if (error instanceof Error && "code" in error && error.code !== "ENOENT") {
      console.warn("Error reading cached response, will fetch new one:", error);
    }
  }

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

    // Write the response to the file
    await mkdir(dirname(responseFilePath), { recursive: true });
    await writeFile(responseFilePath, response.text, "utf-8");

    // Parse and validate the structured JSON response
    const parsed = JSON.parse(response.text);
    const result = screenColumnsResponseSchema.parse(parsed);
    return result;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error(
      `Failed to categorize columns: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export const screenColumnsGemini = throttle(screenColumnsGeminiInternal);
