import OpenAI from "openai";
import { toFile } from "openai/uploads";
import type {
  ResponseCreateParamsNonStreaming,
  ResponseInput,
  ResponseInputMessageContentList,
  ResponseTextConfig,
} from "openai/resources/responses/responses";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { AiMultiTurnRequest, AiProvider, AiTextRequest } from "./types";
import { config } from "../../config/env";
import { logger } from "../../utils/logger";

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

async function callOpenAIJson<T>(
  body: ResponseCreateParamsNonStreaming,
): Promise<T> {
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
  const uploaded = await getClient().files.create({
    file,
    purpose: "assistants",
  });
  if (!uploaded?.id) {
    throw new Error("OpenAI file upload succeeded but no file id returned");
  }
  return String(uploaded.id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTextResponseConfig(
  schema: Record<string, any>,
): ResponseTextConfig {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonSchema = zodToJsonSchema(request.responseSchema as any);

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonSchema = zodToJsonSchema(request.responseSchema as any);

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
