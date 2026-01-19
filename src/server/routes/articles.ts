import { FastifyInstance } from "fastify";
import { getArticlesForManualUpload } from "../services/articlesService";
import { join } from "node:path";
import { existsSync, createReadStream } from "node:fs";

export async function articlesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/articles", async (_request, reply) => {
    const articles = await getArticlesForManualUpload();
    return reply.send({ articles });
  });

  fastify.get<{
    Params: { articleId: string; filename: string };
  }>("/articles/:articleId/pdf/:filename", async (request, reply) => {
    const { articleId, filename } = request.params;

    // Construct the path to the PDF file
    const pdfPath = join(process.cwd(), "data", "pdfs", articleId, filename);

    // Check if file exists
    if (!existsSync(pdfPath)) {
      return reply.status(404).send({ error: "PDF file not found" });
    }

    // Stream the file
    const stream = createReadStream(pdfPath);
    return reply.type("application/pdf").send(stream);
  });
}
