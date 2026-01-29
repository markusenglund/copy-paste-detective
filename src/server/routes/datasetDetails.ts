import { FastifyInstance } from "fastify";
import { getDatasetDetails } from "../services/datasetDetailsService";

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
}
