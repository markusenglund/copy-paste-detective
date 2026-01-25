import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import fastifyCors from "@fastify/cors";
import { join } from "node:path";
import { articlesRoutes } from "./routes/articles";
import { uploadRoutes } from "./routes/upload";

const fastify = Fastify({
  logger: true,
});

async function start(): Promise<void> {
  await fastify.register(fastifyCors, {
    origin: true,
  });

  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
  });

  // Register API routes
  await fastify.register(articlesRoutes, { prefix: "/api" });
  await fastify.register(uploadRoutes, { prefix: "/api" });

  // Serve static files in production
  if (process.env.NODE_ENV === "production") {
    await fastify.register(fastifyStatic, {
      root: join(process.cwd(), "dist/web"),
      prefix: "/",
    });

    // Fallback to index.html for client-side routing
    fastify.setNotFoundHandler(async (_request, reply) => {
      return reply.sendFile("index.html");
    });
  }

  const port = parseInt(process.env.PORT || "3000", 10);
  await fastify.listen({ port, host: "0.0.0.0" });
  console.log(`Server running on http://localhost:${port}`);
}

start().catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
