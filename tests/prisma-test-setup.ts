import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

process.env.DATABASE_URL = "file:./tmp/test.db";

const prisma = new PrismaClient();

export async function setupTestDatabase() {
  console.log("Setting up test database with SQLite...");

  execSync("prisma db push --schema=packages/db/prisma/schema.prisma", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:./tmp/test.db" },
  });

  const password = await hash("testpassword", 10);

  await prisma.user.create({
    data: {
      email: "test@example.com",
      name: "Test User",
      passwordHash: password,
      role: "CUSTOMER",
    },
  });

  console.log("Test database setup complete");
}

export async function teardownTestDatabase() {
  await prisma.$disconnect();
}
