import type { z } from "zod";

export type AiTextRequest = {
  model: string;
  prompt: string;
  temperature: number;
  responseSchema: z.ZodType;
};

export type AiMultiTurnMessage = {
  role: "user" | "assistant";
  content: string;
  pdfBuffer?: Buffer;
  pdfFileName?: string;
};

export type AiMultiTurnRequest = {
  model: string;
  messages: AiMultiTurnMessage[];
  temperature: number;
  responseSchema: z.ZodType;
};

export type AiProvider = {
  generateText<T>(request: AiTextRequest): Promise<T>;
  generateMultiTurn<T>(request: AiMultiTurnRequest): Promise<T>;
};
