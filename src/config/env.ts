import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  GEMINI_API_KEY: z
    .string()
    .min(1, "GEMINI_API_KEY must be a non-empty string"),
  DRYAD_ACCOUNT_ID: z
    .string()
    .min(1, "DRYAD_ACCOUNT_ID must be a non-empty string"),
  DRYAD_SECRET: z.string().min(1, "DRYAD_SECRET must be a non-empty string"),
  OPENALEX_API_KEY: z
    .string()
    .min(1, "OPENALEX_API_KEY must be a non-empty string"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET must be a non-empty string"),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  POSTGRES_USER: z.string().default("postgres"),
  POSTGRES_PASSWORD: z.string().default("postgres"),
  POSTGRES_DB: z.string().default("science_detective"),
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.string().default("5432"),
  PORT: z.string().default("3000"),
  LOG_LEVEL: z.string().default("info"),
});

type EnvSchema = z.infer<typeof envSchema>;

function validateEnv(): EnvSchema {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error("Environment validation failed:");
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`- ${err.path.join(".")}: ${err.message}`);
      });
    }
    console.error(
      "Please create a .env file based on .env.dist and set the required variables.",
    );
    process.exit(1);
  }
}

const env = validateEnv();

export const config = {
  isProduction: env.NODE_ENV === "production",
  geminiApiKey: env.GEMINI_API_KEY,
  dryadAccountId: env.DRYAD_ACCOUNT_ID,
  dryadSecret: env.DRYAD_SECRET,
  openAlexApiKey: env.OPENALEX_API_KEY,
  jwtSecret: env.JWT_SECRET,
  clientOrigin: env.CLIENT_ORIGIN,
  databaseUrl: `postgresql://${env.POSTGRES_USER}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`,
  port: parseInt(env.PORT, 10),
  logLevel: env.LOG_LEVEL,
} as const;
