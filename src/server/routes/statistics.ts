import { FastifyInstance } from "fastify";
import { getStatistics } from "../services/statisticsService";

export async function statisticsRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/statistics",
    { config: { requiredRole: "viewer" } },
    async (_request, reply) => {
      try {
        const statistics = await getStatistics();
        return reply.send(statistics);
      } catch (error) {
        console.error("Error fetching statistics:", error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
}
