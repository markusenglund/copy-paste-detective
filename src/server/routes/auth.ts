import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../repositories/users/schema";
import { hashPassword, verifyPassword } from "../../auth/password";
import { config } from "../../config/env";

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{
    Body: { username: string; password: string };
  }>(
    "/auth/login",
    { config: { requiredRole: "public" } },
    async (request, reply) => {
      const { username, password } = request.body;

      if (!username || !password) {
        return reply
          .status(400)
          .send({ error: "Username and password are required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      const token = fastify.jwt.sign({
        sub: String(user.id),
        username: user.username,
        role: user.role,
        requiresPasswordChange: user.requiresPasswordChange,
      });

      reply
        .setCookie("token", token, {
          httpOnly: true,
          sameSite: "strict",
          secure: config.isProduction,
          path: "/",
        })
        .send({
          username: user.username,
          role: user.role,
          requiresPasswordChange: user.requiresPasswordChange,
        });
    },
  );

  fastify.post(
    "/auth/logout",
    { config: { requiredRole: "public" } },
    async (_request, reply) => {
      reply
        .clearCookie("token", {
          httpOnly: true,
          sameSite: "strict",
          secure: config.isProduction,
          path: "/",
        })
        .send({ success: true });
    },
  );

  fastify.get(
    "/auth/me",
    { config: { requiredRole: "viewer" } },
    async (request, reply) => {
      const { username, role, requiresPasswordChange } = request.user;
      return reply.send({ username, role, requiresPasswordChange });
    },
  );

  fastify.post<{
    Body: { newPassword: string };
  }>(
    "/auth/reset-password",
    { config: { requiredRole: "viewer" } },
    async (request, reply) => {
      const { requiresPasswordChange, sub } = request.user;

      if (!requiresPasswordChange) {
        return reply
          .status(400)
          .send({ error: "Password change is not required" });
      }

      const { newPassword } = request.body;

      if (!newPassword || newPassword.length < 8) {
        return reply
          .status(400)
          .send({ error: "Password must be at least 8 characters" });
      }

      const hashed = await hashPassword(newPassword);
      const userId = parseInt(sub, 10);

      await db
        .update(users)
        .set({
          passwordHash: hashed,
          requiresPasswordChange: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      const token = fastify.jwt.sign({
        sub,
        username: request.user.username,
        role: request.user.role,
        requiresPasswordChange: false,
      });

      reply
        .setCookie("token", token, {
          httpOnly: true,
          sameSite: "strict",
          secure: config.isProduction,
          path: "/",
        })
        .send({ success: true });
    },
  );
}
