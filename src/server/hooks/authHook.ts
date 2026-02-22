import { FastifyRequest, FastifyReply } from "fastify";
import type { Role } from "../../repositories/users/schema";

const ROLE_LEVEL: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };

function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole];
}

export async function authHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Non-API routes (static files, SPA fallback) don't have route config
  if (!request.url.startsWith("/api/")) return;

  const requiredRole = request.routeOptions.config?.requiredRole;

  if (!requiredRole) {
    request.log.error(
      `Route ${request.method} ${request.url} is missing requiredRole config`,
    );
    reply.status(500).send({ error: "Internal server error" });
    return;
  }

  if (requiredRole === "public") return;

  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: "Unauthorized" });
    return;
  }

  const { role, requiresPasswordChange } = request.user;

  if (
    requiresPasswordChange &&
    !request.url.startsWith("/api/auth/reset-password") &&
    !request.url.startsWith("/api/auth/me")
  ) {
    reply.status(403).send({ error: "PASSWORD_CHANGE_REQUIRED" });
    return;
  }

  if (!hasRole(role, requiredRole)) {
    reply.status(403).send({ error: "Insufficient permissions" });
    return;
  }
}
