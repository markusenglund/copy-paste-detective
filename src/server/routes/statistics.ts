import { FastifyInstance } from "fastify";
import { db } from "../../db";
import { dryadDatasets } from "../../repositories";
import { sql } from "drizzle-orm";

export async function statisticsRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get("/statistics", async (_request, reply) => {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(dryadDatasets);

      return reply.send({
        totalDatasets: result.count,
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
