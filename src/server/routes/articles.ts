import { FastifyInstance } from "fastify";
import { getArticlesForManualUpload } from "../services/articlesService";

export async function articlesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/articles", async (_request, reply) => {
    const articles = await getArticlesForManualUpload();
    return reply.send({ articles });
  });
}
