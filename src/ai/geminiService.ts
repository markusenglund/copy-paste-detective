import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { config } from "../config/env.js";
import type { PromptTemplateParams } from "./promptTemplate.js";
import { generateColumnCategorizationPrompt } from "./promptTemplate.js";

const columnCategorizationSchema = z.object({
  unique: z.array(z.string()),
  shared: z.array(z.string()),
});

export type ColumnCategorization = z.infer<typeof columnCategorizationSchema>;

export class GeminiService {
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }

  async categorizeColumns(
    params: PromptTemplateParams
  ): Promise<ColumnCategorization> {
    const prompt = generateColumnCategorizationPrompt(params);

    try {
      const response = await this.client.models.generateContent({
        model: "gemini-2.0-flash-001",
        contents: prompt,
      });

      if (!response.text) {
        throw new Error("No text received from Gemini API");
      }

      // Parse the JSON response
      const parsed = this.parseColumnCategorizationResponse(response.text);
      return parsed;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw new Error(
        `Failed to categorize columns: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private parseColumnCategorizationResponse(
    text: string
  ): ColumnCategorization {
    try {
      // Extract JSON from the response text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      // Validate using Zod schema
      const result = columnCategorizationSchema.parse(parsed);
      return result;
    } catch (error) {
      console.error("Failed to parse Gemini response:", text);
      if (error instanceof z.ZodError) {
        const errorDetails = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        throw new Error(`Invalid response format: ${errorDetails}`);
      }
      throw new Error(
        `Failed to parse response: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
