import type { z } from "zod";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import type {
  ResponseCreateParamsNonStreaming,
  ResponseInput,
  ResponseInputMessageContentList,
  ResponseTextConfig,
} from "openai/resources/responses/responses";
import {
  ZodArray,
  ZodBoolean,
  ZodEnum,
  ZodNumber,
  ZodObject,
  ZodString,
} from "zod";
import type {
  AiMultiTurnRequest,
  AiProvider,
  AiTextRequest,
} from "./types";
import { config } from "../../config/env";
import { logger } from "../../utils/logger";

type JsonSchemaProperty = {
  type?: string | string[];
  description?: string;
  enum?: string[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
};

type JsonSchema = JsonSchemaProperty;

function zodToJsonSchema(schema: z.ZodType): JsonSchema {
  if (schema instanceof ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>;
    const properties: Record<string, JsonSchemaProperty> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodPropertyToJsonSchema(value);
      if (!value.isOptional()) required.push(key);
    }

    return {
      type: "object",
      properties,
      required,
      additionalProperties: false,
    };
  }

  throw new Error(
    `Unsupported top-level Zod type: ${schema.constructor.name}. Expected ZodObject.`,
  );
}

function zodPropertyToJsonSchema(schema: z.ZodType): JsonSchemaProperty {
  const description = schema.description;

  if (schema instanceof ZodString) {
    return { type: "string", ...(description && { description }) };
  }

  if (schema instanceof ZodNumber) {
    const checks = (schema as ZodNumber)._def.checks;
    const isInt = checks?.some((c: { kind: string }) => c.kind === "int");
    return {
      type: isInt ? "integer" : "number",
      ...(description && { description }),
    };
  }

  if (schema instanceof ZodBoolean) {
    return { type: "boolean", ...(description && { description }) };
  }

  if (schema instanceof ZodEnum) {
    return {
      type: "string",
      enum: schema._def.values as string[],
      ...(description && { description }),
    };
  }

  if (schema instanceof ZodArray) {
    return {
      type: "array",
      items: zodPropertyToJsonSchema(schema._def.type),
      ...(description && { description }),
    };
  }

  if (schema instanceof ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>;
    const properties: Record<string, JsonSchemaProperty> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodPropertyToJsonSchema(value);
      if (!value.isOptional()) required.push(key);
    }

    return {
      type: "object",
      properties,
      required,
      additionalProperties: false,
      ...(description && { description }),
    };
  }

  throw new Error(
    `Unsupported Zod type for JSON schema conversion: ${schema.constructor.name}`,
  );
}

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!config.openaiApiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Please set it in your environment to use the OpenAI provider.",
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return client;
}

async function callOpenAIJson<T>(body: ResponseCreateParamsNonStreaming): Promise<T> {
  const data = await getClient().responses.parse(body);
  const parsed = data.output_parsed as T | null;
  if (parsed == null) {
    throw new Error("OpenAI parse returned no parsed output");
  }
  return parsed;
}

async function uploadPdfAndGetFileId(
  pdfBuffer: Buffer,
  fileName: string,
): Promise<string> {
  const file = await toFile(pdfBuffer, fileName, { type: "application/pdf" });
  const uploaded = await getClient().files.create({ file, purpose: "assistants" });
  if (!uploaded?.id) {
    throw new Error("OpenAI file upload succeeded but no file id returned");
  }
  return String(uploaded.id);
}

function buildTextResponseConfig(schema: JsonSchema): ResponseTextConfig {
  return {
    format: {
      type: "json_schema",
      name: "result_schema",
      strict: true,
      schema,
    },
  };
}

export const openaiProvider: AiProvider = {
  async generateText<T>(request: AiTextRequest): Promise<T> {
    const jsonSchema = zodToJsonSchema(request.responseSchema);

    try {
      const body: ResponseCreateParamsNonStreaming = {
        model: request.model,
        temperature: request.temperature,
        text: buildTextResponseConfig(jsonSchema),
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: request.prompt }],
            type: "message",
          },
        ] as ResponseInput,
        stream: false,
      };

      const parsed = await callOpenAIJson<T>(body);
      return request.responseSchema.parse(parsed) as T;
    } catch (error) {
      logger.error(`Error calling OpenAI API: ${error}`);
      logger.error(`Prompt: ${request.prompt}`);
      throw new Error(
        `Failed to call OpenAI API: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },

  async generateMultiTurn<T>(request: AiMultiTurnRequest): Promise<T> {
    const jsonSchema = zodToJsonSchema(request.responseSchema);

    // Upload PDFs first (if any)
    const fileIds = new Map<number, string>();
    for (let i = 0; i < request.messages.length; i++) {
      const msg = request.messages[i];
      if (msg.pdfBuffer) {
        const id = await uploadPdfAndGetFileId(
          msg.pdfBuffer,
          msg.pdfFileName ?? "document.pdf",
        );
        fileIds.set(i, id);
      }
    }

    // Build input messages array
    const input: ResponseInput = request.messages.map((msg, i) => {
      const parts: ResponseInputMessageContentList = [
        { type: "input_text", text: msg.content },
      ];
      const fileId = fileIds.get(i);
      if (fileId) {
        parts.push({ type: "input_file", file_id: fileId });
      }
      return {
        role: msg.role,
        content: parts,
        type: "message",
      };
    });

    try {
      const body: ResponseCreateParamsNonStreaming = {
        model: request.model,
        temperature: request.temperature,
        text: buildTextResponseConfig(jsonSchema),
        input,
        stream: false,
      };

      const parsed = await callOpenAIJson<T>(body);
      return request.responseSchema.parse(parsed) as T;
    } catch (error) {
      logger.error(`Error calling OpenAI API (multi-turn): ${error}`);
      throw new Error(
        `Failed to call OpenAI API: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
};
