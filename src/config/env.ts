import dotenv from "dotenv";
import { z } from "zod";
import { logger } from "../utils/logger";

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  GEMINI_API_KEY: z
    .string()
    .min(1, "GEMINI_API_KEY must be a non-empty string"),
  DRYAD_ACCOUNT_ID: z
    .string()
    .min(1, "DRYAD_ACCOUNT_ID must be a non-empty string"),
  DRYAD_SECRET: z.string().min(1, "DRYAD_SECRET must be a non-empty string"),
  OPEN_ALEX_EMAIL_ADDRESS: z
    .string()
    .min(1, "OPEN_ALEX_EMAIL_ADDRESS must be a non-empty string"),
});

type EnvSchema = z.infer<typeof envSchema>;

function validateEnv(): EnvSchema {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    logger.error("Environment validation failed:");
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        logger.error(`- ${err.path.join(".")}: ${err.message}`);
      });
    }
    logger.error(
      "Please create a .env file based on .env.dist and set the required variables.",
    );
    process.exit(1);
  }
}

const env = validateEnv();

export const config = {
  geminiApiKey: env.GEMINI_API_KEY,
  dryadAccountId: env.DRYAD_ACCOUNT_ID,
  dryadSecret: env.DRYAD_SECRET,
  openAlexEmailAddress: env.OPEN_ALEX_EMAIL_ADDRESS,
} as const;
