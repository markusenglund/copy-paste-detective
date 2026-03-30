import type { AiProvider } from "./types";

export const openaiProvider: AiProvider = {
  async generateText() {
    throw new Error(
      "OpenAI provider is not yet implemented. Install openai and implement this file.",
    );
  },

  async generateMultiTurn() {
    throw new Error(
      "OpenAI provider is not yet implemented. Install openai and implement this file.",
    );
  },
};
