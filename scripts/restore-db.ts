// =============================================================================
// VANTA OS — Restore script (Section 79)
// Usage: npm run restore:db -- backups/vanta-os-2026-06-20T10-30-00.sql.gz
// =============================================================================

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const target = process.argv[2];
if (!target || !existsSync(target)) {
  console.error("❌ Usage: npm run restore:db -- <path-to-backup.sql.gz>");
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const m = DATABASE_URL.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!m) throw new Error("Invalid DATABASE_URL");
const [, user, password, host, port, db] = m;
const env = { ...process.env, PGPASSWORD: password };

console.warn(`⚠️  This will DROP and recreate database "${db}" at ${host}:${port}.`);
console.warn(`⚠️  Press Ctrl+C within 5 seconds to abort.`);
execSync("sleep 5");

execSync(
  `dropdb --if-exists --host=${host} --port=${port} --username=${user} ${db} && ` +
    `createdb --host=${host} --port=${port} --username=${user} ${db}`,
  { env, stdio: "inherit" },
);

console.log(`▶ Restoring from ${target}...`);
execSync(`gunzip -c ${target} | psql --host=${host} --port=${port} --username=${user} ${db}`, {
  env,
  stdio: "inherit",
});

console.log("✅ Restore complete. Run `npm run migrate:deploy` to sync schema.");
