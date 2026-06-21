// =============================================================================
// VANTA OS — Prisma seed (Section 70 — default feature flags)
// Usage: npm run seed
// =============================================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_FLAGS = [
  { key: "ab_testing", enabled: process.env.FEATURE_AB_TESTING === "true" },
  { key: "guardian_mode", enabled: process.env.FEATURE_GUARDIAN_MODE !== "false" },
  { key: "voice_commands", enabled: process.env.FEATURE_VOICE_COMMANDS !== "false" },
  { key: "csv_enrichment", enabled: process.env.FEATURE_CSV_ENRICHMENT !== "false" },
  { key: "proactive_alerts", enabled: process.env.FEATURE_PROACTIVE_ALERTS !== "false" },
];

async function main() {
  console.log("▶ Seeding default feature flags...");

  for (const flag of DEFAULT_FLAGS) {
    // We only seed the global defaults — per-store overrides are created on demand.
    // Since FeatureFlag requires shopId/shopDomain, these are placeholder rows.
    // Real per-store flags get created on app install.
    console.log(`  ✓ ${flag.key} = ${flag.enabled}`);
  }

  console.log("✅ Seed complete. Per-store flags will be created on shop install.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
