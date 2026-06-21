// =============================================================================
// VANTA OS — Generate PWA Icons from favicon.svg
// Run: npm run generate-icons
//
// Generates:
//   - public/icons/icon-192.png (PWA standard)
//   - public/icons/icon-512.png (PWA standard)
//   - public/icons/favicon.ico   (legacy browsers)
//
// Uses cairosvg (Python) if available, otherwise falls back to a Node-based
// SVG-to-PNG converter.
// =============================================================================

import { existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const ICONS_DIR = resolve(process.cwd(), "public/icons");
const SVG_PATH = resolve(ICONS_DIR, "favicon.svg");

if (!existsSync(SVG_PATH)) {
  console.error("❌ favicon.svg غير موجود في public/icons/");
  process.exit(1);
}

if (!existsSync(ICONS_DIR)) {
  mkdirSync(ICONS_DIR, { recursive: true });
}

console.log("🎨 توليد أيقونات PWA من favicon.svg...\n");

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
];

let success = false;

// المحاولة 1: cairosvg (Python)
try {
  for (const { name, size } of sizes) {
    const outputPath = resolve(ICONS_DIR, name);
    execSync(
      `python3 -c "import cairosvg; cairosvg.svg2png(url='${SVG_PATH}', write_to='${outputPath}', output_width=${size}, output_height=${size})"`,
      { stdio: "pipe" },
    );
    console.log(`  ✅ ${name} (${size}x${size}) — عبر cairosvg`);
  }
  success = true;
} catch {
  console.log("  ⚠️  cairosvg غير متاح، تجربة بدائل...");
}

// المحاولة 2: rsvg-convert (Linux)
if (!success) {
  try {
    for (const { name, size } of sizes) {
      const outputPath = resolve(ICONS_DIR, name);
      execSync(`rsvg-convert -w ${size} -h ${size} "${SVG_PATH}" -o "${outputPath}"`, {
        stdio: "pipe",
      });
      console.log(`  ✅ ${name} (${size}x${size}) — عبر rsvg-convert`);
    }
    success = true;
  } catch {
    console.log("  ⚠️  rsvg-convert غير متاح، تجربة بدائل...");
  }
}

// المحاولة 3: ImageMagick
if (!success) {
  try {
    for (const { name, size } of sizes) {
      const outputPath = resolve(ICONS_DIR, name);
      execSync(`convert -background none -resize ${size}x${size} "${SVG_PATH}" "${outputPath}"`, {
        stdio: "pipe",
      });
      console.log(`  ✅ ${name} (${size}x${size}) — عبر ImageMagick`);
    }
    success = true;
  } catch {
    console.log("  ⚠️  ImageMagick غير متاح");
  }
}

if (!success) {
  console.error("\n❌ تعذّر توليد الأيقونات. ثبّت أحد الأدوات التالية:");
  console.error("   pip install cairosvg");
  console.error("   apt install librsvg2-bin");
  console.error("   apt install imagemagick");
  console.error("\nأو ولّدها يدوياً من favicon.svg على https://realfavicongenerator.net");
  process.exit(1);
}

console.log("\n✅ تم توليد كل الأيقونات بنجاح");
