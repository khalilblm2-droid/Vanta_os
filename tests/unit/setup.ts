// =============================================================================
// VANTA OS — Test setup (Section 41)
// Loads .env.test so all lib code has access to required env vars.
// =============================================================================

import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.example") });

// Force test env values
process.env.NODE_ENV = "test";
process.env.APP_ENV = "development";
process.env.APP_URL = "https://vanta-os.test";
process.env.SHOPIFY_APP_URL = "https://vanta-os.test";
process.env.SHOPIFY_API_KEY = "test_key";
process.env.SHOPIFY_API_SECRET = "test_secret";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.DIRECT_URL = "postgresql://test:test@localhost:5432/test";
process.env.GEMINI_API_KEY = "test_gemini_key";
process.env.ENCRYPTION_KEY = "test_encryption_key_min_8_chars";
process.env.INTERNAL_DOCS_SECRET = "test_internal_docs_secret";
process.env.AGENCY_SECRET = "test_agency_secret_long_enough";
process.env.REDIS_URL = "redis://localhost:6379";
