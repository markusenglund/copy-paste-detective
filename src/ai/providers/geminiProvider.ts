import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { config } from "../../config/env";
import { logger } from "../../utils/logger";
import type { AiProvider, AiTextRequest, AiMultiTurnRequest } from "./types";

const geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });

export const geminiProvider: AiProvider = {
  async generateText<T>(request: AiTextRequest): Promise<T> {
    const jsonSchema = z.toJSONSchema(request.responseSchema);

    try {
      const response = await geminiClient.models.generateContent({
        model: request.model,
        contents: request.prompt,
        config: {
          temperature: request.temperature,
          responseMimeType: "application/json" as const,
          responseJsonSchema: jsonSchema,
        },
      });

      if (!response.text) {
        throw new Error("No text received from Gemini API");
      }

      const parsed = JSON.parse(response.text);
      const zodResult = request.responseSchema.safeParse(parsed);
      if (!zodResult.success) {
        logger.error(
          `Zod validation failed for Gemini response. Response: ${response.text}`,
        );
        throw zodResult.error;
      }
      return zodResult.data as T;
    } catch (error) {
      if (error instanceof ApiError && error.status === 503) {
        throw error;
      }

      logger.error(`Prompt: ${request.prompt}`);
      throw new Error(
        `Failed to call Gemini API: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },

  async generateMultiTurn<T>(request: AiMultiTurnRequest): Promise<T> {
    const jsonSchema = z.toJSONSchema(request.responseSchema);

    // Upload any PDFs first
    const fileUris = new Map<number, string>();
    for (let i = 0; i < request.messages.length; i++) {
      const msg = request.messages[i];
      if (msg.pdfBuffer) {
        const pdfBlob = new Blob([msg.pdfBuffer], { type: "application/pdf" });
        const uploadResult = await geminiClient.files.upload({
          file: pdfBlob,
          config: { displayName: msg.pdfFileName ?? "document.pdf" },
        });
        if (!uploadResult.uri) {
          throw new Error("Failed to upload PDF file: no URI returned");
        }
        fileUris.set(i, uploadResult.uri);
      }
    }

    // Build contents array
    const contents = request.messages.map((msg, i) => {
      const parts: Array<{
        text?: string;
        fileData?: { mimeType: string; fileUri: string };
      }> = [{ text: msg.content }];

      const fileUri = fileUris.get(i);
      if (fileUri) {
        parts.push({
          fileData: { mimeType: "application/pdf", fileUri },
        });
      }

      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts,
      };
    });

    try {
      const response = await geminiClient.models.generateContent({
        model: request.model,
        contents,
        config: {
          temperature: request.temperature,
          responseMimeType: "application/json" as const,
          responseJsonSchema: jsonSchema,
        },
      });

      if (!response.text) {
        throw new Error("No text received from Gemini API");
      }

      if (response.usageMetadata) {
        logger.info(
          `Token usage: ` +
            `input=${response.usageMetadata.promptTokenCount ?? 0}, ` +
            `output=${response.usageMetadata.candidatesTokenCount ?? 0}, ` +
            `total=${response.usageMetadata.totalTokenCount ?? 0}` +
            (response.usageMetadata.cachedContentTokenCount
              ? `, cached=${response.usageMetadata.cachedContentTokenCount}`
              : ""),
        );
      }

      const parsed = JSON.parse(response.text);
      return request.responseSchema.parse(parsed) as T;
    } catch (error) {
      logger.error(`Error calling Gemini API (multi-turn): ${error}`);
      throw new Error(
        `Failed to call Gemini API: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
};
