// =============================================================================
// VANTA OS — Sync shopify.app.toml with environment variables
// Run: npm run sync-toml
//
// This script replaces REPLACE_WITH_SHOPIFY_API_KEY and REPLACE_WITH_SHOPIFY_APP_URL
// in shopify.app.toml with the actual values from .env
// =============================================================================

import { config } from "dotenv";
import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

config({ path: resolve(process.cwd(), ".env") });

const TOML_PATH = resolve(process.cwd(), "shopify.app.toml");

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL;

if (!SHOPIFY_API_KEY || SHOPIFY_API_KEY === "REPLACE_WITH_SHOPIFY_API_KEY") {
  console.error("❌ SHOPIFY_API_KEY غير مُعين في .env");
  console.error("   أضفه ثم شغّل: npm run sync-toml");
  process.exit(1);
}

if (!SHOPIFY_APP_URL || SHOPIFY_APP_URL === "REPLACE_WITH_SHOPIFY_APP_URL" || !SHOPIFY_APP_URL.startsWith("https://")) {
  console.error("❌ SHOPIFY_APP_URL غير صحيح في .env");
  console.error("   يجب أن يبدأ بـ https:// ويكون رابط النشر الفعلي");
  process.exit(1);
}

console.log("📖 قراءة shopify.app.toml...");
let toml = readFileSync(TOML_PATH, "utf8");

console.log(`🔄 استبدال الروابط بـ ${SHOPIFY_APP_URL}...`);

const replacements: Record<string, string> = {
  REPLACE_WITH_SHOPIFY_API_KEY: SHOPIFY_API_KEY,
  REPLACE_WITH_SHOPIFY_APP_URL: SHOPIFY_APP_URL,
};

let replacedCount = 0;
for (const [placeholder, value] of Object.entries(replacements)) {
  const regex = new RegExp(placeholder, "g");
  const matches = toml.match(regex);
  if (matches) {
    toml = toml.replace(regex, value);
    replacedCount += matches.length;
    console.log(`   ✅ ${placeholder} → ${value} (${matches.length} استبدال)`);
  }
}

writeFileSync(TOML_PATH, toml);

console.log(`\n✅ تم تحديث shopify.app.toml بنجاح (${replacedCount} استبدال)`);
console.log(`\n📋 القيم النهائية:`);
console.log(`   client_id: ${SHOPIFY_API_KEY}`);
console.log(`   application_url: ${SHOPIFY_APP_URL}`);
console.log(`   redirect_urls: ${SHOPIFY_APP_URL}/auth/callback`);
console.log(`   privacy_compliance URLs: ${SHOPIFY_APP_URL}/webhooks/...`);
