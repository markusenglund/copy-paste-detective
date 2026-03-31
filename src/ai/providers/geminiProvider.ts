import { ApiError, GoogleGenAI, Type } from "@google/genai";
import type { z } from "zod";
import {
  ZodArray,
  ZodBoolean,
  ZodEnum,
  ZodNumber,
  ZodObject,
  ZodString,
} from "zod";
import { config } from "../../config/env";
import { logger } from "../../utils/logger";
import type { AiProvider, AiTextRequest, AiMultiTurnRequest } from "./types";

const geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });

type GeminiSchemaProperty = {
  type: string;
  description?: string;
  enum?: string[];
  items?: GeminiSchemaProperty;
  properties?: Record<string, GeminiSchemaProperty>;
  required?: string[];
};

type GeminiSchema = GeminiSchemaProperty & {
  propertyOrdering?: string[];
};

function zodToGeminiSchema(schema: z.ZodType): GeminiSchema {
  if (schema instanceof ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>;
    const properties: Record<string, GeminiSchemaProperty> = {};
    const required: string[] = [];
    const propertyOrdering: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      propertyOrdering.push(key);
      properties[key] = zodPropertyToGemini(value);
      if (!value.isOptional()) {
        required.push(key);
      }
    }

    return {
      type: Type.OBJECT,
      properties,
      propertyOrdering,
      required,
    };
  }

  throw new Error(`Unsupported top-level Zod type: ${schema.constructor.name}`);
}

function zodPropertyToGemini(schema: z.ZodType): GeminiSchemaProperty {
  // Unwrap .describe() wrappers
  const description = schema.description;

  if (schema instanceof ZodString) {
    return { type: Type.STRING, ...(description && { description }) };
  }

  if (schema instanceof ZodNumber) {
    const checks = (schema as ZodNumber)._def.checks;
    const isInt = checks?.some((c: { kind: string }) => c.kind === "int");
    return {
      type: isInt ? Type.INTEGER : Type.NUMBER,
      ...(description && { description }),
    };
  }

  if (schema instanceof ZodBoolean) {
    return { type: Type.BOOLEAN, ...(description && { description }) };
  }

  if (schema instanceof ZodEnum) {
    return {
      type: Type.STRING,
      enum: schema._def.values as string[],
      ...(description && { description }),
    };
  }

  if (schema instanceof ZodArray) {
    return {
      type: Type.ARRAY,
      items: zodPropertyToGemini(schema._def.type),
      ...(description && { description }),
    };
  }

  if (schema instanceof ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>;
    const properties: Record<string, GeminiSchemaProperty> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodPropertyToGemini(value);
      if (!value.isOptional()) {
        required.push(key);
      }
    }

    return {
      type: Type.OBJECT,
      properties,
      required,
      ...(description && { description }),
    };
  }

  throw new Error(
    `Unsupported Zod type for Gemini schema conversion: ${schema.constructor.name}`,
  );
}

export const geminiProvider: AiProvider = {
  async generateText<T>(request: AiTextRequest): Promise<T> {
    const geminiSchema = zodToGeminiSchema(request.responseSchema);

    try {
      const response = await geminiClient.models.generateContent({
        model: request.model,
        contents: request.prompt,
        config: {
          temperature: request.temperature,
          responseMimeType: "application/json" as const,
          responseSchema: geminiSchema,
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
    const geminiSchema = zodToGeminiSchema(request.responseSchema);

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
          responseSchema: geminiSchema,
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
