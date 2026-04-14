import { FastifyInstance } from "fastify";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getDatasetById,
  insertPdfDatasetFile,
} from "../../repositories/datasets/unifiedDatasetsRepository";
import { storagePaths } from "../../utils/paths/storagePaths";

export async function uploadRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{
    Params: { datasetId: string };
  }>(
    "/datasets/:datasetId/pdf",
    { config: { requiredRole: "editor" } },
    async (request, reply) => {
      const datasetId = parseInt(request.params.datasetId, 10);

      if (isNaN(datasetId)) {
        return reply.status(400).send({ error: "Invalid dataset ID" });
      }

      const dataset = await getDatasetById(datasetId);
      if (!dataset) {
        return reply.status(404).send({ error: "Dataset not found" });
      }

      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const filename = data.filename;
      if (!filename.toLowerCase().endsWith(".pdf")) {
        return reply.status(400).send({ error: "Only PDF files are allowed" });
      }

      const downloadDir =
        dataset.source === "pmc"
          ? storagePaths.pmcArticle(dataset.extId)
          : storagePaths.dryadDataset(dataset.extId);
      await mkdir(downloadDir, { recursive: true });

      const filePath = join(downloadDir, filename);
      const buffer = await data.toBuffer();
      await writeFile(filePath, buffer);

      await insertPdfDatasetFile({
        datasetId,
        source: dataset.source,
        filename,
        size: buffer.length,
        isMainArticle: true,
      });

      return reply.send({
        success: true,
        filePath,
        datasetId,
      });
    },
  );
}
