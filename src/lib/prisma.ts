import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const pgUrl = process.env.DATABASE_POSTGRES_PRISMA_URL;
  if (pgUrl) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require("@prisma/adapter-pg");
    const adapter = new PrismaPg({ connectionString: pgUrl });
    return new PrismaClient({ adapter });
  }
  const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const filePath = dbUrl.startsWith("file:") ? dbUrl.slice(5) : dbUrl;
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const adapter = new PrismaBetterSqlite3({ url: `file:${resolved}` });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
