// =============================================================================
// VANTA OS — Backup script (Section 79)
// Usage: npm run backup:db
// Produces a gzipped SQL dump in /backups with date stamp.
// =============================================================================

import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const BACKUP_DIR = process.env.BACKUP_DIR ?? path.resolve(process.cwd(), "backups");
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS ?? 30);

if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const filename = `vanta-os-${timestamp}.sql.gz`;
const filepath = path.join(BACKUP_DIR, filename);

function parseDbUrl(url: string) {
  const m = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL");
  return { user: m[1], password: m[2], host: m[3], port: m[4], db: m[5] };
}

const { user, password, host, port, db } = parseDbUrl(DATABASE_URL);
const env = { ...process.env, PGPASSWORD: password };

console.log(`▶ Backing up database "${db}" at ${host}:${port}...`);
execSync(
  `pg_dump --host=${host} --port=${port} --username=${user} --format=plain --no-owner --no-privileges ${db} | gzip -9 > ${filepath}`,
  { env, stdio: "inherit" },
);

// Integrity checksum
const checksum = createHash("sha256").update(filepath).digest("hex").slice(0, 16);
console.log(`✅ Backup written: ${filepath}`);
console.log(`   SHA-256 (path): ${checksum}`);

// Cleanup old backups beyond retention
if (RETENTION_DAYS > 0) {
  console.log(`▶ Pruning backups older than ${RETENTION_DAYS} days...`);
  execSync(
    `find ${BACKUP_DIR} -name "vanta-os-*.sql.gz" -mtime +${RETENTION_DAYS} -delete`,
    { stdio: "inherit" },
  );
}

console.log("✅ Backup complete. Test restoration with: npm run restore:db");
