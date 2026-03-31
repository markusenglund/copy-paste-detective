import Anthropic from "@anthropic-ai/sdk";
import type {
  ContentBlockParam,
  MessageParam,
} from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";
import type { AiMultiTurnRequest, AiProvider, AiTextRequest } from "./types";
import { config } from "../../config/env";
import { logger } from "../../utils/logger";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!config.anthropicApiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Please set it in your environment to use the Claude provider.",
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return client;
}

function buildSystemPrompt(responseSchema: unknown): string {
  const schemaJson = JSON.stringify(
    z.toJSONSchema(responseSchema as z.ZodType),
    null,
    2,
  );
  return (
    "You must respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON. " +
    "Your response must conform to this JSON schema:\n" +
    schemaJson
  );
}

function extractJson(text: string): unknown {
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr);
}

export const claudeProvider: AiProvider = {
  async generateText<T>(request: AiTextRequest): Promise<T> {
    try {
      const response = await getClient().messages.create({
        model: request.model,
        max_tokens: 16384,
        temperature: request.temperature,
        system: buildSystemPrompt(request.responseSchema),
        messages: [{ role: "user", content: request.prompt }],
      });

      logger.info(
        `Token usage: input=${response.usage.input_tokens}, output=${response.usage.output_tokens}`,
      );

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text content in Claude response");
      }

      const parsed = extractJson(textBlock.text);
      return request.responseSchema.parse(parsed) as T;
    } catch (error) {
      logger.error(`Error calling Claude API: ${error}`);
      logger.error(`Prompt: ${request.prompt}`);
      throw new Error(
        `Failed to call Claude API: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },

  async generateMultiTurn<T>(request: AiMultiTurnRequest): Promise<T> {
    const messages: MessageParam[] = request.messages.map((msg) => {
      const content: ContentBlockParam[] = [
        { type: "text", text: msg.content },
      ];

      if (msg.pdfBuffer) {
        content.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: msg.pdfBuffer.toString("base64"),
          },
        });
      }

      return { role: msg.role, content };
    });

    try {
      const response = await getClient().messages.create({
        model: request.model,
        max_tokens: 16384,
        temperature: request.temperature,
        system: buildSystemPrompt(request.responseSchema),
        messages,
      });

      logger.info(
        `Token usage: input=${response.usage.input_tokens}, output=${response.usage.output_tokens}`,
      );

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text content in Claude response");
      }

      const parsed = extractJson(textBlock.text);
      return request.responseSchema.parse(parsed) as T;
    } catch (error) {
      logger.error(`Error calling Claude API (multi-turn): ${error}`);
      throw new Error(
        `Failed to call Claude API: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
};
