// =============================================================================
// VANTA OS — Setup Verification Script
// Run: npm run check
//
// يتحقق من:
// 1. وجود ملف .env
// 2. صحة كل متغيرات البيئة المطلوبة
// 3. مطابقة shopify.app.toml مع .env
// 4. وجود قاعدة البيانات + Redis
// =============================================================================

import { config } from "dotenv";
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";

config({ path: resolve(process.cwd(), ".env") });

interface Check {
  name: string;
  status: "ok" | "warn" | "fail" | "missing";
  message: string;
  fix?: string;
}

const checks: Check[] = [];

// --- 1. Check .env file exists ---
if (existsSync(".env")) {
  checks.push({ name: "ملف .env", status: "ok", message: "تم العثور على ملف .env" });
} else {
  checks.push({
    name: "ملف .env",
    status: "missing",
    message: "ملف .env غير موجود",
    fix: "انسخ .env.example إلى .env: cp .env.example .env",
  });
}

// --- 2. Required env vars ---
const requiredVars: Array<{ key: string; description: string; validator?: (v: string) => boolean }> = [
  { key: "NODE_ENV", description: "بيئة التشغيل" },
  { key: "APP_URL", description: "رابط التطبيق", validator: (v) => v.startsWith("https://") },
  { key: "PORT", description: "المنفذ" },
  {
    key: "SHOPIFY_API_KEY",
    description: "مفتاح Shopify API",
    validator: (v) => v.length >= 20,
  },
  {
    key: "SHOPIFY_API_SECRET",
    description: "سر Shopify API",
    validator: (v) => v.startsWith("shpss_") || v.startsWith("shpca_") || v.startsWith("shpat_"),
  },
  { key: "SHOPIFY_APP_URL", description: "رابط تطبيق Shopify" },
  { key: "SHOPIFY_API_VERSION", description: "إصدار Shopify API" },
  {
    key: "SHOPIFY_APP_SCOPES",
    description: "صلاحيات Shopify",
    validator: (v) => v.includes("read_products"),
  },
  {
    key: "DATABASE_URL",
    description: "رابط قاعدة البيانات",
    validator: (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"),
  },
  {
    key: "GEMINI_API_KEY",
    description: "مفتاح Gemini AI",
    validator: (v) => v.startsWith("AIza"),
  },
  {
    key: "ENCRYPTION_KEY",
    description: "مفتاح التشفير",
    validator: (v) => v.length >= 20,
  },
  {
    key: "INTERNAL_DOCS_SECRET",
    description: "سر الوثائق الداخلية",
    validator: (v) => v.length >= 16,
  },
  {
    key: "AGENCY_SECRET",
    description: "سر لوحة الوكالة",
    validator: (v) => v.length >= 16,
  },
];

for (const { key, description, validator } of requiredVars) {
  const value = process.env[key];

  if (!value || value.trim() === "") {
    checks.push({
      name: key,
      status: "missing",
      message: `${description} — فارغ أو غير مُعين`,
      fix: `أضف ${key}=قيمة في ملف .env`,
    });
    continue;
  }

  if (value.includes("REPLACE_WITH")) {
    checks.push({
      name: key,
      status: "fail",
      message: `${description} — ما زال placeholder`,
      fix: `بدّل ${key} في .env بالقيمة الحقيقية`,
    });
    continue;
  }

  if (validator && !validator(value)) {
    checks.push({
      name: key,
      status: "fail",
      message: `${description} — القيمة غير صحيحة`,
      fix: `تحقق من تنسيق ${key} في .env`,
    });
    continue;
  }

  // إخفاء القيمة الحساسة في العرض
  const masked =
    value.length > 20 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
  checks.push({
    name: key,
    status: "ok",
    message: `${description} — ${masked}`,
  });
}

// --- 3. Optional env vars ---
const optionalVars: Array<{ key: string; description: string }> = [
  { key: "REDIS_URL", description: "رابط Redis (مطلوب للـ queue)" },
  { key: "RESEND_API_KEY", description: "مفتاح Resend للإيميل" },
  { key: "SENTRY_DSN", description: "DSN لـ Sentry" },
  { key: "SHOPIFY_PARTNER_API_TOKEN", description: "توكن Shopify Partner API" },
];

for (const { key, description } of optionalVars) {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    checks.push({
      name: key,
      status: "warn",
      message: `${description} — غير مُعين (اختياري)`,
      fix: `أضف ${key} في .env إذا احتجته`,
    });
  } else {
    checks.push({
      name: key,
      status: "ok",
      message: `${description} — مُعين`,
    });
  }
}

