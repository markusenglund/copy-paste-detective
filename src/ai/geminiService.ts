import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { config } from "../config/env";
import type { PromptTemplateParams } from "./promptTemplate";
import { generateColumnCategorizationPrompt } from "./promptTemplate";

const columnCategorizationSchema = z.object({
  motivation: z.string(),
  unique: z.array(z.string()),
  shared: z.array(z.string()),
});

export type ColumnCategorization = z.infer<typeof columnCategorizationSchema>;
const geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function categorizeColumns(
  params: PromptTemplateParams,
): Promise<ColumnCategorization> {
  const prompt = generateColumnCategorizationPrompt(params);

  try {
    const response = await geminiClient.models.generateContent({
      model: "gemini-2.0-flash-001",
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

    // Parse and validate the structured JSON response
    const parsed = JSON.parse(response.text);
    const result = columnCategorizationSchema.parse(parsed);
    return result;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error(
      `Failed to categorize columns: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
