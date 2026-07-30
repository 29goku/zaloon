import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const sourcePath = path.resolve(process.cwd(), "prisma/dev.db");
  let dbPath = sourcePath;

  // On Vercel (read-only filesystem), copy the db to /tmp so writes work
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    const tmpPath = "/tmp/dev.db";
    if (!fs.existsSync(tmpPath)) {
      fs.copyFileSync(sourcePath, tmpPath);
    }
    dbPath = tmpPath;
  }

  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