// --- 4. Check URLs match ---
const APP_URL = process.env.APP_URL;
const SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL;
if (APP_URL && SHOPIFY_APP_URL && APP_URL !== SHOPIFY_APP_URL) {
  checks.push({
    name: "تطابق الروابط",
    status: "warn",
    message: "APP_URL و SHOPIFY_APP_URL غير متطابقين",
    fix: "تأكد أنهما نفس الرابط",
  });
}

// --- 5. Check shopify.app.toml ---
const tomlPath = resolve(process.cwd(), "shopify.app.toml");
if (existsSync(tomlPath)) {
  const toml = readFileSync(tomlPath, "utf8");

  if (toml.includes("REPLACE_WITH_SHOPIFY_API_KEY")) {
    checks.push({
      name: "shopify.app.toml — client_id",
      status: "fail",
      message: "client_id ما زال placeholder",
      fix: "شغّل: npm run sync-toml",
    });
  } else {
    checks.push({ name: "shopify.app.toml — client_id", status: "ok", message: "تم التعيين" });
  }

  if (toml.includes("REPLACE_WITH_SHOPIFY_APP_URL")) {
    checks.push({
      name: "shopify.app.toml — URLs",
      status: "fail",
      message: "الروابط ما زالت placeholders",
      fix: "شغّل: npm run sync-toml",
    });
  } else {
    checks.push({ name: "shopify.app.toml — URLs", status: "ok", message: "تم التعيين" });
  }
}

// --- 6. Check package.json scripts ---
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const requiredScripts = ["start", "build", "migrate:deploy", "generate", "check", "sync-toml"];
for (const script of requiredScripts) {
  if (pkg.scripts?.[script]) {
    checks.push({ name: `script: ${script}`, status: "ok", message: pkg.scripts[script] });
  } else {
    checks.push({
      name: `script: ${script}`,
      status: "fail",
      message: "script مفقود",
      fix: `أضف "${script}" إلى scripts في package.json`,
    });
  }
}

// --- 7. Check Prisma schema ---
const schemaPath = resolve(process.cwd(), "prisma/schema.prisma");
if (existsSync(schemaPath)) {
  checks.push({ name: "prisma/schema.prisma", status: "ok", message: "موجود" });
} else {
  checks.push({
    name: "prisma/schema.prisma",
    status: "fail",
    message: "مفقود",
    fix: "تأكد من وجود prisma/schema.prisma",
  });
}

// --- Print results ---
console.log("\n" + "=".repeat(70));
console.log("  VANTA OS — فحص الإعداد");
console.log("=".repeat(70) + "\n");

let okCount = 0;
let warnCount = 0;
let failCount = 0;
let missingCount = 0;

for (const check of checks) {
  const icon =
    check.status === "ok"
      ? "✅"
      : check.status === "warn"
        ? "⚠️ "
        : check.status === "fail"
          ? "❌"
          : "🚫";
  console.log(`${icon} ${check.name}`);
  console.log(`   ${check.message}`);
  if (check.fix) {
    console.log(`   💡 ${check.fix}`);
  }
  console.log("");

  if (check.status === "ok") okCount++;
  else if (check.status === "warn") warnCount++;
  else if (check.status === "fail") failCount++;
  else missingCount++;
}

console.log("=".repeat(70));
console.log(
  `  النتيجة: ${okCount} ✅  |  ${warnCount} ⚠️   |  ${failCount} ❌  |  ${missingCount} 🚫`,
);
console.log("=".repeat(70) + "\n");

if (failCount > 0 || missingCount > 0) {
  console.log("🚫 يوجد أخطاء يجب إصلاحها قبل التشغيل.\n");
  console.log("📋 الخطوات التالية:");
  console.log("   1. انسخ .env.example إلى .env: cp .env.example .env");
  console.log("   2. املأ كل القيم في .env");
  console.log("   3. شغّل: npm run sync-toml");
  console.log("   4. شغّل: npm run check (للتحقق");
  console.log("   5. شغّل: npm run build && npm run start\n");
  process.exit(1);
} else if (warnCount > 0) {
  console.log("⚠️  يوجد تحذيرات — يمكن التشغيل لكن يُنصح بمراجعتها.\n");
  process.exit(0);
} else {
  console.log("🎉 كل شيء جاهز! شغّل: npm run sync-toml && npm run build && npm run start\n");
  process.exit(0);
}
