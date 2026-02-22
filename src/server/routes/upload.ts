import { FastifyInstance } from "fastify";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { updateArticlePdfDownloadStatus } from "../../repositories/articles/articlesRepository";
import { upsertPdfFile } from "../../repositories/pdfFiles/pdfFilesRepository";
import { storagePaths } from "../../utils/paths/storagePaths";

export async function uploadRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{
    Params: { id: string };
  }>(
    "/articles/:id/pdf",
    { config: { requiredRole: "editor" } },
    async (request, reply) => {
      const articleId = parseInt(request.params.id, 10);

      if (isNaN(articleId)) {
        return reply.status(400).send({ error: "Invalid article ID" });
      }

      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const filename = data.filename;
      if (!filename.toLowerCase().endsWith(".pdf")) {
        return reply.status(400).send({ error: "Only PDF files are allowed" });
      }

      const downloadDir = storagePaths.pdfArticle(articleId);
      await mkdir(downloadDir, { recursive: true });

      const filePath = join(downloadDir, filename);
      const buffer = await data.toBuffer();
      await writeFile(filePath, buffer);

      await updateArticlePdfDownloadStatus(articleId, "manually_added");

      await upsertPdfFile({
        articleId,
        filename,
        size: buffer.length,
        url: null,
      });

      return reply.send({
        success: true,
        filePath,
        articleId,
      });
    },
  );
}
