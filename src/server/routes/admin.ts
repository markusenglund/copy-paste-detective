import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../../db";
import { users, roleEnum } from "../../repositories/users/schema";
import { hashPassword } from "../../auth/password";

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/admin/users",
    { config: { requiredRole: "admin" } },
    async (_request, reply) => {
      const allUsers = await db
        .select({
          id: users.id,
          username: users.username,
          role: users.role,
          requiresPasswordChange: users.requiresPasswordChange,
          createdAt: users.createdAt,
        })
        .from(users);

      return reply.send({ users: allUsers });
    },
  );

  fastify.post<{
    Body: { username: string; role: string };
  }>(
    "/admin/users",
    { config: { requiredRole: "admin" } },
    async (request, reply) => {
      const { username, role } = request.body;

      if (!username || typeof username !== "string" || username.trim() === "") {
        return reply
          .status(400)
          .send({ error: "Username must be a non-empty string" });
      }

      if (!roleEnum.includes(role as (typeof roleEnum)[number])) {
        return reply.status(400).send({
          error: `Role must be one of: ${roleEnum.join(", ")}`,
        });
      }

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username.trim()))
        .limit(1);

      if (existing.length > 0) {
        return reply
          .status(409)
          .send({ error: `User "${username}" already exists` });
      }

      const temporaryPassword = randomBytes(16).toString("base64url");
      const hashed = await hashPassword(temporaryPassword);

      const [newUser] = await db
        .insert(users)
        .values({
          username: username.trim(),
          passwordHash: hashed,
          role: role as (typeof roleEnum)[number],
          requiresPasswordChange: true,
        })
        .returning({
          id: users.id,
          username: users.username,
          role: users.role,
        });

      return reply.send({
        user: newUser,
        temporaryPassword,
      });
    },
  );

  fastify.delete<{
    Params: { id: string };
  }>(
    "/admin/users/:id",
    { config: { requiredRole: "admin" } },
    async (request, reply) => {
      const userId = parseInt(request.params.id, 10);

      if (isNaN(userId)) {
        return reply.status(400).send({ error: "Invalid user ID" });
      }

      if (String(userId) === request.user.sub) {
        return reply.status(400).send({ error: "Cannot delete yourself" });
      }

      const [deleted] = await db
        .delete(users)
        .where(eq(users.id, userId))
        .returning({ id: users.id });

      if (!deleted) {
        return reply.status(404).send({ error: "User not found" });
      }

      return reply.send({ success: true });
    },
  );

  fastify.put<{
    Params: { id: string };
    Body: { role: string };
  }>(
    "/admin/users/:id/role",
    { config: { requiredRole: "admin" } },
    async (request, reply) => {
      const userId = parseInt(request.params.id, 10);

      if (isNaN(userId)) {
        return reply.status(400).send({ error: "Invalid user ID" });
      }

      const { role } = request.body;

      if (!roleEnum.includes(role as (typeof roleEnum)[number])) {
        return reply.status(400).send({
          error: `Role must be one of: ${roleEnum.join(", ")}`,
        });
      }

      const [updated] = await db
        .update(users)
        .set({
          role: role as (typeof roleEnum)[number],
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          username: users.username,
          role: users.role,
        });

      if (!updated) {
        return reply.status(404).send({ error: "User not found" });
      }

      return reply.send({ user: updated });
    },
  );

  fastify.post<{
    Params: { id: string };
  }>(
    "/admin/users/:id/reset-password",
    { config: { requiredRole: "admin" } },
    async (request, reply) => {
      const userId = parseInt(request.params.id, 10);

      if (isNaN(userId)) {
        return reply.status(400).send({ error: "Invalid user ID" });
      }

      const temporaryPassword = randomBytes(16).toString("base64url");
      const hashed = await hashPassword(temporaryPassword);

      const [updated] = await db
        .update(users)
        .set({
          passwordHash: hashed,
          requiresPasswordChange: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({ id: users.id });

      if (!updated) {
        return reply.status(404).send({ error: "User not found" });
      }

      return reply.send({ temporaryPassword });
    },
  );
}
