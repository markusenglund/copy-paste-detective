import "./types";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import fastifyCors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import { join } from "node:path";
import { config } from "../config/env";
import { articlesRoutes } from "./routes/articles";
import { uploadRoutes } from "./routes/upload";
import { datasetDetailsRoutes } from "./routes/datasetDetails";
import { statisticsRoutes } from "./routes/statistics";
import { authRoutes } from "./routes/auth";
import { adminRoutes } from "./routes/admin";
import { authHook } from "./hooks/authHook";

const fastify = Fastify({
  logger: true,
  maxParamLength: 500,
});

async function start(): Promise<void> {
  await fastify.register(fastifyCors, {
    origin: config.clientOrigin,
    credentials: true,
  });

  await fastify.register(fastifyCookie);

  await fastify.register(fastifyJwt, {
    secret: config.jwtSecret,
    cookie: {
      cookieName: "token",
      signed: false,
    },
    sign: {
      expiresIn: "7d",
    },
  });

  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
  });

  fastify.addHook("onRequest", authHook);

  // Register API routes
  await fastify.register(authRoutes, { prefix: "/api" });
  await fastify.register(adminRoutes, { prefix: "/api" });
  await fastify.register(articlesRoutes, { prefix: "/api" });
  await fastify.register(uploadRoutes, { prefix: "/api" });
  await fastify.register(datasetDetailsRoutes, { prefix: "/api" });
  await fastify.register(statisticsRoutes, { prefix: "/api" });

  // Serve static files in production
  if (config.isProduction) {
    await fastify.register(fastifyStatic, {
      root: join(process.cwd(), "dist/web"),
      prefix: "/",
    });

    // Fallback to index.html for client-side routing
    fastify.setNotFoundHandler(async (_request, reply) => {
      return reply.sendFile("index.html");
    });
  }

  await fastify.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`Server running on http://localhost:${config.port}`);
}

start().catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
