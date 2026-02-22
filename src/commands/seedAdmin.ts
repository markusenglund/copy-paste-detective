import { Command } from "@commander-js/extra-typings";
import { db, closeDb } from "../db";
import { users } from "../repositories/users/schema";
import { hashPassword } from "../auth/password";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";

const program = new Command();

program
  .name("seed-admin")
  .description("Create the initial admin user")
  .requiredOption("--username <username>", "Admin username")
  .action(async (options) => {
    try {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, options.username))
        .limit(1);

      if (existing.length > 0) {
        console.log(`User "${options.username}" already exists.`);
        process.exit(1);
      }

      const temporaryPassword = randomBytes(16).toString("base64url");
      const hashed = await hashPassword(temporaryPassword);

      await db.insert(users).values({
        username: options.username,
        passwordHash: hashed,
        role: "admin",
        requiresPasswordChange: true,
      });

      console.log(`Admin user "${options.username}" created.`);
      console.log(`Temporary password: ${temporaryPassword}`);
      console.log(
        "The user will be required to change this password on first login.",
      );
    } finally {
      await closeDb();
    }
  });

program.parse();
