import { z } from "zod";
import { config } from "../config/env";
import { JSONFilePreset } from "lowdb/node";

const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_in: z.number(),
  scope: z.string(),
  created_at: z.number(),
});

type TokenResponse = z.infer<typeof tokenResponseSchema>;
let accessToken: string | null = null;

export async function fetchToken(): Promise<string> {
  // Check if the token is already cached
  if (accessToken) {
    console.log("Using memory cached token");
    return accessToken;
  }
  const db = await JSONFilePreset<TokenResponse | null>(
    "data/dryad/token.json",
    null,
  );
  if (db.data) {
    console.log("Using json cached token");
    accessToken = db.data.access_token;
    return accessToken;
  }
  const response = await fetch("https://datadryad.org/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: `client_id=${encodeURIComponent(config.dryadAccountId)}&client_secret=${encodeURIComponent(config.dryadSecret)}&grant_type=client_credentials`,
  });

  if (!response.ok) {
    throw new Error(
      `Token fetch failed: ${response.status} ${response.statusText}`,
    );
  }

  const tokenResponse = await response.json();
  const parsedToken = tokenResponseSchema.parse(tokenResponse);

  // Cache the token
  db.data = parsedToken;
  await db.write();
  console.log("Fetched and cached new token");
  accessToken = parsedToken.access_token;
  return accessToken;
}
