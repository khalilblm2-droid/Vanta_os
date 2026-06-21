// =============================================================================
// VANTA OS — Prisma Client singleton
// Section 68: connection pooling. Both web and worker import this single client.
// =============================================================================

import { PrismaClient } from "@prisma/client";
import { logger } from "~/lib/logger.server";

declare global {
  // eslint-disable-next-line no-var
  var __vantaPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__vantaPrisma ??
  new PrismaClient({
    log: [
      { level: "warn", emit: "event" },
      { level: "error", emit: "event" },
    ],
  });

if (process.env.NODE_ENV !== "production") {
  global.__vantaPrisma = prisma;
}

prisma.$on("warn", (e) => logger.warn("PRISMA_WARN", { message: e.message }));
prisma.$on("error", (e) => logger.error("PRISMA_ERROR", { message: e.message }));

export type { PrismaClient } from "@prisma/client";
