import type { Role } from "../repositories/users/schema";

type RequiredRole = Role | "public";

declare module "fastify" {
  interface FastifyContextConfig {
    requiredRole: RequiredRole;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      username: string;
      role: Role;
      requiresPasswordChange: boolean;
    };
    user: {
      sub: string;
      username: string;
      role: Role;
      requiresPasswordChange: boolean;
    };
  }
}
