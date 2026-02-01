import { FastifyInstance } from "fastify";
import { getDatasetDetails } from "../services/datasetDetailsService";
import { join } from "node:path";
import { existsSync, createReadStream } from "node:fs";
import { db } from "../../db";
import { dryadDatasets, dryadExcelFiles } from "../../repositories";
import { eq, and } from "drizzle-orm";

export async function datasetDetailsRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get<{
    Params: { datasetId: string };
  }>("/datasets/:datasetId", async (request, reply) => {
    const datasetId = parseInt(request.params.datasetId, 10);

    if (isNaN(datasetId)) {
      return reply.status(400).send({ error: "Invalid dataset ID" });
    }

    try {
      const details = await getDatasetDetails(datasetId);

      if (!details) {
        return reply
          .status(404)
          .send({ error: "Dataset not found or has no valid reviews" });
      }

      return reply.send(details);
    } catch (error) {
      console.error("Error fetching dataset details:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get<{
    Params: { datasetId: string; filename: string };
  }>("/datasets/:datasetId/excel/:filename", async (request, reply) => {
    const datasetId = parseInt(request.params.datasetId, 10);
    const { filename } = request.params;

    if (isNaN(datasetId)) {
      return reply.status(400).send({ error: "Invalid dataset ID" });
    }

    // Validate filename to prevent path traversal
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return reply.status(400).send({ error: "Invalid filename" });
    }

    try {
      // Query database to get extId and verify file belongs to this dataset
      const result = await db
        .select({
          extId: dryadDatasets.extId,
          fileExists: dryadExcelFiles.id,
        })
        .from(dryadDatasets)
        .innerJoin(
          dryadExcelFiles,
          and(
            eq(dryadExcelFiles.dryadDatasetId, dryadDatasets.id),
            eq(dryadExcelFiles.filename, filename),
          ),
        )
        .where(eq(dryadDatasets.id, datasetId))
        .limit(1);

      if (result.length === 0) {
        return reply.status(404).send({ error: "File not found" });
      }

      const { extId } = result[0];

      // Construct file path
      const filePath = join(
        process.cwd(),
        "data",
        "dryad",
        "files",
        extId.toString(),
        filename,
      );

      // Check if file exists on disk
      if (!existsSync(filePath)) {
        return reply.status(404).send({ error: "File not found on disk" });
      }

      // Determine MIME type based on file extension
      const extension = filename.toLowerCase().split(".").pop();
      const mimeType =
        extension === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : extension === "xls"
            ? "application/vnd.ms-excel"
            : "application/octet-stream";

      // Stream the file
      const stream = createReadStream(filePath);
      return reply.type(mimeType).send(stream);
    } catch (error) {
      console.error("Error fetching Excel file:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get<{
    Params: { datasetId: string; filename: string };
  }>(
    "/datasets/:datasetId/excel-highlighted/:filename",
    async (request, reply) => {
      const datasetId = parseInt(request.params.datasetId, 10);
      const { filename } = request.params;

      if (isNaN(datasetId)) {
        return reply.status(400).send({ error: "Invalid dataset ID" });
      }

      // Validate filename to prevent path traversal
      if (
        filename.includes("..") ||
        filename.includes("/") ||
        filename.includes("\\")
      ) {
        return reply.status(400).send({ error: "Invalid filename" });
      }

      try {
        // Query database to get extId and verify file belongs to this dataset
        const result = await db
          .select({
            extId: dryadDatasets.extId,
            fileExists: dryadExcelFiles.id,
          })
          .from(dryadDatasets)
          .innerJoin(
            dryadExcelFiles,
            and(
              eq(dryadExcelFiles.dryadDatasetId, dryadDatasets.id),
              eq(dryadExcelFiles.filename, filename),
            ),
          )
          .where(eq(dryadDatasets.id, datasetId))
          .limit(1);

        if (result.length === 0) {
          return reply.status(404).send({ error: "File not found" });
        }

        const { extId } = result[0];

        // Construct file path for highlighted file
        const filePath = join(
          process.cwd(),
          "highlighted-output",
          extId.toString(),
          filename,
        );

        // Check if file exists on disk
        if (!existsSync(filePath)) {
          return reply.status(404).send({ error: "File not found on disk" });
        }

        // Determine MIME type based on file extension
        const extension = filename.toLowerCase().split(".").pop();
        const mimeType =
          extension === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : extension === "xls"
              ? "application/vnd.ms-excel"
              : "application/octet-stream";

        // Stream the file
        const stream = createReadStream(filePath);
        return reply.type(mimeType).send(stream);
      } catch (error) {
        console.error("Error fetching highlighted Excel file:", error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
}
