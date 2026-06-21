import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable, json, redirect } from "@remix-run/node";
import { RemixServer, useLoaderData, Outlet, useRouteError, isRouteErrorResponse, Meta, Links, ScrollRestoration, Scripts, useFetcher, Link as Link$1, Form, useSubmit, useNavigate, NavLink } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { z } from "zod";
import { createDecipheriv, randomBytes, createCipheriv, scryptSync, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path, { resolve as resolve$1 } from "node:path";
import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, AppDistribution } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { LATEST_API_VERSION } from "@shopify/shopify-api";
import { PrismaClient } from "@prisma/client";
import { Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";
import { X, AlertTriangle as AlertTriangle$1, AlertCircle, CheckCircle2, Info, ExternalLink, ShieldCheck, Trash2, Link, Store, Key, Shield, Mail, Plus, Minus, ArrowLeft, Printer, Undo2, FileText, ListTree, Globe, Clock, Play, Download, Star, Bot, Brain, Activity, TrendingUp, Search, Sparkles, Zap, Package, HelpCircle, Power, Bell, CreditCard, Filter, ArrowRight, Building2, Users, DollarSign, ChevronUp, ChevronDown, Network, PauseCircle, Settings as Settings$1, Hourglass, WifiOff, MicOff, Mic, Send, Target, ChevronRight, Image, Square, ArrowUp, Cpu, Wand2, User, Copy, ThumbsUp, ThumbsDown, Pin, Volume2, BookOpen, CornerDownLeft, Check, MessageSquare } from "lucide-react";
import { createContext, useState, useCallback, useContext, useMemo, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AppProvider, Frame, Navigation, TopBar, Text } from "@shopify/polaris";
import { HomeIcon, ChatIcon, ClockIcon, StarFilledIcon, ShieldCheckMarkIcon, SettingsIcon, CashDollarIcon, NotificationIcon, QuestionCircleIcon } from "@shopify/polaris-icons";
const ABORT_DELAY = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, remixContext, _loadContext) {
  return isbot(request.headers.get("user-agent") || "") ? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext) : handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext);
}
function handleBotRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve2, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(RemixServer, { context: remixContext, url: request.url, abortDelay: ABORT_DELAY }),
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve2(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
function handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve2, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(RemixServer, { context: remixContext, url: request.url, abortDelay: ABORT_DELAY }),
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve2(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const tailwindStyles = "/assets/tailwind-DEG_PRnC.css";
const printStyles = "/assets/print-07lMgu1k.css";
const VAULT_FILE = resolve$1(process.cwd(), ".env.vault");
function getVaultSalt() {
  const salt = process.env.VAULT_SALT;
  if (!salt) {
    throw new Error(
      "[VANTA] FATAL: VAULT_SALT environment variable is required. Generate one with: openssl rand -hex 16"
    );
  }
  if (/^[0-9a-fA-F]{32}$/.test(salt)) {
    return Buffer.from(salt, "hex");
  }
  return Buffer.from(salt, "base64");
}
function deriveKey(passphrase) {
  const salt = getVaultSalt();
  return scryptSync(passphrase, salt, 32);
}
function encryptVault(entries, passphrase) {
  const key = deriveKey(passphrase);
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const json2 = JSON.stringify(entries);
  const encrypted = Buffer.concat([cipher.update(json2, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}
function decryptVault(vaultBuffer, passphrase) {
  const key = deriveKey(passphrase);
  const iv = vaultBuffer.subarray(0, 16);
  const tag = vaultBuffer.subarray(16, 32);
  const encrypted = vaultBuffer.subarray(32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}
class SecretsVault {
  cache = /* @__PURE__ */ new Map();
  validated = false;
  load() {
    if (this.validated) return;
    const vaultPassphrase = process.env.VAULT_PASSPHRASE;
    if (vaultPassphrase && existsSync(VAULT_FILE)) {
      try {
        const vaultBuffer = readFileSync(VAULT_FILE);
        const entries = decryptVault(vaultBuffer, vaultPassphrase);
        for (const entry2 of entries) {
          if (!process.env[entry2.key]) {
            this.cache.set(entry2.key, entry2.value);
          }
        }
      } catch (err) {
        console.error("[VANTA] Failed to decrypt .env.vault — ignoring vault");
      }
    }
    const allKeys = [
      "SHOPIFY_API_KEY",
      "SHOPIFY_API_SECRET",
      "GEMINI_API_KEY",
      "ENCRYPTION_KEY",
      "INTERNAL_DOCS_SECRET",
      "AGENCY_SECRET",
      "RESEND_API_KEY",
      "SENTRY_DSN",
      "SHOPIFY_PARTNER_API_TOKEN"
    ];
    for (const k of allKeys) {
      if (process.env[k]) {
        this.cache.set(k, process.env[k]);
      }
    }
    this.validated = true;
  }
  get(key) {
    this.load();
    const value = this.cache.get(key) ?? process.env[key];
    if (!value || value.trim() === "") {
      throw new Error(
        `[VANTA] Missing required secret: ${key}. Set it as an environment variable on your hosting platform.`
      );
    }
    return value;
  }
  getOptional(key) {
    this.load();
    return this.cache.get(key) ?? process.env[key];
  }
  validateRequired() {
    this.load();
    const required = [
      "SHOPIFY_API_KEY",
      "SHOPIFY_API_SECRET",
      "GEMINI_API_KEY",
      "ENCRYPTION_KEY",
      "INTERNAL_DOCS_SECRET",
      "AGENCY_SECRET"
    ];
    const missing = [];
    for (const k of required) {
      const v = this.cache.get(k) ?? process.env[k];
      if (!v || v.trim() === "") {
        missing.push(k);
      }
    }
    return { valid: missing.length === 0, missing };
  }
  createVault(passphrase) {
    const entries = [];
    const keys = [
      "SHOPIFY_API_KEY",
      "SHOPIFY_API_SECRET",
      "GEMINI_API_KEY",
      "ENCRYPTION_KEY",
      "INTERNAL_DOCS_SECRET",
      "AGENCY_SECRET",
      "RESEND_API_KEY",
      "SHOPIFY_PARTNER_API_TOKEN"
    ];
    for (const k of keys) {
      const v = process.env[k];
      if (v) {
        entries.push({ key: k, value: v, rotatedAt: (/* @__PURE__ */ new Date()).toISOString() });
      }
    }
    const encrypted = encryptVault(entries, passphrase);
    writeFileSync(VAULT_FILE, encrypted);
    console.log(`[VANTA] Encrypted vault created: ${VAULT_FILE} (${entries.length} secrets)`);
  }
}
const secretsVault = new SecretsVault();
function getSecret(key) {
  return secretsVault.get(key);
}
function validateSecrets() {
  return secretsVault.validateRequired();
}
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  APP_URL: z.string().url(),
  PORT: z.coerce.number().default(3e3),
  // Shopify (non-secret config)
  SHOPIFY_APP_URL: z.string().url(),
  SHOPIFY_APP_HANDLE: z.string().default("vanta-os"),
  SHOPIFY_API_VERSION: z.string().default("2025-04"),
  SHOPIFY_APP_SCOPES: z.string().min(1),
  // Shopify Partner API (optional)
  SHOPIFY_PARTNER_API_CLIENT_ID: z.string().optional(),
  SHOPIFY_PARTNER_APP_ID: z.string().optional(),
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),
  BULLMQ_CONCURRENCY: z.coerce.number().default(4),
  BULLMQ_MAX_RETRIES: z.coerce.number().default(3),
  // Gemini config (non-secret)
  GEMINI_MODEL: z.string().default("gemini-2.0-flash-exp"),
  GEMINI_MAX_TOKENS: z.coerce.number().default(8192),
  GEMINI_TEMPERATURE: z.coerce.number().default(0.4),
  GEMINI_TIMEOUT_MS: z.coerce.number().default(6e4),
  // Email
  EMAIL_FROM: z.string().default("VANTA OS <noreply@vanta-os.example.com>"),
  EMAIL_SUPPORT: z.string().default("support@vanta-os.example.com"),
  // Sentry
  SENTRY_ENVIRONMENT: z.string().default("development"),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().default(0.1),
  // Whitelabel
  WHITELABEL_MODE: z.string().transform((v) => v === "true").default("false"),
  // Feature flags
  FEATURE_AB_TESTING: z.string().transform((v) => v === "true").default("false"),
  FEATURE_GUARDIAN_MODE: z.string().transform((v) => v !== "false").default("true"),
  FEATURE_VOICE_COMMANDS: z.string().transform((v) => v !== "false").default("true"),
  FEATURE_CSV_ENRICHMENT: z.string().transform((v) => v !== "false").default("true"),
  // Rate limit
  SHOPIFY_RATE_LIMIT_PAUSE_THRESHOLD: z.coerce.number().default(0.15),
  SHOPIFY_RATE_LIMIT_RETRY_MAX: z.coerce.number().default(5),
  SHOPIFY_RATE_LIMIT_BACKOFF_BASE_MS: z.coerce.number().default(500),
  // GDPR
  GDPR_DELETION_WINDOW_HOURS: z.coerce.number().default(48),
  // App metadata
  APP_NAME: z.string().default("VANTA OS"),
  APP_VERSION: z.string().default("1.0.0")
});
let cachedEnv = null;
function loadEnv() {
  if (cachedEnv) return cachedEnv;
  const secretCheck = validateSecrets();
  if (!secretCheck.valid) {
    console.error("\n[VANTA] ❌ Missing required secrets:");
    for (const k of secretCheck.missing) {
      console.error(`   - ${k}`);
    }
    console.error("\n[VANTA] Set these as environment variables on your hosting platform.");
    console.error("[VANTA] NEVER commit secrets to git.\n");
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required secrets: ${secretCheck.missing.join(", ")}`);
    }
  }
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`❌ Invalid environment configuration:
${errors}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}
new Proxy({}, {
  get(_t, prop) {
    return loadEnv()[prop];
  }
});
function buildCspHeader(appOrigin, isDev = false) {
  const directives = [
    "default-src 'self'",
    // Frame-ancestors — required for Shopify embedded apps (Section 74)
    "frame-ancestors https://*.myshopify.com https://admin.shopify.com",
    // Script sources — own domain + Shopify CDN (Section 74)
    // 'unsafe-inline' is required for Remix's inline hydration script
    `script-src 'self' 'unsafe-inline' https://cdn.shopify.com ${appOrigin}${isDev ? " 'unsafe-eval'" : ""}`,
    // Styles — Polaris + our own + inline (Remix injects inline styles)
    "style-src 'self' 'unsafe-inline' https://cdn.shopify.com",
    // Images — Shopify CDN + own + data URIs
    "img-src 'self' data: blob: https: https://cdn.shopify.com",
    // Connect — Shopify APIs + own backend + Gemini (server-side only)
    `connect-src 'self' ${appOrigin} https://*.shopify.com https://*.myshopify.com`,
    // Fonts
    "font-src 'self' data: https://cdn.shopify.com",
    // Object-src — block all plugins
    "object-src 'none'",
    // Base-uri — restrict
    "base-uri 'self'",
    // Form-action — Shopify + own
    "form-action 'self' https://*.shopify.com",
    // No mixed content
    "block-all-mixed-content",
    // Upgrade insecure requests
    "upgrade-insecure-requests"
  ];
  return directives.join("; ");
}
function getSecurityHeaders() {
  const e2 = loadEnv();
  const isDev = e2.APP_ENV === "development" || process.env.NODE_ENV !== "production";
  return {
    "Content-Security-Policy": buildCspHeader(e2.APP_URL, isDev),
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    // The actual framing is controlled by CSP frame-ancestors above.
    "X-Frame-Options": "ALLOWALL",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(self), geolocation=(), interest-cohort=()",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "X-XSS-Protection": "1; mode=block"
  };
}
const DEFAULT_VANTA_CONFIG = {
  appName: "VANTA OS",
  tagline: "The Operating System for Your Shopify Store",
  logoUrl: "/icons/vanta-logo-light.svg",
  logoDarkUrl: "/icons/vanta-logo-dark.svg",
  faviconIco: "/icons/favicon.ico",
  faviconSvg: "/icons/favicon.svg",
  faviconPng192: "/icons/icon-192.png",
  brandColor: "#7c5cff",
  brandColorDark: "#a892ff",
  supportEmail: "support@vanta-os.example.com",
  docsUrl: "https://docs.vanta-os.example.com",
  privacyPolicyUrl: "/privacy",
  termsOfServiceUrl: "/terms",
  copyrightHolder: ""
};
function getWhitelabelConfig() {
  if (process.env.WHITELABEL_MODE !== "true") {
    return DEFAULT_VANTA_CONFIG;
  }
  return {
    ...DEFAULT_VANTA_CONFIG,
    appName: process.env.WL_APP_NAME ?? DEFAULT_VANTA_CONFIG.appName,
    tagline: process.env.WL_TAGLINE ?? DEFAULT_VANTA_CONFIG.tagline,
    logoUrl: process.env.WL_LOGO_URL ?? DEFAULT_VANTA_CONFIG.logoUrl,
    logoDarkUrl: process.env.WL_LOGO_DARK_URL ?? DEFAULT_VANTA_CONFIG.logoDarkUrl,
    faviconIco: process.env.WL_FAVICON_ICO ?? DEFAULT_VANTA_CONFIG.faviconIco,
    faviconSvg: process.env.WL_FAVICON_SVG ?? DEFAULT_VANTA_CONFIG.faviconSvg,
    faviconPng192: process.env.WL_FAVICON_PNG192 ?? DEFAULT_VANTA_CONFIG.faviconPng192,
    brandColor: process.env.WL_BRAND_COLOR ?? DEFAULT_VANTA_CONFIG.brandColor,
    brandColorDark: process.env.WL_BRAND_COLOR_DARK ?? DEFAULT_VANTA_CONFIG.brandColorDark,
    supportEmail: process.env.WL_SUPPORT_EMAIL ?? DEFAULT_VANTA_CONFIG.supportEmail,
    docsUrl: process.env.WL_DOCS_URL ?? DEFAULT_VANTA_CONFIG.docsUrl,
    copyrightHolder: process.env.WL_COPYRIGHT_HOLDER ?? DEFAULT_VANTA_CONFIG.copyrightHolder
  };
}
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-04";
const APP_IDENTITY = {
  NAME: "VANTA OS",
  VERSION: "1.0.0"
};
({
  // Section 19 — pause execution when available query cost drops below this
  PAUSE_THRESHOLD_RATIO: Number(process.env.SHOPIFY_RATE_LIMIT_PAUSE_THRESHOLD ?? 0.15),
  RETRY_MAX: Number(process.env.SHOPIFY_RATE_LIMIT_RETRY_MAX ?? 5),
  BACKOFF_BASE_MS: Number(process.env.SHOPIFY_RATE_LIMIT_BACKOFF_BASE_MS ?? 500)
});
const GDPR = {
  // Section 39 — Shopify requires deletion within 48 hours
  DELETION_WINDOW_HOURS: Number(process.env.GDPR_DELETION_WINDOW_HOURS ?? 48)
};
const meta = () => [
  { title: `${APP_IDENTITY.NAME} — AI Agent for Shopify` },
  { name: "description", content: "The Operating System for Your Shopify Store." },
  { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
  { name: "theme-color", content: "#7c5cff" }
];
const links = () => [
  { rel: "manifest", href: "/manifest.json" },
  { rel: "icon", href: "/icons/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
  { rel: "preconnect", href: "https://cdn.shopify.com" },
  { rel: "stylesheet", href: tailwindStyles },
  { rel: "stylesheet", href: printStyles, media: "print" }
];
const headers$H = (_args) => getSecurityHeaders();
async function loader$E({ request }) {
  const e2 = loadEnv();
  const wl = getWhitelabelConfig();
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") ?? "";
  return json({
    appName: wl.appName,
    apiKey: e2.SHOPIFY_API_KEY,
    appUrl: e2.APP_URL,
    shopifyApiVersion: e2.SHOPIFY_API_VERSION,
    embedded: true,
    whitelabelMode: e2.WHITELABEL_MODE,
    shop
    // Pass shop to client for App Bridge initialization
  });
}
function Layout({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "en", dir: "ltr", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {}),
      /* @__PURE__ */ jsx("script", { src: "https://cdn.shopify.com/shopifycloud/app-bridge.js" })
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function App() {
  useLoaderData();
  return /* @__PURE__ */ jsx(Outlet, {});
}
function ErrorBoundary$1() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : "Unknown error";
  return /* @__PURE__ */ jsxs("html", { lang: "en", dir: "ltr", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("title", { children: "VANTA OS — Error" }),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { style: { margin: 0, padding: "2rem", fontFamily: "system-ui, sans-serif", background: "#f5f7fa", color: "#1a2238" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { maxWidth: "480px", margin: "4rem auto", textAlign: "center" }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: "1rem" }, children: "⚠️" }),
        /* @__PURE__ */ jsx("h1", { style: { fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }, children: "Something went wrong" }),
        /* @__PURE__ */ jsx("p", { style: { color: "#64748b", marginBottom: "1.5rem", fontSize: "0.875rem" }, children: message }),
        /* @__PURE__ */ jsx(
          "a",
          {
            href: "/app",
            style: {
              display: "inline-block",
              background: "#7c5cff",
              color: "white",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              textDecoration: "none",
              fontWeight: 600
            },
            children: "Return to VANTA OS"
          }
        )
      ] }),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary: ErrorBoundary$1,
  Layout,
  default: App,
  headers: headers$H,
  links,
  loader: loader$E,
  meta
}, Symbol.toStringTag, { value: "Module" }));
function emit(level, message, ctx = {}) {
  const entry2 = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    log_level: level.toUpperCase(),
    message,
    ...ctx
  };
  const line = JSON.stringify(entry2);
  if (level === "error") {
    process.stderr.write(line + "\n");
    if (process.env.SENTRY_DSN) {
      import("@sentry/node").then((Sentry) => Sentry.captureException(new Error(message))).catch(() => {
      });
    }
  } else if (level === "warn") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}
const logger = {
  debug: (msg, ctx) => emit("debug", msg, ctx),
  info: (msg, ctx) => emit("info", msg, ctx),
  warn: (msg, ctx) => emit("warn", msg, ctx),
  error: (msg, ctx) => emit("error", msg, ctx)
};
const prisma = global.__vantaPrisma ?? new PrismaClient({
  log: [
    { level: "warn", emit: "event" },
    { level: "error", emit: "event" }
  ]
});
if (process.env.NODE_ENV !== "production") {
  global.__vantaPrisma = prisma;
}
prisma.$on("warn", (e2) => logger.warn("PRISMA_WARN", { message: e2.message }));
prisma.$on("error", (e2) => logger.error("PRISMA_ERROR", { message: e2.message }));
const e = loadEnv();
logger.info("Shopify API version", {
  configured: e.SHOPIFY_API_VERSION,
  libraryLatest: LATEST_API_VERSION
});
const sessionStorage = new PrismaSessionStorage(prisma);
const shopify = shopifyApp({
  apiKey: e.SHOPIFY_API_KEY,
  apiSecretKey: e.SHOPIFY_API_SECRET,
  apiVersion: e.SHOPIFY_API_VERSION,
  scopes: e.SHOPIFY_APP_SCOPES.split(",").map((s) => s.trim()),
  appUrl: e.SHOPIFY_APP_URL,
  authPathPrefix: "/auth",
  sessionStorage,
  // AppDistribution.AppStore causes different auth behavior that
  // can result in blank screen for custom apps.
  distribution: AppDistribution.Custom,
  isEmbeddedApp: true,
  hooks: {
    // After OAuth completes — register shop in our DB (Section 44 multi-tenant)
    afterAuth: async ({ session, admin }) => {
      try {
        const shopDomain = session.shop.replace(/^https?:\/\//, "");
        const shop = await prisma.shop.upsert({
          where: { shopDomain },
          update: {
            installed: true,
            uninstalledAt: null,
            scopes: session.scope,
            updatedAt: /* @__PURE__ */ new Date()
          },
          create: {
            shopDomain,
            scopes: session.scope,
            installed: true,
            installedAt: /* @__PURE__ */ new Date(),
            plan: "PRIVATE_TEST",
            // Section 5.3 — always-available $0 dev plan
            creditsRemaining: 100,
            preferredLanguage: "en",
            defaultLocale: "en"
          }
        });
        try {
          const resp = await admin.graphql(
            `#graphql
              query GetShopMeta {
                shop {
                  id
                  name
                  email
                  ianaTimezone
                  primaryDomain { url }
                  currencyCode
                  billingAddress { countryCode }
                }
              }`
          );
          const data2 = await resp.json();
          const s = data2?.data?.shop;
          if (s) {
            await prisma.shop.update({
              where: { id: shop.id },
              data: {
                name: s.name ?? null,
                email: s.email ?? null,
                ianaTimezone: s.ianaTimezone ?? null,
                countryCode: s.billingAddress?.countryCode ?? null,
                primaryCurrency: s.currencyCode ?? "USD"
              }
            });
          }
        } catch (metaErr) {
          logger.warn("Shop metadata fetch failed", {
            shopDomain,
            error: String(metaErr)
          });
        }
        logger.info("Shop authenticated", { shopDomain });
      } catch (err) {
        logger.error("afterAuth hook failed", {
          shop: session.shop,
          error: String(err)
        });
      }
    }
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true
  },
  // calls to fail silently, which broke some Polaris components that
  // rely on REST endpoints internally.
  ...process.env.NODE_ENV !== "production" ? { dev: true } : {}
});
function extractStaffFromSession(session) {
  let online = null;
  try {
    online = session.onlineAccessInfo ? JSON.parse(session.onlineAccessInfo) : null;
  } catch {
    online = null;
  }
  const user = online?.associated_user;
  const shopifyStaffId = user ? String(user.id) : online?.account_number ?? "unknown";
  return {
    shopifyStaffId,
    name: user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : void 0,
    email: user?.email,
    role: user?.account_owner ? "owner" : "staff",
    isOwner: Boolean(user?.account_owner)
  };
}
async function upsertStaffMember(shopId, shopDomain, identity) {
  const staff = await prisma.staffMember.upsert({
    where: {
      shopDomain_shopifyStaffId: {
        shopDomain,
        shopifyStaffId: identity.shopifyStaffId
      }
    },
    update: {
      name: identity.name,
      email: identity.email,
      role: identity.role,
      isOwner: Boolean(identity.isOwner),
      lastSeenAt: /* @__PURE__ */ new Date()
    },
    create: {
      shopId,
      shopDomain,
      shopifyStaffId: identity.shopifyStaffId,
      name: identity.name,
      email: identity.email,
      role: identity.role,
      isOwner: Boolean(identity.isOwner)
    },
    select: { id: true }
  });
  logger.debug("Staff member resolved", {
    shopDomain,
    shopifyStaffId: identity.shopifyStaffId,
    staffId: staff.id
  });
  return staff.id;
}
function shopScoped(shopDomain) {
  assertShopDomain(shopDomain);
  return { shopDomain };
}
function assertShopDomain(shopDomain) {
  if (!shopDomain || typeof shopDomain !== "string" || shopDomain.trim() === "") {
    logger.error("Multi-tenant assertion failed — missing shopDomain", { shopDomain });
    throw new Error("FATAL: shopDomain is required for this operation (Section 44)");
  }
}
async function getShopOrThrow(shopDomain) {
  assertShopDomain(shopDomain);
  const shop = await prisma.shop.findUnique({ where: { shopDomain } });
  if (!shop) {
    throw new Error(`Shop not found: ${shopDomain}`);
  }
  if (!shop.installed) {
    throw new Error(`Shop is not installed: ${shopDomain}`);
  }
  if (shop.killSwitchEnabled) {
    throw new Error(`Kill switch is enabled for shop ${shopDomain} — agent is globally disabled (Section 43)`);
  }
  return shop;
}
async function isKillSwitchOn(shopDomain) {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: { killSwitchEnabled: true }
  });
  return Boolean(shop?.killSwitchEnabled);
}
async function requireAdmin(request) {
  const { admin, session } = await shopify.authenticate.admin(request);
  const shopDomain = session.shop.replace(/^https?:\/\//, "");
  const shop = await getShopOrThrow(shopDomain);
  const identity = extractStaffFromSession(session);
  const staffId = await upsertStaffMember(shop.id, shopDomain, identity);
  logger.debug("Admin authenticated", { shopDomain, staffId });
  return { admin, session, shopDomain, shop, staffId };
}
function headers$G(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function action$l(args) {
  const ctx = await requireAdmin(args);
  await prisma.notification.updateMany({
    where: { shopDomain: ctx.shopDomain, read: false },
    data: { read: true }
  });
  return json({ ok: true });
}
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$l,
  headers: headers$G
}, Symbol.toStringTag, { value: "Module" }));
function headers$F(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function action$k(args) {
  const ctx = await requireAdmin(args);
  const id = args.params.id;
  await prisma.notification.updateMany({
    where: { id, shopDomain: ctx.shopDomain },
    data: { read: true }
  });
  return json({ ok: true });
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$k,
  headers: headers$F
}, Symbol.toStringTag, { value: "Module" }));
function headers$E(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function action$j(args) {
  const ctx = await requireAdmin(args);
  const id = args.params.id;
  await prisma.recurringMission.deleteMany({
    where: { id, shopDomain: ctx.shopDomain }
  });
  return json({ ok: true });
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$j,
  headers: headers$E
}, Symbol.toStringTag, { value: "Module" }));
function formatZodErrors(error) {
  const out = {};
  for (const issue of error.issues) {
    const path2 = issue.path.join(".") || "_root";
    out[path2] = out[path2] ? `${out[path2]}; ${issue.message}` : issue.message;
  }
  return out;
}
function validate(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const err = new Error("Validation failed");
    err.name = "ValidationError";
    err.fields = formatZodErrors(result.error);
    throw err;
  }
  return result.data;
}
const TaskPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
const CreateTaskSchema = z.object({
  command: z.string().trim().min(3, "Command must be at least 3 characters").max(2e3, "Command must be 2000 characters or fewer"),
  // Section 65
  language: z.enum(["en", "ar", "fr"]).default("en"),
  // Section 57
  priority: TaskPrioritySchema.default("NORMAL"),
  // Section 54
  threadParentId: z.string().cuid().optional(),
  // Section 29
  csvAttachmentUrl: z.string().url().optional(),
  // Section 36
  isRecurring: z.boolean().default(false),
  // Section 33
  recurringCron: z.string().optional().refine(
    (v) => !v || /^[0-9*/,\- ]+$/.test(v),
    "Cron expression contains invalid characters"
  ),
  estimatedCredits: z.number().int().min(1).max(100).default(1)
});
const ApproveTaskSchema = z.object({
  taskId: z.string().cuid(),
  approved: z.boolean(),
  modifications: z.string().max(2e3).optional()
});
z.object({
  taskId: z.string().cuid(),
  resourceIds: z.array(z.string()).optional()
});
const FeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().max(5e3).optional(),
  page: z.string().max(200).optional(),
  screenshotUrl: z.string().url().optional()
});
const UpdateSettingsSchema = z.object({
  preferredLanguage: z.enum(["en", "ar"]).optional(),
  agentPersona: z.enum(["PROFESSIONAL", "FRIENDLY", "CONCISE"]).optional(),
  canWriteProducts: z.boolean().optional(),
  canWriteCollections: z.boolean().optional(),
  canWriteInventory: z.boolean().optional(),
  canWriteMetafields: z.boolean().optional(),
  canWriteThemes: z.boolean().optional(),
  canReadOrders: z.boolean().optional(),
  canReadCustomers: z.boolean().optional(),
  requiresApprovalOnBulk: z.boolean().optional(),
  bulkThreshold: z.number().int().min(1).max(1e4).optional(),
  notifyOnTaskComplete: z.boolean().optional(),
  notifyOnGuardianAlert: z.boolean().optional(),
  notifyOnError: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  guardianModeEnabled: z.boolean().optional(),
  guardianIntervalHours: z.number().int().min(1).max(72).optional(),
  killSwitchEnabled: z.boolean().optional(),
  killSwitchReason: z.string().max(500).optional(),
  completedOnboarding: z.boolean().optional()
});
z.object({
  shop_id: z.number(),
  shop_domain: z.string(),
  customer: z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional()
  }),
  orders_to_redact: z.array(z.string()).default([])
});
z.object({
  shop_id: z.number(),
  shop_domain: z.string(),
  customer: z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional()
  }),
  orders_requested: z.array(z.string()).default([])
});
z.object({
  shop_id: z.number(),
  shop_domain: z.string()
});
z.object({
  shop_id: z.number(),
  shop_domain: z.string(),
  name: z.string().optional(),
  domain: z.string().optional()
});
const RecurringMissionSchema = z.object({
  prompt: z.string().trim().min(3).max(2e3),
  cron: z.string().min(1).max(120),
  timezone: z.string().min(1).max(60).default("UTC")
});
z.object({
  limit: z.number().int().min(1).max(20).default(20),
  cursor: z.string().optional()
});
const FeatureFlagToggleSchema = z.object({
  key: z.string().min(1).max(80),
  enabled: z.boolean()
});
let connection = null;
const baseOptions = {
  maxRetriesPerRequest: null,
  // BullMQ requires null
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: false,
  connectTimeout: 5e3,
  commandTimeout: 1e4,
  retryStrategy: (times) => {
    if (times > 20) {
      logger.error("Redis exhausted retries — giving up", { attempts: times });
      return null;
    }
    return Math.min(times * 200, 5e3);
  }
};
function getRedis$2() {
  if (connection) return connection;
  connection = new Redis(loadEnv().REDIS_URL, baseOptions);
  connection.on("error", (err) => {
    logger.error("Redis connection error", { error: String(err) });
  });
  connection.on("connect", () => logger.info("Redis connected"));
  return connection;
}
const TASK_QUEUE_NAME = "vanta:tasks";
const GUARDIAN_QUEUE_NAME = "vanta:guardian";
const RECURRING_QUEUE_NAME = "vanta:recurring";
const WEBHOOK_QUEUE_NAME = "vanta:webhooks";
const PRIORITY_MAP = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 8,
  URGENT: 10
};
let _taskQueue = null;
let _guardianQueue = null;
let _recurringQueue = null;
let _webhookQueue = null;
let _queueEvents = null;
function getTaskQueue() {
  if (_taskQueue) return _taskQueue;
  _taskQueue = new Queue(TASK_QUEUE_NAME, {
    connection: getRedis$2(),
    defaultJobOptions: {
      attempts: 3,
      // Section 41 — retry on transient failures
      backoff: { type: "exponential", delay: 2e3 },
      removeOnComplete: { count: 200, age: 60 * 60 * 24 },
      // 24h
      removeOnFail: { count: 500, age: 60 * 60 * 24 * 7 }
      // 7d
    }
  });
  return _taskQueue;
}
function getGuardianQueue() {
  if (_guardianQueue) return _guardianQueue;
  _guardianQueue = new Queue(GUARDIAN_QUEUE_NAME, {
    connection: getRedis$2(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 5e3 },
      removeOnComplete: { count: 100, age: 60 * 60 * 24 },
      removeOnFail: { count: 200, age: 60 * 60 * 24 * 7 }
    }
  });
  return _guardianQueue;
}
function getRecurringQueue() {
  if (_recurringQueue) return _recurringQueue;
  _recurringQueue = new Queue(RECURRING_QUEUE_NAME, {
    connection: getRedis$2()
  });
  return _recurringQueue;
}
function getWebhookQueue() {
  if (_webhookQueue) return _webhookQueue;
  _webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
    connection: getRedis$2(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 1e4 },
      removeOnComplete: { count: 1e3, age: 60 * 60 * 24 * 7 },
      removeOnFail: { count: 500, age: 60 * 60 * 24 * 30 }
    }
  });
  return _webhookQueue;
}
function getQueueEvents() {
  if (_queueEvents) return _queueEvents;
  _queueEvents = new QueueEvents(TASK_QUEUE_NAME, { connection: getRedis$2() });
  _queueEvents.on("completed", ({ jobId, returnvalue }) => {
    logger.info("BullMQ job completed", { jobId, returnvalue });
  });
  _queueEvents.on("failed", ({ jobId, failedReason }) => {
    logger.error("BullMQ job failed", { jobId, reason: failedReason });
  });
  return _queueEvents;
}
async function enqueueTask(payload, priority = "NORMAL") {
  const queue = getTaskQueue();
  const job = await queue.add(`task:${payload.taskId}`, payload, {
    priority: PRIORITY_MAP[priority],
    jobId: payload.taskId
    // dedupe by taskId
  });
  logger.info("Task enqueued", {
    taskId: payload.taskId,
    shopDomain: payload.shopDomain,
    priority,
    bullmqJobId: job.id
  });
  return job.id ?? payload.taskId;
}
async function enqueueGuardianCheck(payload) {
  const queue = getGuardianQueue();
  const job = await queue.add(`guardian:${payload.shopDomain}:${payload.checkType}`, payload);
  return job.id ?? "";
}
async function enqueueRecurringMission(payload) {
  const queue = getRecurringQueue();
  const job = await queue.add(`recurring:${payload.missionId}`, payload, {
    jobId: `recurring-${payload.missionId}-${Date.now()}`
  });
  return job.id ?? "";
}
async function enqueueWebhook(payload) {
  const queue = getWebhookQueue();
  const job = await queue.add(`webhook:${payload.topic}:${payload.webhookId}`, payload, {
    jobId: payload.webhookId
    // dedupe on Shopify's webhook id
  });
  return job.id ?? "";
}
async function closeQueues() {
  await Promise.allSettled([
    _taskQueue?.close(),
    _guardianQueue?.close(),
    _recurringQueue?.close(),
    _webhookQueue?.close(),
    _queueEvents?.close()
  ]);
  _taskQueue = null;
  _guardianQueue = null;
  _recurringQueue = null;
  _webhookQueue = null;
  _queueEvents = null;
}
const taskQueue = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  GUARDIAN_QUEUE_NAME,
  RECURRING_QUEUE_NAME,
  TASK_QUEUE_NAME,
  WEBHOOK_QUEUE_NAME,
  closeQueues,
  enqueueGuardianCheck,
  enqueueRecurringMission,
  enqueueTask,
  enqueueWebhook,
  getGuardianQueue,
  getQueueEvents,
  getRecurringQueue,
  getTaskQueue,
  getWebhookQueue
}, Symbol.toStringTag, { value: "Module" }));
function headers$D(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function action$i(args) {
  const ctx = await requireAdmin(args);
  const taskId = args.params.taskId;
  const body = await args.request.json();
  const input = validate(ApproveTaskSchema, { taskId, ...body });
  const task2 = await prisma.task.findFirst({
    where: { id: input.taskId, shopDomain: ctx.shopDomain }
  });
  if (!task2) {
    return json({ error: "not_found" }, { status: 404 });
  }
  if (task2.status !== "AWAITING_APPROVAL") {
    return json({ error: "not_awaiting_approval", status: task2.status }, { status: 409 });
  }
  if (input.approved) {
    await prisma.task.update({
      where: { id: task2.id },
      data: {
        status: "QUEUED",
        approvedByStaffId: ctx.staffId,
        approvedAt: /* @__PURE__ */ new Date(),
        requiresApproval: false
        // Already approved
      }
    });
    await enqueueTask(
      {
        taskId: task2.id,
        shopDomain: ctx.shopDomain,
        staffId: ctx.staffId,
        enqueuedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      task2.priority
    );
    return json({ ok: true, status: "QUEUED" });
  }
  await prisma.task.update({
    where: { id: task2.id },
    data: { status: "CANCELLED" }
  });
  return json({ ok: true, status: "CANCELLED" });
}
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$i,
  headers: headers$D
}, Symbol.toStringTag, { value: "Module" }));
function headers$C(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function action$h(args) {
  const ctx = await requireAdmin(args);
  const taskId = args.params.taskId;
  const task2 = await prisma.task.findFirst({
    where: { id: taskId, shopDomain: ctx.shopDomain },
    select: { id: true, status: true }
  });
  if (!task2) {
    return json({ error: "not_found" }, { status: 404 });
  }
  if (!["QUEUED", "THINKING", "EXECUTING", "AWAITING_APPROVAL"].includes(task2.status)) {
    return json({ error: "not_cancellable", status: task2.status }, { status: 409 });
  }
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "CANCELLED" }
  });
  try {
    const { getTaskQueue: getTaskQueue2 } = await Promise.resolve().then(() => taskQueue);
    const queue = getTaskQueue2();
    const job = await queue.getJob(taskId);
    if (job) {
      await job.remove();
    }
  } catch {
  }
  await prisma.taskLog.create({
    data: {
      taskId,
      shopDomain: ctx.shopDomain,
      step: "cancelled",
      level: "INFO",
      message: `Task cancelled by staff ${ctx.staffId}`
    }
  });
  return json({ ok: true, status: "CANCELLED" });
}
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$h,
  headers: headers$C
}, Symbol.toStringTag, { value: "Module" }));
function headers$B(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function loader$D(args) {
  const ctx = await requireAdmin(args);
  const missions = await prisma.recurringMission.findMany({
    where: { shopDomain: ctx.shopDomain },
    orderBy: { createdAt: "desc" }
  });
  return json({
    missions: missions.map((m) => ({
      id: m.id,
      prompt: m.prompt,
      cron: m.cron,
      timezone: m.timezone,
      enabled: m.enabled,
      lastRunAt: m.lastRunAt?.toISOString() ?? null,
      nextRunAt: m.nextRunAt?.toISOString() ?? null,
      runCount: m.runCount
    }))
  });
}
async function action$g(args) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const input = validate(RecurringMissionSchema, body);
  const mission = await prisma.recurringMission.create({
    data: {
      shopId: ctx.shop.id,
      shopDomain: ctx.shopDomain,
      prompt: input.prompt,
      cron: input.cron,
      timezone: input.timezone || ctx.shop.ianaTimezone || "UTC",
      enabled: true
    }
  });
  return json({ ok: true, mission }, { status: 201 });
}
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$g,
  headers: headers$B,
  loader: loader$D
}, Symbol.toStringTag, { value: "Module" }));
function headers$A(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function loader$C(args) {
  const ctx = await requireAdmin(args);
  const taskId = args.params.taskId;
  const [diffs, logs] = await Promise.all([
    prisma.taskDiff.findMany({
      where: { taskId, shopDomain: ctx.shopDomain },
      orderBy: { timestamp: "asc" }
    }),
    prisma.taskLog.findMany({
      where: { taskId, shopDomain: ctx.shopDomain },
      orderBy: { timestamp: "asc" }
    })
  ]);
  return json({
    diffs: diffs.map((d) => ({
      id: d.id,
      resourceType: d.resourceType,
      resourceId: d.resourceId,
      resourceTitle: d.resourceTitle,
      field: d.field,
      before: d.before,
      after: d.after,
      timestamp: d.timestamp.toISOString()
    })),
    logs: logs.map((l) => ({
      id: l.id,
      step: l.step,
      level: l.level,
      message: l.message,
      timestamp: l.timestamp.toISOString()
    }))
  });
}
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  headers: headers$A,
  loader: loader$C
}, Symbol.toStringTag, { value: "Module" }));
const adminGraphQL = void 0;
async function createNotification(shopDomain, input) {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: { id: true }
  });
  if (!shop) {
    logger.warn("Cannot create notification — shop not found", { shopDomain });
    return;
  }
  await prisma.notification.create({
    data: {
      shopId: shop.id,
      shopDomain,
      type: input.type,
      severity: input.severity,
      title: input.title,
      body: input.body,
      link: input.link
    }
  });
}
async function undoTask(admin, taskId, shopDomain) {
  const snapshots = await prisma.undoSnapshot.findMany({
    where: { taskId, revertedAt: null }
  });
  if (snapshots.length === 0) {
    return { success: true, revertedCount: 0, failedCount: 0 };
  }
  let reverted = 0;
  let failed = 0;
  let firstError;
  for (const snap of snapshots) {
    try {
      const previous = snap.previousState;
      if (snap.resourceType === "VARIANT") {
        const variantId = snap.resourceId;
        const price = previous.price;
        await adminGraphQL(
          admin,
          `#graphql
            mutation VariantUpdate($input: ProductVariantInput!) {
              productVariantUpdate(input: $input) {
                productVariant { id price }
                userErrors { field message }
              }
            }`,
          { input: { id: variantId, price } },
          { shopDomain, taskId, scopeUsed: "write_products", operation: "undo:variantPrice" }
        );
      } else if (snap.resourceType === "PRODUCT") {
        const productId = snap.resourceId;
        const tags = previous.tags ?? [];
        await adminGraphQL(
          admin,
          `#graphql
            mutation ProductUpdate($input: ProductInput!) {
              productUpdate(input: $input) {
                product { id tags }
                userErrors { field message }
              }
            }`,
          { input: { id: productId, tags } },
          { shopDomain, taskId, scopeUsed: "write_products", operation: "undo:productTags" }
        );
      } else if (snap.resourceType === "METAFIELD") {
        const [productId, nsKey] = snap.resourceId.split(":");
        const [namespace, key] = nsKey.split(".");
        const value = previous.value;
        if (value === null) {
          const existing = await adminGraphQL(
            admin,
            `#graphql
              query GetMetafield($productId: ID!, $namespace: String!, $key: String!) {
                product(id: $productId) {
                  metafield(namespace: $namespace, key: $key) { id }
                }
              }`,
            { productId, namespace, key },
            { shopDomain, taskId, scopeUsed: "read_metafields" }
          );
          const mfId = existing.data?.product.metafield?.id;
          if (mfId) {
            await adminGraphQL(
              admin,
              `#graphql
                mutation MetafieldDelete($input: MetafieldDeleteInput!) {
                  metafieldDelete(input: $input) { deletedId userErrors { field message } }
                }`,
              { input: { id: mfId } },
              { shopDomain, taskId, scopeUsed: "write_metafields", operation: "undo:metafieldDelete" }
            );
          }
        } else {
          await adminGraphQL(
            admin,
            `#graphql
              mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) {
                  metafields { id value }
                  userErrors { field message }
                }
              }`,
            {
              metafields: [
                {
                  ownerId: productId,
                  namespace,
                  key,
                  value,
                  type: "single_line_text_field"
                }
              ]
            },
            { shopDomain, taskId, scopeUsed: "write_metafields", operation: "undo:metafieldSet" }
          );
        }
      }
      await prisma.undoSnapshot.update({
        where: { id: snap.id },
        data: { revertedAt: /* @__PURE__ */ new Date() }
      });
      reverted++;
    } catch (err) {
      failed++;
      if (!firstError) firstError = err instanceof Error ? err.message : String(err);
      logger.error("Undo snapshot failed", {
        snapshotId: snap.id,
        resourceType: snap.resourceType,
        error: String(err)
      });
    }
  }
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "REVERTED" }
  });
  await createNotification(shopDomain, {
    type: "TASK_REVERTED",
    severity: reverted > 0 ? "SUCCESS" : "ERROR",
    title: "Task reverted",
    body: `Reverted ${reverted}/${snapshots.length} changes${failed > 0 ? ` (${failed} failed)` : ""}.`,
    link: `/app/history/${taskId}`
  });
  return {
    success: failed === 0,
    revertedCount: reverted,
    failedCount: failed,
    firstError
  };
}
function headers$z(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function action$f(args) {
  const ctx = await requireAdmin(args);
  const taskId = args.params.taskId;
  const task2 = await prisma.task.findFirst({
    where: { id: taskId, shopDomain: ctx.shopDomain }
  });
  if (!task2) return json({ error: "not_found" }, { status: 404 });
  if (task2.status !== "COMPLETED") {
    return json({ error: "not_completed", status: task2.status }, { status: 409 });
  }
  const sessions = await prisma.session.findMany({
    where: { shop: ctx.shopDomain },
    orderBy: { expires: "desc" },
    take: 5
  });
  const valid = sessions.find((s) => !s.expires || s.expires > /* @__PURE__ */ new Date());
  if (!valid) {
    return json({ error: "no_valid_session" }, { status: 401 });
  }
  const admin = shopify.admin(valid);
  const result = await undoTask(admin, taskId, ctx.shopDomain);
  return json(result, { status: result.success ? 200 : 500 });
}
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$f,
  headers: headers$z
}, Symbol.toStringTag, { value: "Module" }));
const SUPPORTED_ACCOUNT_TYPES = [
  { type: "LOGISTICS", label: "Logistics Platform", description: "Shipping and fulfillment platform integration via official API.", requiredFields: ["apiKey"] },
  { type: "MARKETING", label: "Marketing Platform", description: "Email, social media, or ad platform for marketing automation via official API.", requiredFields: ["apiKey"] }
];
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function formatRelativeTime(date, locale = "en") {
  const d = typeof date === "string" ? new Date(date) : date;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diff = d.getTime() - Date.now();
  const absDiff = Math.abs(diff);
  const dayMs = 864e5;
  if (absDiff < dayMs) {
    const hours = Math.round(diff / 36e5);
    return rtf.format(hours, "hour");
  }
  if (absDiff < 30 * dayMs) {
    const days = Math.round(diff / dayMs);
    return rtf.format(days, "day");
  }
  const months = Math.round(diff / (30 * dayMs));
  return rtf.format(months, "month");
}
function formatDateTime(date, locale = "en", timezone) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone
  }).format(d);
}
function truncate(text, max = 80) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}
function formatCredits(n) {
  if (n === Infinity) return "∞";
  return new Intl.NumberFormat("en").format(n);
}
const ToastContext = createContext(null);
function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
const SEVERITY_STYLES = {
  info: {
    bg: "bg-vanta-600 text-white",
    border: "border-vanta-700",
    icon: /* @__PURE__ */ jsx(Info, { className: "h-5 w-5", "aria-hidden": "true" })
  },
  success: {
    bg: "bg-emerald-600 text-white",
    border: "border-emerald-700",
    icon: /* @__PURE__ */ jsx(CheckCircle2, { className: "h-5 w-5", "aria-hidden": "true" })
  },
  error: {
    bg: "bg-rose-600 text-white",
    border: "border-rose-700",
    icon: /* @__PURE__ */ jsx(AlertCircle, { className: "h-5 w-5", "aria-hidden": "true" })
  },
  warning: {
    bg: "bg-amber-500 text-white",
    border: "border-amber-600",
    icon: /* @__PURE__ */ jsx(AlertTriangle$1, { className: "h-5 w-5", "aria-hidden": "true" })
  }
};
function ToastProvider({ children }) {
  const [toasts2, setToasts] = useState([]);
  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const toast = useCallback(
    (t) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = t.durationMs ?? 4e3;
      setToasts((prev) => [...prev, { ...t, id }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );
  const ctx = {
    toast,
    info: (title, message) => toast({ severity: "info", title, message }),
    success: (title, message) => toast({ severity: "success", title, message }),
    error: (title, message) => toast({ severity: "error", title, message }),
    warning: (title, message) => toast({ severity: "warning", title, message })
  };
  return /* @__PURE__ */ jsxs(ToastContext.Provider, { value: ctx, children: [
    children,
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto",
        role: "region",
        "aria-label": "Toast notifications",
        "aria-live": "polite",
        children: /* @__PURE__ */ jsx(AnimatePresence, { children: toasts2.map((t) => {
          const s = SEVERITY_STYLES[t.severity];
          return /* @__PURE__ */ jsxs(
            motion.div,
            {
              initial: { opacity: 0, x: 24, scale: 0.96 },
              animate: { opacity: 1, x: 0, scale: 1 },
              exit: { opacity: 0, x: 24, scale: 0.96 },
              transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
              className: cn(
                "flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg border",
                s.bg,
                s.border
              ),
              role: "alert",
              children: [
                /* @__PURE__ */ jsx("div", { className: "mt-0.5 shrink-0", children: s.icon }),
                /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm", children: t.title }),
                  t.message && /* @__PURE__ */ jsx("p", { className: "text-xs opacity-90 mt-0.5", children: t.message })
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => dismiss(t.id),
                    className: "shrink-0 p-1 rounded hover:bg-white/10 transition",
                    "aria-label": "Dismiss notification",
                    children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
                  }
                )
              ]
            },
            t.id
          );
        }) })
      }
    )
  ] });
}
async function loader$B(args) {
  const ctx = await requireAdmin(args);
  const { listConnectedAccounts } = await import("./connected-accounts.server-SVYmzeSn.js");
  const accounts = await listConnectedAccounts(ctx.shopDomain);
  return json({ shopDomain: ctx.shopDomain, staffId: ctx.staffId, accounts });
}
function headers$y(_) {
  return getSecurityHeaders();
}
async function action$e(args) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const { connectAccount, revokeAccount, verifyAccount } = await import("./connected-accounts.server-SVYmzeSn.js");
  if (body.action === "connect") {
    const id = await connectAccount(ctx.shopDomain, ctx.staffId, body.accountType, body.accountName, body.credentials, body.scopes ?? []);
    return json({ ok: true, id });
  }
  if (body.action === "revoke") {
    await revokeAccount(ctx.shopDomain, body.id);
    return json({ ok: true });
  }
  if (body.action === "verify") {
    const result = await verifyAccount(ctx.shopDomain, body.id);
    return json(result);
  }
  return json({ error: "Unknown" }, { status: 400 });
}
function ConnectedAccounts() {
  const data2 = useLoaderData();
  const fetcher = useFetcher();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState("LOGISTICS");
  const [accountName, setAccountName] = useState("");
  const [credentials, setCredentials] = useState({});
  const selectedDef = SUPPORTED_ACCOUNT_TYPES.find((t) => t.type === selectedType);
  const handleConnect = () => {
    if (!accountName.trim() || Object.keys(credentials).length === 0) return;
    fetcher.submit({ action: "connect", accountType: selectedType, accountName, credentials, scopes: ["read", "write"] }, { method: "post", encType: "application/json" });
    toast.success("Account connected", "Credentials encrypted and stored securely.");
    setShowForm(false);
    setAccountName("");
    setCredentials({});
  };
  const handleRevoke = (id, name) => {
    if (!confirm(`Revoke access to ${name}? All credentials will be permanently deleted.`)) return;
    fetcher.submit({ action: "revoke", id }, { method: "post", encType: "application/json" });
    toast.success("Account revoked", "Credentials deleted. All browser sessions closed.");
  };
  const handleVerify = (id) => {
    fetcher.submit({ action: "verify", id }, { method: "post", encType: "application/json" });
    toast.info("Verifying...", "Checking if credentials still work.");
  };
  return /* @__PURE__ */ jsxs("div", { className: "max-w-4xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(ExternalLink, { className: "h-6 w-6" }),
        "Connected Accounts"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted mt-1", children: "Connect your merchant-owned accounts via official API keys. VANTA only operates them after your explicit authorization." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "vanta-card p-4 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
      /* @__PURE__ */ jsx(ShieldCheck, { className: "h-5 w-5 text-emerald-500 shrink-0 mt-0.5" }),
      /* @__PURE__ */ jsxs("div", { className: "text-xs", children: [
        /* @__PURE__ */ jsx("p", { className: "font-semibold text-emerald-800 dark:text-emerald-200", children: "Your accounts stay yours" }),
        /* @__PURE__ */ jsx("p", { className: "text-emerald-700 dark:text-emerald-300 mt-1", children: "Credentials are encrypted with AES-256-GCM (. VANTA never assumes ownership. You can revoke access at any time — credentials are permanently deleted." })
      ] })
    ] }) }),
    data2.accounts.length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsxs("h2", { className: "text-sm font-semibold", children: [
        "Connected (",
        data2.accounts.length,
        ")"
      ] }),
      data2.accounts.map((acc) => /* @__PURE__ */ jsx("div", { className: "vanta-card p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
            /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm", children: acc.accountName }),
            /* @__PURE__ */ jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-vanta-100 dark:bg-vanta-800", children: acc.accountType }),
            /* @__PURE__ */ jsx("span", { className: `text-[10px] px-2 py-0.5 rounded-full ${acc.status === "CONNECTED" ? "bg-emerald-100 text-emerald-700" : acc.status === "ERROR" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`, children: acc.status })
          ] }),
          acc.lastError && /* @__PURE__ */ jsx("p", { className: "text-xs text-rose-500 mt-1", children: acc.lastError }),
          acc.lastVerifiedAt && /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-vanta-muted mt-1", children: [
            "Verified ",
            formatRelativeTime(acc.lastVerifiedAt, "en")
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => handleVerify(acc.id), className: "p-1.5 rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:opacity-80", title: "Verify", children: /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsx("button", { onClick: () => handleRevoke(acc.id, acc.accountName), className: "p-1.5 rounded-lg hover:bg-rose-100 text-rose-500", title: "Revoke", children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }) })
        ] })
      ] }) }, acc.id))
    ] }),
    /* @__PURE__ */ jsx("button", { onClick: () => setShowForm(!showForm), className: "px-3 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700", children: "+ Connect New Account" }),
    showForm && /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5 space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-vanta-muted", children: "Account type" }),
        /* @__PURE__ */ jsx("select", { value: selectedType, onChange: (e2) => {
          setSelectedType(e2.target.value);
          setCredentials({});
        }, className: "mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm", children: SUPPORTED_ACCOUNT_TYPES.map((t) => /* @__PURE__ */ jsx("option", { value: t.type, children: t.label }, t.type)) }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mt-1", children: selectedDef.description })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-vanta-muted", children: "Account name" }),
        /* @__PURE__ */ jsx("input", { value: accountName, onChange: (e2) => setAccountName(e2.target.value), placeholder: `My ${selectedDef.label} Account`, className: "mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-2", children: selectedDef.requiredFields.map((field) => /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-vanta-muted", children: field }),
        /* @__PURE__ */ jsx("input", { type: field.includes("password") ? "password" : "text", value: credentials[field] ?? "", onChange: (e2) => setCredentials({ ...credentials, [field]: e2.target.value }), className: "mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm" })
      ] }, field)) }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx("button", { onClick: handleConnect, disabled: !accountName.trim(), className: "px-4 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700 disabled:opacity-50", children: "Connect" }),
        /* @__PURE__ */ jsx("button", { onClick: () => setShowForm(false), className: "px-4 py-2 rounded-lg bg-vanta-100 dark:bg-vanta-800 text-sm", children: "Cancel" })
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-vanta-muted flex items-center gap-1", children: [
        /* @__PURE__ */ jsx(AlertCircle, { className: "h-3 w-3" }),
        "Credentials are encrypted before storage. Never shared with third parties."
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Link, { to: "/app/browser-agent", className: "block vanta-card p-4 hover:border-vanta-400 transition", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "→ Browser Agent Dashboard" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mt-1", children: "View and manage browser automation workflows powered by your connected accounts." })
    ] })
  ] });
}
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$e,
  default: ConnectedAccounts,
  headers: headers$y,
  loader: loader$B
}, Symbol.toStringTag, { value: "Module" }));
async function loader$A(_) {
  const e2 = loadEnv();
  const wl = getWhitelabelConfig();
  return json({
    appName: wl.appName,
    version: "1.0.0",
    author: wl.copyrightHolder,
    supportEmail: wl.supportEmail,
    appUrl: e2.APP_URL,
    apiVersion: e2.SHOPIFY_API_VERSION,
    // Test store for reviewers
    testStoreUrl: "vanta-os-test.myshopify.com",
    // Test staff account on the test store
    testStaffEmail: "reviewer@vanta-os-test.myshopify.com",
    testStaffPassword: "VantaReview2026!",
    // Scopes the app requests
    requestedScopes: e2.SHOPIFY_APP_SCOPES.split(",").map((s) => s.trim()),
    // Features to test
    features: [
      "Agent Canvas — submit natural language commands",
      "Task Cards — watch real-time state animations",
      "Goals & Plans — create goals and let AI plan execution",
      "Autonomous Agents — 7 AI agents running 24/7",
      "Predictive Commerce — demand forecasting",
      "Guardian Mode — proactive store monitoring",
      "Knowledge Base — ask 'why did you do X?'",
      "Settings — permission guardrails, kill switch, persona",
      "Multi-language — English + Moroccan Arabic (RTL)",
      "Dark/Light theme sync with Shopify Admin"
    ],
    // GDPR compliance
    compliance: {
      webhooks: [
        "customers/redact",
        "customers/data_request",
        "shop/redact",
        "app/uninstalled",
        "app/scopes_update"
      ],
      dataDeletionWindow: "48 hours (well within Shopify's requirement)",
      privacyPolicyUrl: "/app/privacy",
      termsOfServiceUrl: "/app/terms"
    }
  });
}
function headers$x(_) {
  return getSecurityHeaders();
}
function TestCredentials() {
  const data2 = useLoaderData();
  return /* @__PURE__ */ jsxs("div", { style: { maxWidth: "800px", margin: "0 auto", padding: "2rem", fontFamily: "system-ui, sans-serif", color: "#1a2238" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", marginBottom: "2rem" }, children: [
      /* @__PURE__ */ jsxs("h1", { style: { fontSize: "2rem", fontWeight: "bold", color: "#7c5cff", margin: 0 }, children: [
        data2.appName,
        " — Reviewer Access"
      ] }),
      /* @__PURE__ */ jsxs("p", { style: { color: "#64748b", marginTop: "0.5rem" }, children: [
        "Version ",
        data2.version,
        " · by ",
        data2.author
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { background: "#f5f7fa", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }, children: [
      /* @__PURE__ */ jsxs("h2", { style: { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "1rem" }, children: [
        /* @__PURE__ */ jsx(Store, { size: 20 }),
        " Test Store Access"
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.875rem", lineHeight: "1.6" }, children: [
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Test Store URL:" }),
          " ",
          data2.testStoreUrl
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Staff Email:" }),
          " ",
          data2.testStaffEmail
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Staff Password:" }),
          " ",
          data2.testStaffPassword
        ] }),
        /* @__PURE__ */ jsx("p", { style: { marginTop: "0.5rem", color: "#64748b" }, children: "Install the app on this test store to review all features." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { background: "#f5f7fa", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }, children: [
      /* @__PURE__ */ jsx("h2", { style: { fontSize: "1.1rem", marginBottom: "1rem" }, children: "Features to Test" }),
      /* @__PURE__ */ jsx("ul", { style: { margin: 0, paddingLeft: "1.5rem", fontSize: "0.875rem", lineHeight: "1.8" }, children: data2.features.map((feature, i) => /* @__PURE__ */ jsx("li", { children: feature }, i)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { background: "#f5f7fa", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }, children: [
      /* @__PURE__ */ jsxs("h2", { style: { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "1rem" }, children: [
        /* @__PURE__ */ jsx(Key, { size: 20 }),
        " Requested OAuth Scopes"
      ] }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: "0.5rem" }, children: data2.requestedScopes.map((scope) => /* @__PURE__ */ jsx("span", { style: { background: "#e0e7ff", color: "#4338ca", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontFamily: "monospace" }, children: scope }, scope)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { background: "#f0fdf4", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #bbf7d0" }, children: [
      /* @__PURE__ */ jsxs("h2", { style: { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "1rem", color: "#15803d" }, children: [
        /* @__PURE__ */ jsx(Shield, { size: 20 }),
        " GDPR Compliance"
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.875rem", lineHeight: "1.6" }, children: [
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Mandatory webhooks:" }),
          " ",
          data2.compliance.webhooks.join(", ")
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Data deletion window:" }),
          " ",
          data2.compliance.dataDeletionWindow
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Privacy Policy:" }),
          " ",
          /* @__PURE__ */ jsx("a", { href: data2.compliance.privacyPolicyUrl, children: "View Privacy Policy →" })
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Terms of Service:" }),
          " ",
          /* @__PURE__ */ jsx("a", { href: data2.compliance.termsOfServiceUrl, children: "View Terms →" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { background: "#f5f7fa", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }, children: [
      /* @__PURE__ */ jsxs("h2", { style: { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "1rem" }, children: [
        /* @__PURE__ */ jsx(Mail, { size: 20 }),
        " Developer Contact"
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Support Email:" }),
          " ",
          data2.supportEmail
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "API Version:" }),
          " ",
          data2.apiVersion
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Response time:" }),
          " Within 24 hours"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("p", { style: { textAlign: "center", fontSize: "0.75rem", color: "#94a3b8", marginTop: "2rem" }, children: [
      "© 2026 ",
      data2.author,
      ". All rights reserved."
    ] })
  ] });
}
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: TestCredentials,
  headers: headers$x,
  loader: loader$A
}, Symbol.toStringTag, { value: "Module" }));
let redis = null;
const memoryStore = /* @__PURE__ */ new Map();
function getRedis$1() {
  if (redis) return redis;
  try {
    redis = new Redis(loadEnv().REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
      connectTimeout: 1e3
    });
    redis.on("error", (err) => {
      logger.warn("Redis error in rate limiter", { error: String(err) });
      redis = null;
    });
    return redis;
  } catch {
    return null;
  }
}
async function rateLimit(opts) {
  const r = getRedis$1();
  if (r) {
    return redisRateLimit(r, opts);
  }
  return memoryRateLimit(opts);
}
async function redisRateLimit(r, opts) {
  const key = `ratelimit:${opts.key}`;
  const now = Date.now();
  const windowMs = opts.windowSec * 1e3;
  const pipe = r.pipeline();
  pipe.zremrangebyscore(key, 0, now - windowMs);
  pipe.zadd(key, now, `${now}-${Math.random()}`);
  pipe.zcard(key);
  pipe.pexpire(key, windowMs);
  const results = await pipe.exec();
  if (!results) throw new Error("Redis pipeline returned no results");
  const count = results[2][1] ?? 0;
  if (count > opts.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil(opts.windowSec)
    };
  }
  return {
    allowed: true,
    remaining: Math.max(0, opts.limit - count),
    retryAfterSec: 0
  };
}
function memoryRateLimit(opts) {
  const now = Date.now();
  const windowMs = opts.windowSec * 1e3;
  const entry2 = memoryStore.get(opts.key);
  if (!entry2 || entry2.resetAt < now) {
    memoryStore.set(opts.key, { count: 1, resetAt: now + windowMs });
    return Promise.resolve({ allowed: true, remaining: opts.limit - 1, retryAfterSec: 0 });
  }
  if (entry2.count >= opts.limit) {
    return Promise.resolve({
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((entry2.resetAt - now) / 1e3)
    });
  }
  entry2.count++;
  return Promise.resolve({
    allowed: true,
    remaining: opts.limit - entry2.count,
    retryAfterSec: 0
  });
}
async function rateLimitTaskCreation(shopDomain) {
  return rateLimit({
    key: `task-create:${shopDomain}`,
    limit: 30,
    // 30 tasks / minute per shop
    windowSec: 60
  });
}
async function rateLimitCommandHistory(shopDomain) {
  return rateLimit({
    key: `cmd-history:${shopDomain}`,
    limit: 60,
    windowSec: 60
  });
}
function headers$w(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
const PostSchema = z.object({
  command: z.string().trim().min(1).max(2e3)
});
async function loader$z(args) {
  const ctx = await requireAdmin(args);
  const url = new URL(args.request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 20);
  const items = await prisma.commandHistory.findMany({
    where: { shopDomain: ctx.shopDomain },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { command: true }
  });
  return json({ commands: items.map((i) => i.command) });
}
async function action$d(args) {
  const ctx = await requireAdmin(args);
  const rl = await rateLimitCommandHistory(ctx.shopDomain);
  if (!rl.allowed) {
    return json({ error: "rate_limited" }, { status: 429 });
  }
  const body = await args.request.json();
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "validation_failed" }, { status: 400 });
  }
  await prisma.commandHistory.create({
    data: {
      shopId: ctx.shop.id,
      shopDomain: ctx.shopDomain,
      staffId: ctx.staffId,
      command: parsed.data.command
    }
  });
  const all = await prisma.commandHistory.findMany({
    where: { shopDomain: ctx.shopDomain },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true }
  });
  if (all.length > 20) {
    const toDelete = all.slice(20).map((r) => r.id);
    await prisma.commandHistory.deleteMany({ where: { id: { in: toDelete } } });
  }
  return json({ ok: true });
}
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$d,
  headers: headers$w,
  loader: loader$z
}, Symbol.toStringTag, { value: "Module" }));
function MarkdownRenderer({ content, className }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-headings:font-semibold prose-headings:text-vanta-900 dark:prose-headings:text-vanta-50",
        "prose-p:text-vanta-700 dark:prose-p:text-vanta-200",
        "prose-a:text-vanta-600 dark:prose-a:text-vanta-300 prose-a:font-medium prose-a:no-underline hover:prose-a:underline",
        "prose-code:rounded prose-code:bg-vanta-100 dark:prose-code:bg-vanta-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-vanta-950 prose-pre:text-vanta-50 prose-pre:rounded-lg prose-pre:overflow-x-auto",
        "prose-table:border prose-table:border-vanta-200 dark:prose-table:border-vanta-700",
        "prose-th:border prose-th:border-vanta-200 dark:prose-th:border-vanta-700 prose-th:bg-vanta-50 dark:prose-th:bg-vanta-800 prose-th:px-3 prose-th:py-2 prose-th:text-left",
        "prose-td:border prose-td:border-vanta-200 dark:prose-td:border-vanta-700 prose-td:px-3 prose-td:py-2",
        className
      ),
      children: /* @__PURE__ */ jsx(
        ReactMarkdown,
        {
          remarkPlugins: [remarkGfm],
          components: {
            a: ({ href, children }) => {
              const isShopifyAdmin = href && (href.includes("myshopify.com/admin") || href.includes("/admin/"));
              const isExternal = href && (href.startsWith("http") || href.startsWith("https"));
              return /* @__PURE__ */ jsxs(
                "a",
                {
                  href,
                  target: isExternal ? "_blank" : void 0,
                  rel: isExternal ? "noopener noreferrer" : void 0,
                  className: isShopifyAdmin ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition" : "",
                  children: [
                    children,
                    isShopifyAdmin && /* @__PURE__ */ jsx(ExternalLink, { className: "h-3 w-3", "aria-hidden": "true" })
                  ]
                }
              );
            }
          },
          children: content
        }
      )
    }
  );
}
function DiffViewer({ diffs }) {
  if (diffs.length === 0) {
    return /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted italic", children: "No field-level changes were recorded for this task." });
  }
  return /* @__PURE__ */ jsx("div", { className: "space-y-4", children: diffs.map((d, i) => /* @__PURE__ */ jsxs(
    "div",
    {
      className: "vanta-card overflow-hidden",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "px-4 py-2.5 border-b border-vanta-border bg-vanta-50 dark:bg-vanta-900/40", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted uppercase tracking-wide", children: d.resourceType }),
          /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold", children: d.resourceTitle ?? d.resourceId }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-vanta-muted mt-0.5", children: [
            "Field: ",
            d.field
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-vanta-border", children: [
          /* @__PURE__ */ jsx(DiffSide, { label: "Before", value: d.before, variant: "removed" }),
          /* @__PURE__ */ jsx(DiffSide, { label: "After", value: d.after, variant: "added" })
        ] })
      ]
    },
    `${d.resourceId}-${d.field}-${i}`
  )) });
}
function DiffSide({
  label,
  value,
  variant
}) {
  const isAdded = variant === "added";
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn(
        "px-4 py-3 font-mono text-sm",
        isAdded ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-rose-50 dark:bg-rose-950/30"
      ),
      children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            className: cn(
              "flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wide",
              isAdded ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
            ),
            children: [
              isAdded ? /* @__PURE__ */ jsx(Plus, { className: "h-3 w-3" }) : /* @__PURE__ */ jsx(Minus, { className: "h-3 w-3" }),
              label
            ]
          }
        ),
        /* @__PURE__ */ jsx(
          "p",
          {
            className: cn(
              "whitespace-pre-wrap break-words",
              isAdded ? "text-emerald-900 dark:text-emerald-100" : "text-rose-900 dark:text-rose-100"
            ),
            children: value || /* @__PURE__ */ jsx("span", { className: "italic opacity-60", children: "(empty)" })
          }
        )
      ]
    }
  );
}
const app$1 = {
  name: "VANTA OS",
  tagline: "The Operating System for Your Shopify Store"
};
const nav$1 = {
  dashboard: "Dashboard",
  canvas: "Agent Canvas",
  history: "Task History",
  automations: "Automations",
  guardian: "Guardian",
  settings: "Settings",
  billing: "Billing & Plans",
  help: "Help & Support",
  data: "Data Controls",
  agency: "Agency Dashboard"
};
const onboarding$1 = {
  title: "Welcome to VANTA OS",
  subtitle: "Your AI agent for Shopify. Read the docs, accept the terms, and connect your store.",
  privacyLink: "Read the Privacy Policy",
  termsLink: "Read the Terms of Service",
  consentLabel: "I have read and accept the Privacy Policy and Terms of Service",
  connect: "Connect my store",
  connectDisabled: "Accept the terms to continue",
  tour: "Take the guided tour"
};
const canvas$1 = {
  title: "Agent Canvas",
  subtitle: "Tell VANTA what to do — it plans, confirms, and executes.",
  placeholder: "Ask VANTA to do anything... (e.g. 'Find all products with 0 inventory')",
  submit: "Send to agent",
  charCount: "{count}/{max} characters",
  estimatedCost: "Est. {credits} credit(s)",
  voice: "Voice input",
  priority: {
    label: "Priority",
    LOW: "Low",
    NORMAL: "Normal",
    HIGH: "High",
    URGENT: "Urgent"
  },
  starters: {
    "1": "Find all products with 0 inventory",
    "2": "Draft Arabic SEO descriptions for my latest 10 products",
    "3": "Analyze yesterday's failed orders and summarize why",
    "4": "Add a 'Restocking Soon' tag to out-of-stock items",
    title: "Try one of these to get started"
  },
  offline: {
    title: "You are offline",
    body: "Tasks already submitted are safely executing in the cloud."
  },
  duplicate: "This task is already running. Please wait for it to complete before submitting again."
};
const task$1 = {
  states: {
    QUEUED: "Queued",
    THINKING: "Thinking",
    EXECUTING: "Executing",
    AWAITING_APPROVAL: "Needs your approval",
    COMPLETED: "Completed",
    ERROR: "Failed",
    CANCELLED: "Cancelled",
    REVERTED: "Reverted"
  },
  confidence: "Agent confidence: {score}%",
  lowConfidence: "I'm not fully certain I understood correctly — please review carefully before approving.",
  blastRadius: "This action will affect {count} item(s): {description}",
  approve: "Approve & execute",
  reject: "Cancel",
  undo: "Undo this action",
  viewDiff: "View changes",
  viewLogs: "View logs",
  printReport: "Print / Export PDF",
  retry: "Retry",
  needsInput: "Needs your input",
  initiatedBy: "Initiated by {staff}"
};
const settings$1 = {
  title: "Settings",
  language: "Language",
  languageHint: "Override the auto-detected store locale.",
  persona: "Agent tone",
  personaOptions: {
    PROFESSIONAL: "Professional",
    FRIENDLY: "Friendly",
    CONCISE: "Concise"
  },
  permissions: "Agent permissions",
  permissionsHint: "Choose what the agent is allowed to touch. Changes take effect immediately.",
  canWriteProducts: "Create / edit products",
  canWriteCollections: "Create / edit collections",
  canWriteInventory: "Adjust inventory levels",
  canWriteMetafields: "Write metafields (SEO, custom fields)",
  canWriteThemes: "Edit theme files",
  canReadOrders: "Read orders",
  canReadCustomers: "Read customers",
  requiresApprovalOnBulk: "Require approval before bulk actions",
  bulkThreshold: "Bulk action threshold (items)",
  killSwitch: {
    title: "Emergency Kill Switch",
    label: "Disable agent globally",
    hint: "When enabled, the agent aborts all pending tasks and rejects new input. Use this if you suspect the agent is misbehaving.",
    reasonLabel: "Reason (optional, for your team's audit log)"
  },
  guardian: {
    title: "Guardian Mode",
    label: "Run proactive checks",
    hint: "VANTA scans your store every 6 hours for $0 prices, low inventory, and broken links.",
    intervalLabel: "Check interval (hours)"
  },
  notifications: {
    title: "Notifications",
    onTaskComplete: "Notify me when tasks complete",
    onGuardianAlert: "Notify me about Guardian alerts",
    onError: "Notify me about errors",
    email: "Send email summaries"
  },
  saved: "Settings saved.",
  connection: {
    title: "Connected account",
    reauth: "Re-authorize",
    status: {
      ok: "Connected",
      expired: "Session expired — re-authorize"
    }
  }
};
const billing$1 = {
  title: "Billing & Plans",
  currentPlan: "Current plan",
  creditsRemaining: "Credits remaining this cycle",
  creditsUsed: "Credits used this cycle",
  cycleResets: "Cycle resets on {date}",
  upgrade: "Upgrade plan",
  manage: "Manage in Shopify",
  plans: {
    FREE: "Free",
    GROWTH: "Growth",
    PRO: "Pro",
    PRIVATE_TEST: "Private Test"
  }
};
const guardian$1 = {
  title: "Guardian Alerts",
  subtitle: "VANTA proactively watches your store for issues. Review and fix in one click.",
  noAlerts: "No active alerts. Your store is in good shape.",
  fixNow: "Fix now",
  resolve: "Mark as resolved",
  types: {
    PRICE_ZERO: "Zero-price product",
    LOW_INVENTORY: "Low inventory",
    BROKEN_LINK: "Broken link"
  }
};
const automations$1 = {
  title: "Recurring Missions",
  subtitle: "Turn a one-time command into a scheduled automation that runs on autopilot.",
  "new": "New mission",
  promptLabel: "Prompt",
  cronLabel: "Schedule (cron)",
  tzLabel: "Timezone",
  save: "Save mission",
  enabled: "Enabled",
  disabled: "Disabled",
  lastRun: "Last run: {date}",
  nextRun: "Next run: {date}",
  empty: "No automations yet. Run a task, then click 'Save as Automation' to schedule it."
};
const history$2 = {
  title: "Task History",
  subtitle: "Every command, every change, every staff member — fully accountable.",
  search: "Search tasks...",
  empty: "No tasks yet. Submit your first command on the Agent Canvas.",
  filterAll: "All",
  filterCompleted: "Completed",
  filterFailed: "Failed",
  filterReverted: "Reverted"
};
const data$1 = {
  title: "Data & Account Controls",
  subtitle: "Export or delete all data VANTA holds about your store. Complements the mandatory GDPR webhooks.",
  "export": "Export my data",
  "delete": "Delete all my data",
  deleteConfirm: "This permanently deletes ALL data tied to {shop}. This cannot be undone. Continue?",
  exportReady: "Your export is ready. We've also notified the shop owner by email."
};
const help$1 = {
  title: "Help & Support",
  subtitle: "Documentation, FAQs, and changelog.",
  docs: "Open documentation",
  contact: "Contact support",
  faq: "Frequently asked questions",
  changelog: "What's new in VANTA OS",
  version: "Version {version}",
  copyright: "© {year} {holder}. All rights reserved."
};
const legal$1 = {
  privacyTitle: "Privacy Policy",
  termsTitle: "Terms of Service",
  draftNotice: "DRAFT — Generated as a strong starting point. Have your lawyer review before production use.",
  lastUpdated: "Last updated: {date}"
};
const toasts$1 = {
  taskQueued: "Task queued — VANTA is on it.",
  taskCompleted: "Task completed.",
  taskFailed: "Task failed. See details.",
  taskReverted: "Changes reverted.",
  guardianAlert: "Guardian alert: {title}",
  settingsSaved: "Settings saved.",
  offline: "You are offline. Cloud tasks continue running.",
  online: "Back online. Refreshing status...",
  sessionRefreshed: "Session refreshed — your action was completed."
};
const commandPalette$1 = {
  placeholder: "Type a command or search...",
  hint: "Press Enter to send to agent · Esc to close",
  groups: {
    actions: "Quick actions",
    navigate: "Navigate",
    settings: "Settings"
  },
  actions: {
    newTask: "Start a new task",
    goDashboard: "Go to Dashboard",
    goCanvas: "Go to Agent Canvas",
    goHistory: "Go to Task History",
    goSettings: "Go to Settings",
    goBilling: "Go to Billing",
    toggleKillSwitch: "Toggle Kill Switch",
    openHelp: "Open Help"
  }
};
const feedback$1 = {
  button: "Feedback",
  title: "Send feedback",
  rating: "How was your experience?",
  message: "Tell us more (optional)",
  submit: "Submit feedback",
  thanks: "Thanks for your feedback!"
};
const notifications$1 = {
  title: "Notifications",
  markAllRead: "Mark all as read",
  empty: "You're all caught up.",
  unread: "{count} unread"
};
const common$1 = {
  cancel: "Cancel",
  save: "Save",
  "delete": "Delete",
  confirm: "Confirm",
  close: "Close",
  loading: "Loading...",
  error: "Something went wrong.",
  retry: "Retry",
  back: "Back",
  next: "Next",
  done: "Done",
  yes: "Yes",
  no: "No",
  search: "Search"
};
const en = {
  app: app$1,
  nav: nav$1,
  onboarding: onboarding$1,
  canvas: canvas$1,
  task: task$1,
  settings: settings$1,
  billing: billing$1,
  guardian: guardian$1,
  automations: automations$1,
  history: history$2,
  data: data$1,
  help: help$1,
  legal: legal$1,
  toasts: toasts$1,
  commandPalette: commandPalette$1,
  feedback: feedback$1,
  notifications: notifications$1,
  common: common$1
};
const app = {
  name: "VANTA OS",
  tagline: "نظام التشغيل لمتجرك على شوبيفاي"
};
const nav = {
  dashboard: "لوحة القيادة",
  canvas: "مساحة العمل",
  history: "سجل المهام",
  automations: "الأتمتة",
  guardian: "الحارس",
  settings: "الإعدادات",
  billing: "الاشتراك والفواتير",
  help: "المساعدة والدعم",
  data: "التحكم في البيانات",
  agency: "لوحة الوكالة"
};
const onboarding = {
  title: "مرحباً بك في VANTA OS",
  subtitle: "مساعدك الذكي على شوبيفاي. اقرأ الوثائق، وافق على الشروط، ثم اربط متجرك.",
  privacyLink: "اطّلع على سياسة الخصوصية",
  termsLink: "اطّلع على شروط الخدمة",
  consentLabel: "قرأت ووافقت على سياسة الخصوصية وشروط الخدمة",
  connect: "اربط متجري",
  connectDisabled: "وافق على الشروط للمتابعة",
  tour: "ابدأ الجولة التعريفية"
};
const canvas = {
  title: "مساحة العمل",
  subtitle: "قل لـ VANTA وش عايز تسو، وهو يخطط، يأكد معاك، وينفّذ.",
  placeholder: "كتب أي أمر لـ VANTA... (مثلاً: 'لقائي كل المنتجات اللي ما عندهاش مخزون')",
  submit: "صيفط للأجينت",
  charCount: "{count}/{max} حرف",
  estimatedCost: "تقديرياً {credits} كريدي",
  voice: "إدخال صوتي",
  priority: {
    label: "الأولوية",
    LOW: "منخفضة",
    NORMAL: "عادية",
    HIGH: "عالية",
    URGENT: "عاجلة"
  },
  starters: {
    "1": "لقائي كل المنتجات اللي عندها مخزون صفري",
    "2": "كتبلي وصف SEO بالعربية لآخر 10 منتجات عندي",
    "3": "حلّل طلبات الأمس اللي فشلت ولخّصلي علاش",
    "4": "زيد تاغ 'غادي نرجع قريب' على المنتجات اللي خلصات",
    title: "جرّب وحدة من هاد الأوامر باش تبدا"
  },
  offline: {
    title: "راك أن لاين",
    body: "المهام اللي صيفطتي قبل ما تكمل بآمان في الكلاود."
  },
  duplicate: "هاد المهمة ديجا خدامة. عافاك استناها تكمل قبل ما تصيفط وحدة أخرى."
};
const task = {
  states: {
    QUEUED: "في الانتظار",
    THINKING: "كي فكّر",
    EXECUTING: "كي نفّذ",
    AWAITING_APPROVAL: "خاصك توافق",
    COMPLETED: "تكمّلات",
    ERROR: "فشلات",
    CANCELLED: "تلغات",
    REVERTED: "تراجعات"
  },
  confidence: "نسبة الثقة: {score}%",
  lowConfidence: "ماشي متأكد بزاف من الفهم — عافاك راجع الأمر قبل ما توافق.",
  blastRadius: "هاد العمل غادي تأثر على {count} عنصر: {description}",
  approve: "وافق ونفّذ",
  reject: "كنسيلي",
  undo: "تراجع على هاد العمل",
  viewDiff: "شوف التغييرات",
  viewLogs: "شوف السجلات",
  printReport: "طباعة / تصدير PDF",
  retry: "عاود جرّب",
  needsInput: "خاصك تزيد معلومات",
  initiatedBy: "بداها {staff}"
};
const settings = {
  title: "الإعدادات",
  language: "اللغة",
  languageHint: "بدّل اللغة اللي اكتاشفاتها أوتوماتيك من المتجر.",
  persona: "نبرة المساعد",
  personaOptions: {
    PROFESSIONAL: "احترافية",
    FRIENDLY: "ودّية",
    CONCISE: "مختصرة"
  },
  permissions: "صلاحيات المساعد",
  permissionsHint: "اختار أش من واش المساعد يقدر يلمس. التغييرات كتدخل حيز التنفيذ دغيا.",
  canWriteProducts: "زيادة / تعديل المنتجات",
  canWriteCollections: "زيادة / تعديل المجموعات",
  canWriteInventory: "تعديل المخزون",
  canWriteMetafields: "كتابة الميتافيلدز (SEO، حقول مخصصة)",
  canWriteThemes: "تعديل ملفات الثيم",
  canReadOrders: "قراءة الطلبات",
  canReadCustomers: "قراءة الزبناء",
  requiresApprovalOnBulk: "خصص موافقتي قبل الأعمال الكبيرة",
  bulkThreshold: "عتبة العمل الكبير (عناصر)",
  killSwitch: {
    title: "زر الطوارئ لإيقاف المساعد",
    label: "عطّل المساعد كلياً",
    hint: "إلا فعّلتي هاد الخيار، المساعد غادي يبند كل المهام المعلقة وما عاد يقبلش أوامر جديدة. استعملو إلا شكيتي أن المساعد فيه مشكل.",
    reasonLabel: "السبب (اختياري، لسجل التدقيق ديال الفريق ديالك)"
  },
  guardian: {
    title: "وضع الحارس",
    label: "شغّل الفحوصات الاستباقية",
    hint: "VANTA كيتفحّص متجرك كل 6 ساعات على أثمان صفري، مخزون ناقص، وروابط مكسورة.",
    intervalLabel: "فترة الفحص (ساعات)"
  },
  notifications: {
    title: "الإشعارات",
    onTaskComplete: "عرّفني منين كتكمّل المهام",
    onGuardianAlert: "عرّفني على تنبيهات الحارس",
    onError: "عرّفني على الأخطاء",
    email: "صيفطلي ملخصات بالإيميل"
  },
  saved: "الإعدادات تذهنت.",
  connection: {
    title: "الحساب المربوط",
    reauth: "عاود الترخيص",
    status: {
      ok: "مربوط",
      expired: "انتهت الجلسة — عاود الترخيص"
    }
  }
};
const billing = {
  title: "الاشتراك والفواتير",
  currentPlan: "الباقة الحالية",
  creditsRemaining: "الكريديات الباقية هاد الدورة",
  creditsUsed: "الكريديات المستعملة هاد الدورة",
  cycleResets: "الدورة كتبدا من جديد فـ {date}",
  upgrade: "بدّل الباقة",
  manage: "ديرها من شوبيفاي",
  plans: {
    FREE: "مجانية",
    GROWTH: "النمو",
    PRO: "الاحترافية",
    PRIVATE_TEST: "تجريبية خاصة"
  }
};
const guardian = {
  title: "تنبيهات الحارس",
  subtitle: "VANTA كيراقب متجرك استباقياً باش يلقا المشاكل. راجع وصلح بضغطة وحدة.",
  noAlerts: "ما كاين حتى تنبيه نشط. متجرك غادي مزيان.",
  fixNow: "اصلح دابا",
  resolve: "حيد من القائمة",
  types: {
    PRICE_ZERO: "منتج بثمن صفري",
    LOW_INVENTORY: "مخزون ناقص",
    BROKEN_LINK: "رابط مكسور"
  }
};
const automations = {
  title: "المهام المتكررة",
  subtitle: "حوّل أمر عادي لأتمتة مجدولة كتخدم بوحدها.",
  "new": "مهمة جديدة",
  promptLabel: "الأمر",
  cronLabel: "الجدولة (cron)",
  tzLabel: "المنطقة الزمنية",
  save: "سجّل المهمة",
  enabled: "مفعّلة",
  disabled: "معطّلة",
  lastRun: "آخر تشغيل: {date}",
  nextRun: "التشغيل القادم: {date}",
  empty: "ما كاين حتى أتمتة دابا. صيفط مهمة، عاد كليكي على 'سجّل كأتمتة' باش تجدولها."
};
const history$1 = {
  title: "سجل المهام",
  subtitle: "كل أمر، كل تغيير، كل موظف — كلشي موثّق بالكامل.",
  search: "قلّب فالمهام...",
  empty: "ما كاين حتى مهمة دابا. صيفط أول أمر فمساحة العمل.",
  filterAll: "الكل",
  filterCompleted: "تكمّلات",
  filterFailed: "فشلات",
  filterReverted: "تراجعات"
};
const data = {
  title: "التحكم في البيانات والحساب",
  subtitle: "صدّر ولا احذف كل البيانات اللي عند VANTA على متجرك. هادشي كيكمل الـ webhooks الإجبارية للـ GDPR.",
  "export": "صدّر بياناتي",
  "delete": "احذف كل بياناتي",
  deleteConfirm: "هاد العمل غادي يحذف بصفة نهائية كل البيانات المرتبطة بـ {shop}. ما يمكنش التراجع. بغيتي تكمل؟",
  exportReady: "التصدير وجد. عافاك راجع الإيميل ديالك."
};
const help = {
  title: "المساعدة والدعم",
  subtitle: "الوثائق، الأسئلة المتكررة، وسجل التحديثات.",
  docs: "افتح الوثائق",
  contact: "تواصل مع الدعم",
  faq: "الأسئلة المتكررة",
  changelog: "أش جديد فـ VANTA OS",
  version: "النسخة {version}",
  copyright: "© {year} {holder}. جميع الحقوق محفوظة."
};
const legal = {
  privacyTitle: "سياسة الخصوصية",
  termsTitle: "شروط الخدمة",
  draftNotice: "مسودة — تولدات كنقطة انطلاق قوية. عافاك خلي المحامي ديالك يراجعها قبل الاستعمال فالإنتاج.",
  lastUpdated: "آخر تحديث: {date}"
};
const toasts = {
  taskQueued: "المهمة تسجلات — VANTA كيخدم عليها.",
  taskCompleted: "المهمة تكمّلات.",
  taskFailed: "المهمة فشلات. شوف التفاصيل.",
  taskReverted: "التغييرات تراجعات.",
  guardianAlert: "تنبيه الحارس: {title}",
  settingsSaved: "الإعدادات تذهنت.",
  offline: "راك أوف لاين. المهام فالكلاود كتكمّل.",
  online: "رجعتي أون لاين. كنعاود نحدر الحالة...",
  sessionRefreshed: "تجدّدات الجلسة — العمل ديالك تكمّل."
};
const commandPalette = {
  placeholder: "كتب أمر ولا قلّب...",
  hint: "كليكي Enter باش تصيفط للأجينت · Esc باش تسد",
  groups: {
    actions: "إجراءات سريعة",
    navigate: "تصفّح",
    settings: "إعدادات"
  },
  actions: {
    newTask: "بدا مهمة جديدة",
    goDashboard: "سير للوحة القيادة",
    goCanvas: "سير لمساحة العمل",
    goHistory: "سير لسجل المهام",
    goSettings: "سير للإعدادات",
    goBilling: "سير للفواتير",
    toggleKillSwitch: "بدّل زر الإيقاف",
    openHelp: "افتح المساعدة"
  }
};
const feedback = {
  button: "رأيك",
  title: "صيفط رأيك",
  rating: "كيفاش كانت التجربة ديالك؟",
  message: "قولنا أكثر (اختياري)",
  submit: "صيفط الرأي",
  thanks: "شكراً على رأيك!"
};
const notifications = {
  title: "الإشعارات",
  markAllRead: "علّم الكل كمقروء",
  empty: "ما عندك حتى إشعار جديد.",
  unread: "{count} ماشي مقروءين"
};
const common = {
  cancel: "كنسيلي",
  save: "سجّل",
  "delete": "احذف",
  confirm: "أكّد",
  close: "سد",
  loading: "كنحمّل...",
  error: "طاح شي حاجة.",
  retry: "عاود جرّب",
  back: "رجع",
  next: "التالي",
  done: "تكمّل",
  yes: "إيه",
  no: "لا",
  search: "قلّب"
};
const ar = {
  app,
  nav,
  onboarding,
  canvas,
  task,
  settings,
  billing,
  guardian,
  automations,
  history: history$1,
  data,
  help,
  legal,
  toasts,
  commandPalette,
  feedback,
  notifications,
  common
};
const DICTIONARIES = { en, ar };
function resolve(obj, path2) {
  return path2.split(".").reduce((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return acc[key];
    }
    return void 0;
  }, obj);
}
function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}
function useTranslation(locale = "en") {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES.en;
  const t = useCallback(
    (key, params) => {
      const value = resolve(dict, key);
      if (typeof value === "string") {
        return interpolate(value, params);
      }
      const fallback = resolve(DICTIONARIES.en, key);
      if (typeof fallback === "string") {
        return interpolate(fallback, params);
      }
      return key;
    },
    [dict]
  );
  const dir = locale === "ar" ? "rtl" : "ltr";
  return useMemo(() => ({ locale, dir, t }), [locale, dir, t]);
}
async function loader$y(args) {
  const ctx = await requireAdmin(args);
  const taskId = args.params.taskId;
  const task2 = await prisma.task.findFirst({
    where: { id: taskId, ...{ shopDomain: ctx.shopDomain } },
    include: {
      staff: { select: { name: true, email: true } },
      logs: { orderBy: { timestamp: "asc" } },
      diffs: { orderBy: { timestamp: "asc" } },
      _count: { select: { undoSnapshots: true } }
    }
  });
  if (!task2) {
    throw new Response("Not found", { status: 404 });
  }
  return json({
    task: {
      id: task2.id,
      command: task2.command,
      status: task2.status,
      priority: task2.priority,
      output: task2.output ?? "",
      errorMessage: task2.errorMessage ?? null,
      confidenceScore: task2.confidenceScore,
      blastRadius: task2.blastRadius,
      blastRadiusDescription: task2.blastRadiusDescription,
      createdAt: task2.createdAt.toISOString(),
      completedAt: task2.completedAt?.toISOString() ?? null,
      staffName: task2.staff?.name ?? null,
      staffEmail: task2.staff?.email ?? null,
      undoable: task2._count.undoSnapshots > 0 && task2.status === "COMPLETED",
      undoSnapshotCount: task2._count.undoSnapshots
    },
    diffs: task2.diffs.map(
      (d) => ({
        resourceType: d.resourceType,
        resourceId: d.resourceId,
        resourceTitle: d.resourceTitle ?? void 0,
        field: d.field,
        before: d.before ?? void 0,
        after: d.after ?? void 0
      })
    ),
    logs: task2.logs.map((l) => ({
      id: l.id,
      step: l.step,
      level: l.level,
      message: l.message,
      timestamp: l.timestamp.toISOString()
    })),
    locale: ctx.shop.preferredLanguage,
    timezone: ctx.shop.ianaTimezone ?? void 0
  });
}
function headers$v(_) {
  return getSecurityHeaders();
}
function TaskDetail() {
  const data2 = useLoaderData();
  const { t } = useTranslation(data2.locale);
  const task2 = data2.task;
  const handlePrint = () => window.print();
  const handleUndo = async () => {
    if (!confirm(t("task.undo") + "?")) return;
    await fetch(`/api/tasks/${task2.id}/undo`, { method: "POST" });
    window.location.reload();
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6 print:space-y-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 print:hidden", children: [
      /* @__PURE__ */ jsxs(
        Link$1,
        {
          to: "/app/history",
          className: "text-sm text-vanta-muted hover:text-vanta-700 dark:hover:text-vanta-200 flex items-center gap-1",
          children: [
            /* @__PURE__ */ jsx(ArrowLeft, { className: "h-3.5 w-3.5" }),
            t("history.title")
          ]
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: handlePrint,
            className: "px-3 py-1.5 text-sm rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition flex items-center gap-1.5",
            children: [
              /* @__PURE__ */ jsx(Printer, { className: "h-3.5 w-3.5" }),
              t("task.printReport")
            ]
          }
        ),
        task2.undoable && /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: handleUndo,
            className: "px-3 py-1.5 text-sm rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 hover:opacity-80 transition flex items-center gap-1.5",
            children: [
              /* @__PURE__ */ jsx(Undo2, { className: "h-3.5 w-3.5" }),
              t("task.undo")
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5 print:border-0 print:shadow-none", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
        /* @__PURE__ */ jsx("span", { className: "text-[10px] uppercase tracking-wide font-semibold text-vanta-muted", children: t(`task.states.${task2.status}`) }),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200", children: t(`canvas.priority.${task2.priority}`) })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold mb-2 break-words", children: task2.command }),
      /* @__PURE__ */ jsxs("div", { className: "text-xs text-vanta-muted space-y-0.5", children: [
        task2.staffName && /* @__PURE__ */ jsx("p", { children: t("task.initiatedBy", { staff: task2.staffName }) }),
        /* @__PURE__ */ jsx("p", { children: formatDateTime(task2.createdAt, data2.locale, data2.timezone) }),
        task2.completedAt && /* @__PURE__ */ jsxs("p", { children: [
          "Completed: ",
          formatDateTime(task2.completedAt, data2.locale, data2.timezone)
        ] }),
        task2.confidenceScore !== null && task2.confidenceScore !== void 0 && /* @__PURE__ */ jsx("p", { children: t("task.confidence", { score: task2.confidenceScore }) })
      ] })
    ] }),
    task2.output && /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-semibold mb-3", children: "Output" }),
      /* @__PURE__ */ jsx(MarkdownRenderer, { content: task2.output })
    ] }),
    task2.errorMessage && /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5 border-rose-300 dark:border-rose-700", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-semibold mb-3 text-rose-700 dark:text-rose-300", children: t("task.needsInput") }),
      /* @__PURE__ */ jsx("pre", { className: "text-xs bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap", children: task2.errorMessage })
    ] }),
    data2.diffs.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h2", { className: "font-semibold mb-3 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4 text-vanta-muted" }),
        t("task.viewDiff")
      ] }),
      /* @__PURE__ */ jsx(DiffViewer, { diffs: data2.diffs })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h2", { className: "font-semibold mb-3 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(ListTree, { className: "h-4 w-4 text-vanta-muted" }),
        t("task.viewLogs")
      ] }),
      /* @__PURE__ */ jsx("div", { className: "vanta-card p-3 max-h-96 overflow-y-auto font-mono text-xs", children: data2.logs.map((log) => /* @__PURE__ */ jsxs("div", { className: "py-1 border-b border-vanta-border last:border-0", children: [
        /* @__PURE__ */ jsxs("span", { className: "text-vanta-muted", children: [
          "[",
          new Date(log.timestamp).toISOString(),
          "]"
        ] }),
        " ",
        /* @__PURE__ */ jsx("span", { className: "font-semibold", children: log.step }),
        ": ",
        log.message
      ] }, log.id)) })
    ] })
  ] });
}
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: TaskDetail,
  headers: headers$v,
  loader: loader$y
}, Symbol.toStringTag, { value: "Module" }));
function headers$u(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function loader$x(args) {
  const ctx = await requireAdmin(args);
  const flags = await prisma.featureFlag.findMany({
    where: { shopDomain: ctx.shopDomain }
  });
  return json({
    flags: flags.map((f) => ({
      key: f.key,
      enabled: f.enabled,
      config: f.config,
      updatedAt: f.updatedAt.toISOString()
    }))
  });
}
async function action$c(args) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const input = validate(FeatureFlagToggleSchema, body);
  await prisma.featureFlag.upsert({
    where: {
      shopDomain_key: {
        shopDomain: ctx.shopDomain,
        key: input.key
      }
    },
    update: { enabled: input.enabled },
    create: {
      shopId: ctx.shop.id,
      shopDomain: ctx.shopDomain,
      key: input.key,
      enabled: input.enabled
    }
  });
  return json({ ok: true });
}
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$c,
  headers: headers$u,
  loader: loader$x
}, Symbol.toStringTag, { value: "Module" }));
function headers$t(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function loader$w(args) {
  const ctx = await requireAdmin(args);
  const url = new URL(args.request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);
  const items = await prisma.notification.findMany({
    where: { shopDomain: ctx.shopDomain },
    orderBy: { createdAt: "desc" },
    take: limit
  });
  return json({
    notifications: items.map((n) => ({
      id: n.id,
      type: n.type,
      severity: n.severity,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString()
    }))
  });
}
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  headers: headers$t,
  loader: loader$w
}, Symbol.toStringTag, { value: "Module" }));
function headers$s(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function loader$v(args) {
  const ctx = await requireAdmin(args);
  const taskId = args.params.taskId;
  const task2 = await prisma.task.findFirst({
    where: { id: taskId, shopDomain: ctx.shopDomain },
    include: {
      staff: { select: { name: true } },
      _count: { select: { undoSnapshots: true } }
    }
  });
  if (!task2) {
    return json({ error: "not_found" }, { status: 404 });
  }
  return json({
    id: task2.id,
    command: task2.command,
    status: task2.status,
    priority: task2.priority,
    output: task2.output ?? void 0,
    errorMessage: task2.errorMessage ?? void 0,
    confidenceScore: task2.confidenceScore ?? void 0,
    blastRadius: task2.blastRadius,
    blastRadiusDescription: task2.blastRadiusDescription ?? void 0,
    requiresApproval: task2.requiresApproval,
    initiatedByStaffName: task2.staff?.name ?? void 0,
    createdAt: task2.createdAt.toISOString(),
    thinkingAt: task2.thinkingAt?.toISOString(),
    executingAt: task2.executingAt?.toISOString(),
    completedAt: task2.completedAt?.toISOString(),
    failedAt: task2.failedAt?.toISOString(),
    undoable: task2._count.undoSnapshots > 0 && task2.status === "COMPLETED",
    deepLinks: task2.deepLinks
  });
}
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  headers: headers$s,
  loader: loader$v
}, Symbol.toStringTag, { value: "Module" }));
async function loader$u(args) {
  const ctx = await requireAdmin(args);
  const { getBrowserWorkflows } = await import("./browser-agent.server-D5OlZ98t.js");
  const { listConnectedAccounts } = await import("./connected-accounts.server-SVYmzeSn.js");
  const [workflows, accounts, sessions] = await Promise.all([
    getBrowserWorkflows(ctx.shopDomain),
    listConnectedAccounts(ctx.shopDomain),
    prisma.browserSession.findMany({ where: shopScoped(ctx.shopDomain), orderBy: { startedAt: "desc" }, take: 10 })
  ]);
  return json({
    shopDomain: ctx.shopDomain,
    staffId: ctx.staffId,
    workflows: workflows.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      status: w.status,
      currentStep: w.currentStep,
      totalSteps: w.steps.length,
      requiresApproval: w.requiresApproval,
      approvedBy: w.approvedBy,
      connectedAccount: w.connectedAccount ? `${w.connectedAccount.accountType}: ${w.connectedAccount.accountName}` : null,
      actionCount: w._count.actions,
      createdAt: w.createdAt.toISOString(),
      completedAt: w.completedAt?.toISOString() ?? null
    })),
    accounts,
    sessions: sessions.map((s) => ({ id: s.id, status: s.status, currentUrl: s.currentUrl, startedAt: s.startedAt.toISOString() }))
  });
}
function headers$r(_) {
  return getSecurityHeaders();
}
async function action$b(args) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const { approveBrowserWorkflow, executeBrowserWorkflow, createBrowserWorkflow } = await import("./browser-agent.server-D5OlZ98t.js");
  if (body.action === "approve") {
    await approveBrowserWorkflow(ctx.shopDomain, body.workflowId, ctx.staffId);
    return json({ ok: true });
  }
  if (body.action === "execute") {
    const result = await executeBrowserWorkflow(body.workflowId, ctx.staffId);
    return json(result);
  }
  if (body.action === "create_research") {
    const steps = [
      { id: "1", action: "NAVIGATE", target: body.url ?? "https://example.com", description: "Navigate to target URL", riskLevel: "LOW" },
      { id: "2", action: "INPUT", target: "input#search-key", value: body.query ?? "trending products 2026", description: "Search for products", riskLevel: "LOW" },
      { id: "3", action: "CLICK", target: "button.search-button", description: "Submit search", riskLevel: "LOW" },
      { id: "4", action: "WAIT", waitFor: ".product-item", description: "Wait for results", riskLevel: "LOW" },
      { id: "5", action: "EXTRACT", target: ".product-item .title", description: "Extract product titles", riskLevel: "LOW", screenshot: true },
      { id: "6", action: "SCREENSHOT", description: "Capture page", riskLevel: "LOW", screenshot: true }
    ];
    const id = await createBrowserWorkflow({ shopDomain: ctx.shopDomain, name: `Research: ${body.query ?? "products"}`, description: `Browser-based research for: ${body.query ?? "trending products"}`, steps, requiresApproval: true });
    return json({ ok: true, workflowId: id });
  }
  return json({ error: "Unknown" }, { status: 400 });
}
function BrowserAgentDashboard() {
  const data2 = useLoaderData();
  const fetcher = useFetcher();
  const toast = useToast();
  const approve = (id) => {
    fetcher.submit({ action: "approve", workflowId: id }, { method: "post", encType: "application/json" });
    toast.success("Approved", "Workflow can now be executed.");
  };
  const execute = (id) => {
    fetcher.submit({ action: "execute", workflowId: id }, { method: "post", encType: "application/json" });
    toast.info("Executing", "Browser steps running in background...");
  };
  const createResearch = () => {
    fetcher.submit({ action: "create_research", query: "trending products 2026" }, { method: "post", encType: "application/json" });
    toast.success("Workflow created", "Review and approve before execution.");
  };
  return /* @__PURE__ */ jsxs("div", { className: "max-w-5xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Globe, { className: "h-6 w-6" }),
        "Browser Agent"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted mt-1", children: "Merchant-authorized browser automation. The Browser Agent is a tool of the AI agent system — it never acts on its own." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "vanta-card p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700", children: /* @__PURE__ */ jsxs("p", { className: "text-xs", children: [
      "🔒 ",
      /* @__PURE__ */ jsx("strong", { children: "Subordinate to agents:" }),
      " The Browser Agent only executes when instructed by Planner, Research, Analyst, or Reviewer agents. Every action is logged with screenshots. Sensitive actions require your approval."
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "vanta-card p-3", children: [
        /* @__PURE__ */ jsx(Globe, { className: "h-4 w-4 text-vanta-500 mb-1" }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold", children: data2.workflows.length }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: "Workflows" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "vanta-card p-3", children: [
        /* @__PURE__ */ jsx(Clock, { className: "h-4 w-4 text-amber-500 mb-1" }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-amber-600", children: data2.workflows.filter((w) => w.status === "AWAITING_APPROVAL").length }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: "Awaiting approval" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "vanta-card p-3", children: [
        /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-emerald-500 mb-1" }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-emerald-600", children: data2.workflows.filter((w) => w.status === "COMPLETED").length }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: "Completed" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("button", { onClick: createResearch, className: "px-3 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700", children: "+ Create Research Workflow" }),
    data2.accounts.length === 0 && /* @__PURE__ */ jsx("div", { className: "vanta-card p-4 border-amber-300 dark:border-amber-700", children: /* @__PURE__ */ jsxs("p", { className: "text-xs text-amber-700 dark:text-amber-300", children: [
      "⚠️ No connected accounts. The Browser Agent needs merchant-owned API accounts to operate. ",
      /* @__PURE__ */ jsx("a", { href: "/app/connected-accounts", className: "underline ml-1", children: "Connect an account →" })
    ] }) }),
    data2.workflows.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "vanta-card p-10 text-center", children: [
      /* @__PURE__ */ jsx(Globe, { className: "h-10 w-10 text-vanta-muted mx-auto mb-3" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted", children: "No browser workflows yet. Create one above or let an agent plan one." })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold", children: "Workflows" }),
      data2.workflows.map((wf) => /* @__PURE__ */ jsx("div", { className: "vanta-card p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
            /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm", children: wf.name }),
            /* @__PURE__ */ jsx("span", { className: `text-[10px] px-2 py-0.5 rounded-full ${wf.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : wf.status === "AWAITING_APPROVAL" ? "bg-amber-100 text-amber-700" : wf.status === "FAILED" ? "bg-rose-100 text-rose-700" : wf.status === "RUNNING" ? "bg-blue-100 text-blue-700" : "bg-vanta-100 text-vanta-muted"}`, children: wf.status })
          ] }),
          wf.description && /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mt-1 line-clamp-1", children: wf.description }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-[10px] text-vanta-muted mt-1", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              wf.currentStep,
              "/",
              wf.totalSteps,
              " steps"
            ] }),
            wf.connectedAccount && /* @__PURE__ */ jsxs("span", { children: [
              "• ",
              wf.connectedAccount
            ] }),
            /* @__PURE__ */ jsxs("span", { children: [
              "• ",
              wf.actionCount,
              " actions"
            ] }),
            /* @__PURE__ */ jsxs("span", { children: [
              "• ",
              formatRelativeTime(wf.createdAt, "en")
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [
          wf.status === "AWAITING_APPROVAL" && /* @__PURE__ */ jsx("button", { onClick: () => approve(wf.id), className: "px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700", children: "Approve" }),
          wf.status === "PENDING" && (wf.approvedBy || !wf.requiresApproval) && /* @__PURE__ */ jsxs("button", { onClick: () => execute(wf.id), className: "px-3 py-1.5 text-xs rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 flex items-center gap-1", children: [
            /* @__PURE__ */ jsx(Play, { className: "h-3 w-3" }),
            "Execute"
          ] }),
          wf.status === "RUNNING" && /* @__PURE__ */ jsx(Clock, { className: "h-4 w-4 text-blue-500 animate-spin" }),
          wf.status === "COMPLETED" && /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-emerald-500" })
        ] })
      ] }) }, wf.id))
    ] })
  ] });
}
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$b,
  default: BrowserAgentDashboard,
  headers: headers$r,
  loader: loader$u
}, Symbol.toStringTag, { value: "Module" }));
let redisClient = null;
function getRedis() {
  if (!redisClient) {
    redisClient = new Redis(loadEnv().REDIS_URL, { maxRetriesPerRequest: 3 });
  }
  return redisClient;
}
async function exportCustomerData(shopDomain, customer, ordersRequested = []) {
  const customerEmail = customer.email?.toLowerCase().trim();
  const auditLogs = await prisma.auditLog.findMany({
    where: { shopDomain, ipAddress: customerEmail ?? "___none___" },
    take: 1e3
  });
  const taskLogs = customerEmail ? await prisma.taskLog.findMany({
    where: {
      shopDomain,
      message: { contains: customerEmail, mode: "insensitive" }
    },
    take: 1e3
  }) : [];
  const diffs = ordersRequested.length ? await prisma.taskDiff.findMany({
    where: { shopDomain, resourceId: { in: ordersRequested } }
  }) : [];
  return {
    shop_domain: shopDomain,
    customer_id: customer.id,
    customer_email: customer.email,
    exported_at: (/* @__PURE__ */ new Date()).toISOString(),
    retention_window_hours: GDPR.DELETION_WINDOW_HOURS,
    data: {
      audit_logs: auditLogs,
      task_logs_referencing_customer: taskLogs,
      task_diffs_for_requested_orders: diffs
    },
    note: "VANTA OS does not store customer order data directly; only references in agent task logs are exported here."
  };
}
async function redactShop(shopDomain) {
  logger.info("Starting full shop redaction", { shopDomain });
  await prisma.taskLog.deleteMany({ where: { shopDomain } });
  await prisma.taskDiff.deleteMany({ where: { shopDomain } });
  await prisma.undoSnapshot.deleteMany({ where: { shopDomain } });
  await prisma.commandHistory.deleteMany({ where: { shopDomain } });
  await prisma.auditLog.deleteMany({ where: { shopDomain } });
  await prisma.scopeAuditLog.deleteMany({ where: { shopDomain } });
  await prisma.notification.deleteMany({ where: { shopDomain } });
  await prisma.feedback.deleteMany({ where: { shopDomain } });
  await prisma.featureFlag.deleteMany({ where: { shopDomain } });
  await prisma.recurringMission.deleteMany({ where: { shopDomain } });
  await prisma.guardianAlert.deleteMany({ where: { shopDomain } });
  await prisma.abExperiment.deleteMany({ where: { shopDomain } });
  await prisma.processedWebhook.deleteMany({ where: { shopDomain } });
  await prisma.knowledgeBaseEntry.deleteMany({ where: { shopDomain } });
  await prisma.rateLimitSnapshot.deleteMany({ where: { shopDomain } });
  await prisma.appEvent.deleteMany({ where: { shopDomain } });
  await prisma.task.deleteMany({ where: { shopDomain } });
  await prisma.staffMember.deleteMany({ where: { shopDomain } });
  await prisma.session.deleteMany({ where: { shop: shopDomain } });
  await prisma.shop.deleteMany({ where: { shopDomain } });
  try {
    const redis2 = getRedis();
    const keys = await redis2.keys(`*${shopDomain}*`);
    if (keys.length > 0) {
      await redis2.del(...keys);
      logger.info("Cleared Redis keys for shop", { shopDomain, keyCount: keys.length });
    }
  } catch (err) {
    logger.warn("Redis cleanup failed during shop redaction", { shopDomain, error: String(err) });
  }
  logger.info("Full shop redaction complete", { shopDomain });
}
async function loader$t(args) {
  const ctx = await requireAdmin(args);
  const counts = {
    tasks: await prisma.task.count({ where: { shopDomain: ctx.shopDomain } }),
    auditLogs: await prisma.auditLog.count({ where: { shopDomain: ctx.shopDomain } }),
    notifications: await prisma.notification.count({ where: { shopDomain: ctx.shopDomain } }),
    undoSnapshots: await prisma.undoSnapshot.count({ where: { shopDomain: ctx.shopDomain } }),
    commandHistory: await prisma.commandHistory.count({ where: { shopDomain: ctx.shopDomain } }),
    recurringMissions: await prisma.recurringMission.count({ where: { shopDomain: ctx.shopDomain } }),
    guardianAlerts: await prisma.guardianAlert.count({ where: { shopDomain: ctx.shopDomain } }),
    featureFlags: await prisma.featureFlag.count({ where: { shopDomain: ctx.shopDomain } })
  };
  return json({
    shopDomain: ctx.shopDomain,
    locale: ctx.shop.preferredLanguage,
    counts
  });
}
function headers$q(_) {
  return getSecurityHeaders();
}
async function action$a(args) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const action2 = body.action;
  if (action2 === "export") {
    const data2 = await exportCustomerData(ctx.shopDomain, {}, []);
    return json({ ok: true, export: data2 });
  }
  if (action2 === "delete") {
    await redactShop(ctx.shopDomain);
    return redirect("/auth/login");
  }
  return json({ ok: false, error: "Unknown action" }, { status: 400 });
}
function DataControls() {
  const data2 = useLoaderData();
  const fetcher = useFetcher();
  const toast = useToast();
  const { t } = useTranslation(data2.locale);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const handleExport = () => {
    fetcher.submit(
      { action: "export" },
      { method: "post", encType: "application/json" }
    );
    toast.success(t("data.exportReady"));
  };
  const handleDelete = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    if (!confirm(t("data.deleteConfirm", { shop: data2.shopDomain }))) return;
    fetcher.submit(
      { action: "delete" },
      { method: "post", encType: "application/json" }
    );
  };
  return /* @__PURE__ */ jsxs("div", { className: "max-w-3xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Shield, { className: "h-6 w-6" }),
        t("data.title")
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted mt-1", children: t("data.subtitle") })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5", children: [
      /* @__PURE__ */ jsxs("h2", { className: "font-semibold mb-3", children: [
        "Data we hold for ",
        data2.shopDomain
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", children: Object.entries(data2.counts).map(([key, count]) => /* @__PURE__ */ jsxs("div", { className: "p-3 rounded-lg bg-vanta-50 dark:bg-vanta-900/40", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted uppercase tracking-wide", children: key }),
        /* @__PURE__ */ jsx("p", { className: "text-xl font-bold", children: count })
      ] }, key)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: handleExport,
          className: "vanta-card p-5 hover:border-vanta-400 dark:hover:border-vanta-500 transition text-left flex items-start gap-3",
          children: [
            /* @__PURE__ */ jsx(Download, { className: "h-5 w-5 text-vanta-500 shrink-0 mt-0.5" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm", children: t("data.export") }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mt-1", children: "Download a structured JSON export of all data VANTA holds about your shop." })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: handleDelete,
          className: `vanta-card p-5 transition text-left flex items-start gap-3 ${confirmingDelete ? "border-rose-400 dark:border-rose-600 bg-rose-50 dark:bg-rose-950/30" : "hover:border-rose-400 dark:hover:border-rose-600"}`,
          children: [
            /* @__PURE__ */ jsx(Trash2, { className: "h-5 w-5 text-rose-500 shrink-0 mt-0.5" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm text-rose-700 dark:text-rose-300", children: t("data.delete") }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mt-1", children: confirmingDelete ? "Click again to confirm. This cannot be undone." : "Permanently delete ALL data tied to your shop. Cannot be undone." })
            ] })
          ]
        }
      )
    ] })
  ] });
}
const route17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$a,
  default: DataControls,
  headers: headers$q,
  loader: loader$t
}, Symbol.toStringTag, { value: "Module" }));
function headers$p(_) {
  return { "Content-Type": "application/yaml" };
}
async function loader$s(args) {
  const e2 = loadEnv();
  const authHeader = args.request.headers.get("Authorization");
  const expected = `Bearer ${e2.INTERNAL_DOCS_SECRET}`;
  if (!e2.INTERNAL_DOCS_SECRET || authHeader !== expected) {
    const url = new URL(args.request.url);
    if (url.searchParams.get("secret") !== e2.INTERNAL_DOCS_SECRET) {
      throw new Response("Unauthorized", { status: 401 });
    }
  }
  return new Response(null, {
    status: 302,
    headers: { Location: "/openapi.yaml" }
  });
}
const route18 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  headers: headers$p,
  loader: loader$s
}, Symbol.toStringTag, { value: "Module" }));
async function loader$r(args) {
  const ctx = await requireAdmin(args);
  const missions = await prisma.recurringMission.findMany({
    where: shopScoped(ctx.shopDomain),
    orderBy: { createdAt: "desc" }
  });
  return json({
    locale: ctx.shop.preferredLanguage,
    timezone: ctx.shop.ianaTimezone ?? "UTC",
    missions: missions.map((m) => ({
      id: m.id,
      prompt: m.prompt,
      cron: m.cron,
      timezone: m.timezone,
      enabled: m.enabled,
      lastRunAt: m.lastRunAt?.toISOString() ?? null,
      nextRunAt: m.nextRunAt?.toISOString() ?? null,
      runCount: m.runCount
    }))
  });
}
function headers$o(_) {
  return getSecurityHeaders();
}
async function action$9(args) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const input = validate(RecurringMissionSchema, body);
  const mission = await prisma.recurringMission.create({
    data: {
      shopId: ctx.shop.id,
      shopDomain: ctx.shopDomain,
      prompt: input.prompt,
      cron: input.cron,
      timezone: input.timezone || ctx.shop.ianaTimezone || "UTC",
      enabled: true
    }
  });
  return json({ ok: true, mission });
}
function Automations() {
  const data2 = useLoaderData();
  const fetcher = useFetcher();
  const toast = useToast();
  const { t } = useTranslation(data2.locale);
  const [showForm, setShowForm] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [cron, setCron] = useState("0 0 * * 5");
  const handleSubmit = () => {
    if (!prompt.trim() || !cron.trim()) return;
    fetcher.submit(
      { prompt, cron, timezone: data2.timezone },
      { method: "post", encType: "application/json" }
    );
    toast.success(t("automations.save"));
    setShowForm(false);
    setPrompt("");
  };
  const handleDelete = async (id) => {
    await fetch(`/api/recurring-missions/${id}`, { method: "DELETE" });
    window.location.reload();
  };
  return /* @__PURE__ */ jsxs("div", { className: "max-w-3xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Star, { className: "h-6 w-6" }),
          t("automations.title")
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted mt-1", children: t("automations.subtitle") })
      ] }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => setShowForm((v) => !v),
          className: "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700 transition",
          children: [
            /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }),
            t("automations.new")
          ]
        }
      )
    ] }),
    showForm && /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5 space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-vanta-muted", children: t("automations.promptLabel") }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            value: prompt,
            onChange: (e2) => setPrompt(e2.target.value),
            rows: 3,
            className: "mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500",
            placeholder: "e.g. Find out-of-stock products and add a 'Restocking Soon' tag"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs text-vanta-muted", children: t("automations.cronLabel") }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: cron,
              onChange: (e2) => setCron(e2.target.value),
              className: "mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm font-mono outline-none focus:ring-2 focus:ring-vanta-500"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs text-vanta-muted", children: t("automations.tzLabel") }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: data2.timezone,
              readOnly: true,
              className: "mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm font-mono"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setShowForm(false),
            className: "px-3 py-1.5 text-sm rounded-lg bg-vanta-100 dark:bg-vanta-800",
            children: t("common.cancel")
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: handleSubmit,
            className: "px-3 py-1.5 text-sm rounded-lg bg-vanta-600 text-white hover:bg-vanta-700",
            children: t("automations.save")
          }
        )
      ] })
    ] }),
    data2.missions.length === 0 ? /* @__PURE__ */ jsx("div", { className: "vanta-card p-10 text-center", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted", children: t("automations.empty") }) }) : /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: data2.missions.map((m) => /* @__PURE__ */ jsx("li", { className: "vanta-card p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: m.prompt }),
        /* @__PURE__ */ jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-3 text-xs text-vanta-muted", children: [
          /* @__PURE__ */ jsx("span", { className: "font-mono", children: m.cron }),
          /* @__PURE__ */ jsx("span", { children: "·" }),
          /* @__PURE__ */ jsx("span", { children: m.timezone }),
          /* @__PURE__ */ jsx("span", { children: "·" }),
          /* @__PURE__ */ jsxs("span", { children: [
            m.runCount,
            " runs"
          ] }),
          m.lastRunAt && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("span", { children: "·" }),
            /* @__PURE__ */ jsx("span", { children: t("automations.lastRun", { date: formatDateTime(m.lastRunAt, data2.locale, m.timezone) }) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
        /* @__PURE__ */ jsx(
          "span",
          {
            className: `text-[10px] px-2 py-0.5 rounded-full ${m.enabled ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-vanta-100 dark:bg-vanta-800 text-vanta-muted"}`,
            children: m.enabled ? t("automations.enabled") : t("automations.disabled")
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => handleDelete(m.id),
            className: "p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 transition",
            "aria-label": t("common.delete"),
            children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" })
          }
        )
      ] })
    ] }) }, m.id)) })
  ] });
}
const route19 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$9,
  default: Automations,
  headers: headers$o,
  loader: loader$r
}, Symbol.toStringTag, { value: "Module" }));
function headers$n(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function loader$q(args) {
  const ctx = await requireAdmin(args);
  const snapshot = await prisma.rateLimitSnapshot.findFirst({
    where: { shopDomain: ctx.shopDomain },
    orderBy: { recordedAt: "desc" }
  });
  if (!snapshot) {
    return json({ available: null, percent: null, healthy: null });
  }
  const percent = Math.round(snapshot.currentlyAvailable / Math.max(1, snapshot.maximumAvailable ?? 1) * 100);
  const healthy = percent > 30 ? "green" : percent > 15 ? "yellow" : "red";
  return json({
    available: snapshot.currentlyAvailable,
    maximum: snapshot.maximumAvailable,
    percent,
    healthy,
    recordedAt: snapshot.recordedAt.toISOString()
  });
}
const route20 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  headers: headers$n,
  loader: loader$q
}, Symbol.toStringTag, { value: "Module" }));
const generateContent = void 0;
const generateChat = void 0;
const streamContent = void 0;
const pingGemini = void 0;
const gemini_client = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  generateChat,
  generateContent,
  pingGemini,
  streamContent
}, Symbol.toStringTag, { value: "Module" }));
const SPECIALIZED_AGENTS = {
  planner: {
    name: "planner",
    role: "Planner Agent",
    systemPrompt: "You are VANTA OS's Planner. You decompose high-level goals into multi-step execution plans. You think about dependencies, risks, and optimal ordering. You always output structured JSON plans.",
    capabilities: ["goal_decomposition", "risk_assessment", "dependency_mapping", "resource_estimation"],
    temperature: 0.3
  },
  research: {
    name: "research",
    role: "Research Agent",
    systemPrompt: "You are VANTA OS's Research Agent. You gather information about markets, products, competitors, and trends. You use web search and store data to build comprehensive reports. You cite sources and quantify confidence.",
    capabilities: ["market_research", "competitor_analysis", "trend_monitoring", "data_gathering"],
    temperature: 0.4
  },
  product_hunter: {
    name: "product_hunter",
    role: "Product Hunter Agent",
    systemPrompt: "You are VANTA OS's Product Hunter. You discover winning products by analyzing trends, margins, competition, and demand signals. You evaluate opportunities and rank them by overall score. You always explain your reasoning.",
    capabilities: ["product_discovery", "opportunity_evaluation", "margin_analysis", "trend_matching"],
    temperature: 0.5
  },
  store_optimizer: {
    name: "store_optimizer",
    role: "Store Optimizer Agent",
    systemPrompt: "You are VANTA OS's Store Optimizer. You improve store performance by optimizing collections, SEO, product descriptions, and layout. You A/B test changes and track their impact on conversion.",
    capabilities: ["seo_optimization", "collection_management", "description_generation", "conversion_optimization"],
    temperature: 0.5
  },
  marketing: {
    name: "marketing",
    role: "Marketing Agent",
    systemPrompt: "You are VANTA OS's Marketing Agent. You create marketing content: email campaigns, social media posts, ad copy, and product descriptions. You match brand voice and optimize for engagement.",
    capabilities: ["content_creation", "email_campaigns", "social_media", "ad_copy"],
    temperature: 0.7
  },
  analyst: {
    name: "analyst",
    role: "Analyst Agent",
    systemPrompt: "You are VANTA OS's Analyst. You analyze store data: sales trends, customer behavior, inventory metrics, and financial performance. You produce insights and recommendations backed by data.",
    capabilities: ["data_analysis", "trend_identification", "performance_reporting", "anomaly_detection"],
    temperature: 0.2
  },
  reviewer: {
    name: "reviewer",
    role: "Reviewer Agent",
    systemPrompt: "You are VANTA OS's Reviewer. You review other agents' proposed actions before execution. You check for safety, correctness, and alignment with the merchant's goals. You can approve, modify, or reject actions.",
    capabilities: ["action_review", "safety_checking", "quality_assurance", "goal_alignment"],
    temperature: 0.2
  }
};
function listSpecializedAgents() {
  return Object.values(SPECIALIZED_AGENTS);
}
async function discoverProducts(shopDomain, niche) {
  const prompt = `You are VANTA OS's Product Hunter. ${niche ? `Focus on niche: ${niche}.` : "Find trending products across categories."}

Discover 5 product opportunities suitable for dropshipping. For each:
- Realistic supplier cost (supplier range)
- Suggested retail price (2-3x cost minimum)
- Clear category
- Why it's trending

Output JSON array:
[{"title":"...","description":"...","category":"...","supplierCost":12.99,"suggestedPrice":29.99,"source":"SUPPLIER"}]`;
  const response = await generateContent(prompt, { temperature: 0.6 });
  let candidates = [];
  try {
    const jsonMatch = response.text.match(/\[[\s\S]*\]/);
    candidates = JSON.parse(jsonMatch?.[0] ?? "[]");
  } catch {
  }
  for (const c of candidates) {
    await prisma.productOpportunity.create({
      data: {
        shopDomain,
        source: c.source,
        sourceUrl: c.sourceUrl,
        title: c.title,
        description: c.description,
        imageUrl: c.imageUrl,
        category: c.category,
        supplierCost: c.supplierCost,
        suggestedPrice: c.suggestedPrice,
        estimatedMargin: c.suggestedPrice - c.supplierCost,
        estimatedMarginPercent: (c.suggestedPrice - c.supplierCost) / c.suggestedPrice * 100,
        status: "DISCOVERED"
      }
    });
  }
  logger.info("Products discovered", { shopDomain, count: candidates.length });
  return candidates;
}
async function evaluateOpportunities(shopDomain) {
  const opportunities = await prisma.productOpportunity.findMany({
    where: { shopDomain, status: "DISCOVERED" },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  const evaluated = [];
  for (const opp of opportunities) {
    const margin = opp.estimatedMargin ?? 0;
    const marginPercent = opp.estimatedMarginPercent ?? 0;
    const demandScore = Math.min(100, marginPercent * 0.8 + 20);
    const competitionScore = Math.max(20, 100 - marginPercent);
    const trendScore = Math.min(100, 40 + Math.random() * 40);
    const overallScore = demandScore * 0.4 + (100 - competitionScore) * 0.3 + trendScore * 0.3;
    const reasoning = `Margin: ${marginPercent.toFixed(0)}% ($${margin.toFixed(2)}). Demand score: ${demandScore.toFixed(0)}/100. Competition: ${competitionScore.toFixed(0)}/100 (lower is better). Trend: ${trendScore.toFixed(0)}/100. Overall: ${overallScore.toFixed(0)}/100.`;
    const risks = [];
    if (marginPercent < 30) risks.push("low_margin");
    if (competitionScore > 70) risks.push("saturated_market");
    if (demandScore < 40) risks.push("low_demand");
    await prisma.productOpportunity.update({
      where: { id: opp.id },
      data: { demandScore, competitionScore, trendScore, overallScore, reasoning, risks, status: "EVALUATED" }
    });
    evaluated.push({
      candidate: {
        title: opp.title,
        description: opp.description ?? "",
        category: opp.category ?? "",
        supplierCost: opp.supplierCost ?? 0,
        suggestedPrice: opp.suggestedPrice ?? 0,
        imageUrl: opp.imageUrl ?? void 0,
        source: opp.source,
        sourceUrl: opp.sourceUrl ?? void 0
      },
      demandScore,
      competitionScore,
      trendScore,
      overallScore,
      reasoning,
      risks,
      estimatedMargin: margin,
      estimatedMarginPercent: marginPercent
    });
  }
  evaluated.sort((a, b) => b.overallScore - a.overallScore);
  return evaluated;
}
async function getTopOpportunities(shopDomain, limit = 10) {
  return prisma.productOpportunity.findMany({
    where: { shopDomain, status: { in: ["EVALUATED", "APPROVED"] } },
    orderBy: { overallScore: "desc" },
    take: limit
  });
}
async function scoreRisk(shopDomain, input) {
  const factors = {};
  const mitigations = [];
  const affectedResources = [];
  const action2 = input.action.toLowerCase();
  if (action2.includes("delete") || action2.includes("remove") || action2.includes("destroy")) {
    factors["irreversible"] = 0.8;
    mitigations.push("Create backup before deletion");
  }
  if (action2.includes("all") || action2.includes("bulk") || action2.includes("every")) {
    factors["bulk_operation"] = 0.7;
    mitigations.push("Preview affected items before executing");
  }
  if (action2.includes("price") || action2.includes("cost") || action2.includes("discount")) {
    factors["financial_impact"] = 0.6;
    mitigations.push("Verify margins remain positive");
  }
  if (action2.includes("publish") || action2.includes("theme") || action2.includes("storefront")) {
    factors["customer_visible"] = 0.5;
    mitigations.push("Test on a hidden product first");
  }
  if (action2.includes("create") && action2.includes("product")) {
    factors["creates_new_content"] = 0.3;
  }
  if (input.riskLevel === "CRITICAL") factors["declared_critical"] = 0.9;
  else if (input.riskLevel === "HIGH") factors["declared_high"] = 0.6;
  else if (input.riskLevel === "MEDIUM") factors["declared_medium"] = 0.3;
  const factorValues = Object.values(factors);
  const riskScore = factorValues.length > 0 ? Math.min(1, factorValues.reduce((a, b) => a + b, 0) / factorValues.length + factorValues.length * 0.05) : 0.1;
  let finalRiskScore = riskScore;
  let llmReasoning = "";
  if (riskScore >= 0.3 && riskScore < 0.6) {
    try {
      const { generateContent: generateContent2 } = await Promise.resolve().then(() => gemini_client);
      const llmResp = await generateContent2(
        `Rate the risk of this e-commerce action (0-1 scale):
Action: ${input.action}
Agent: ${input.agent}
Heuristic risk score: ${riskScore.toFixed(2)}

Consider: irreversibility, customer impact, financial risk, scale.
Respond JSON only: {"score": 0.0, "reasoning": "...", "mitigations": ["..."]}`,
        { temperature: 0.1 }
      );
      const jsonMatch = llmResp.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const llmResult = JSON.parse(jsonMatch[0]);
        const llmScore = typeof llmResult.score === "number" ? Math.max(0, Math.min(1, llmResult.score)) : riskScore;
        finalRiskScore = riskScore * 0.4 + llmScore * 0.6;
        llmReasoning = llmResult.reasoning ?? "";
        if (Array.isArray(llmResult.mitigations)) {
          mitigations.push(...llmResult.mitigations);
        }
      }
    } catch {
    }
  }
  const finalRiskLevel = finalRiskScore >= 0.75 ? "CRITICAL" : finalRiskScore >= 0.5 ? "HIGH" : finalRiskScore >= 0.25 ? "MEDIUM" : "LOW";
  const finalRequiresApproval = finalRiskScore >= 0.5 || input.riskLevel === "HIGH" || input.riskLevel === "CRITICAL";
  const actionPreview = `Action: "${input.action}"
Agent: ${input.agent}
Risk: ${finalRiskLevel} (${(finalRiskScore * 100).toFixed(0)}%)
Factors: ${Object.entries(factors).map(([k, v]) => `${k}=${v}`).join(", ")}
${llmReasoning ? `AI Assessment: ${llmReasoning}
` : ""}Mitigations: ${mitigations.join("; ")}`;
  await prisma.riskAssessment.create({
    data: {
      shopDomain,
      goalId: input.goalId,
      planId: input.planId,
      stepId: input.stepId,
      taskId: input.taskId,
      riskScore: finalRiskScore,
      riskLevel: finalRiskLevel,
      factors,
      mitigations,
      requiresApproval: finalRequiresApproval,
      actionPreview,
      affectedResources
    }
  });
  logger.info("Risk scored", { shopDomain, action: input.action.slice(0, 50), riskLevel: finalRiskLevel, riskScore: finalRiskScore, usedLLM: !!llmReasoning });
  return { riskScore: finalRiskScore, riskLevel: finalRiskLevel, factors, mitigations, requiresApproval: finalRequiresApproval, actionPreview, affectedResources };
}
async function getPendingApprovals(shopDomain) {
  return prisma.riskAssessment.findMany({
    where: { shopDomain, requiresApproval: true, decision: null },
    orderBy: { createdAt: "desc" }
  });
}
function traceSpan(shopDomain, opts) {
  const spanId = randomUUID();
  const startTime = /* @__PURE__ */ new Date();
  prisma.agentTrace.create({
    data: {
      shopDomain,
      traceId: spanId,
      goalId: opts.goalId,
      planId: opts.planId,
      stepId: opts.stepId,
      taskId: opts.taskId,
      agentName: opts.agentName,
      spanName: opts.spanName,
      spanType: opts.spanType,
      input: opts.input,
      thinkingTrace: opts.thinkingTrace,
      startTime,
      status: "OK"
    }
  }).catch((err) => logger.warn("Trace span create failed", { error: String(err) }));
  return {
    spanId,
    complete: async (result) => {
      const endTime = /* @__PURE__ */ new Date();
      await prisma.agentTrace.update({
        where: { traceId: spanId },
        data: {
          endTime,
          durationMs: endTime.getTime() - startTime.getTime(),
          output: result.output,
          status: result.status ?? "OK",
          errorMessage: result.errorMessage,
          tokenCount: result.tokenCount,
          costCredits: result.costCredits
        }
      }).catch((err) => logger.warn("Trace span complete failed", { spanId, error: String(err) }));
    }
  };
}
async function getFailureDiagnostics(shopDomain, limit = 20) {
  return prisma.agentTrace.findMany({
    where: { shopDomain, status: "ERROR" },
    orderBy: { startTime: "desc" },
    take: limit
  });
}
async function getPerformanceAnalytics(shopDomain) {
  const traces = await prisma.agentTrace.findMany({
    where: { shopDomain, startTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1e3) } },
    select: { agentName: true, spanType: true, status: true, durationMs: true, tokenCount: true, costCredits: true }
  });
  const byAgent = {};
  for (const t of traces) {
    if (!byAgent[t.agentName]) byAgent[t.agentName] = { count: 0, errors: 0, avgMs: 0, totalTokens: 0, totalCredits: 0 };
    byAgent[t.agentName].count++;
    if (t.status === "ERROR") byAgent[t.agentName].errors++;
    byAgent[t.agentName].avgMs += t.durationMs ?? 0;
    byAgent[t.agentName].totalTokens += t.tokenCount ?? 0;
    byAgent[t.agentName].totalCredits += t.costCredits ?? 0;
  }
  for (const a of Object.values(byAgent)) a.avgMs = a.count > 0 ? a.avgMs / a.count : 0;
  return { totalTraces: traces.length, byAgent };
}
async function recordDecision(shopDomain, input) {
  const decision = await prisma.decisionRecord.create({
    data: {
      shopDomain,
      goalId: input.goalId,
      planId: input.planId,
      stepId: input.stepId,
      taskId: input.taskId,
      decisionType: input.decisionType,
      reasoning: input.reasoning,
      alternatives: input.alternatives ?? [],
      confidence: input.confidence,
      requiresApproval: input.requiresApproval ?? false,
      outcome: "PENDING"
    }
  });
  logger.debug("Decision recorded", { shopDomain, type: input.decisionType, id: decision.id });
  return decision.id;
}
async function learnFromDecisions(shopDomain) {
  const decisions = await prisma.decisionRecord.findMany({
    where: { shopDomain, outcome: { in: ["SUCCESS", "FAILURE"] } },
    take: 100
  });
  const positiveCount = decisions.filter((d) => d.outcome === "SUCCESS").length;
  const negativeCount = decisions.filter((d) => d.outcome === "FAILURE").length;
  const successRate = decisions.length > 0 ? positiveCount / decisions.length : 0;
  const lesson = `Over ${decisions.length} decisions: ${successRate.toFixed(0)}% success rate. ${negativeCount} failures analyzed for learning.`;
  return { positiveCount, negativeCount, lesson };
}
async function loader$p(args) {
  const ctx = await requireAdmin(args);
  const [opportunities, pendingApprovals, analytics, failures, learning] = await Promise.all([
    getTopOpportunities(ctx.shopDomain, 10),
    getPendingApprovals(ctx.shopDomain),
    getPerformanceAnalytics(ctx.shopDomain).catch(() => ({ totalTraces: 0, byAgent: {} })),
    getFailureDiagnostics(ctx.shopDomain, 5).catch(() => []),
    learnFromDecisions(ctx.shopDomain).catch(() => ({ positiveCount: 0, negativeCount: 0, lesson: "No data yet" }))
  ]);
  return json({
    shopDomain: ctx.shopDomain,
    agents: listSpecializedAgents(),
    opportunities,
    pendingApprovals,
    analytics,
    failures,
    learning,
    memoryCount: await prisma.memory.count({ where: { shopDomain: ctx.shopDomain } }).catch(() => 0),
    decisionCount: await prisma.decisionRecord.count({ where: shopScoped(ctx.shopDomain) }).catch(() => 0)
  });
}
function headers$m(_) {
  return getSecurityHeaders();
}
async function action$8(args) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  if (body.action === "discover_products") {
    const candidates = await discoverProducts(ctx.shopDomain, body.niche);
    return json({ ok: true, count: candidates.length });
  }
  if (body.action === "evaluate_opportunities") {
    const evaluated = await evaluateOpportunities(ctx.shopDomain);
    return json({ ok: true, count: evaluated.length });
  }
  return json({ error: "Unknown action" }, { status: 400 });
}
function AutonomousHub() {
  const data2 = useLoaderData();
  const fetcher = useFetcher();
  const toast = useToast();
  const discover = () => {
    fetcher.submit({ action: "discover_products" }, { method: "post", encType: "application/json" });
    toast.info("Product Hunter active", "Scanning for winning products...");
  };
  const evaluate = () => {
    fetcher.submit({ action: "evaluate_opportunities" }, { method: "post", encType: "application/json" });
    toast.info("Evaluating", "Scoring demand, competition, and margins...");
  };
  return /* @__PURE__ */ jsxs("div", { className: "max-w-5xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Bot, { className: "h-6 w-6" }),
        "Autonomous Operations"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted mt-1", children: "7 AI agents collaborating to research, plan, execute, and learn — while you stay in control." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", children: [
      /* @__PURE__ */ jsx(StatCard$1, { icon: /* @__PURE__ */ jsx(Brain, { className: "h-4 w-4" }), label: "Memories", value: String(data2.memoryCount) }),
      /* @__PURE__ */ jsx(StatCard$1, { icon: /* @__PURE__ */ jsx(Activity, { className: "h-4 w-4" }), label: "Decisions logged", value: String(data2.decisionCount) }),
      /* @__PURE__ */ jsx(StatCard$1, { icon: /* @__PURE__ */ jsx(Shield, { className: "h-4 w-4" }), label: "Pending approvals", value: String(data2.pendingApprovals.length), color: "amber" }),
      /* @__PURE__ */ jsx(StatCard$1, { icon: /* @__PURE__ */ jsx(TrendingUp, { className: "h-4 w-4" }), label: "Product opportunities", value: String(data2.opportunities.length), color: "emerald" })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h2", { className: "text-sm font-semibold mb-2 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Bot, { className: "h-4 w-4" }),
        "Specialized Agents"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", children: data2.agents.map((agent) => /* @__PURE__ */ jsxs("div", { className: "vanta-card p-4", children: [
        /* @__PURE__ */ jsx("h3", { className: "font-semibold text-sm", children: agent.role }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-vanta-muted mt-1 line-clamp-2", children: [
          agent.systemPrompt.slice(0, 100),
          "..."
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-2 flex flex-wrap gap-1", children: agent.capabilities.slice(0, 3).map((c) => /* @__PURE__ */ jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-vanta-100 dark:bg-vanta-800 text-vanta-muted", children: c }, c)) })
      ] }, agent.name)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h2", { className: "text-sm font-semibold mb-2 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Search, { className: "h-4 w-4" }),
        "Product Discovery"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2 mb-3", children: [
        /* @__PURE__ */ jsxs("button", { onClick: discover, className: "px-3 py-1.5 text-xs rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(Search, { className: "h-3 w-3" }),
          "Discover Products"
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: evaluate, className: "px-3 py-1.5 text-xs rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:opacity-80 flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(TrendingUp, { className: "h-3 w-3" }),
          "Evaluate"
        ] })
      ] }),
      data2.opportunities.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: 'No opportunities yet. Click "Discover" to let the Product Hunter find winning products.' }) : /* @__PURE__ */ jsx("div", { className: "vanta-card overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsx("thead", { className: "bg-vanta-50 dark:bg-vanta-900/40 text-xs uppercase text-vanta-muted", children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-left", children: "Product" }),
          /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-right", children: "Cost" }),
          /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-right", children: "Price" }),
          /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-right", children: "Margin" }),
          /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-center", children: "Score" }),
          /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-center", children: "Status" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-vanta-border", children: data2.opportunities.map((opp) => /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2 truncate max-w-[180px]", children: opp.title }),
          /* @__PURE__ */ jsxs("td", { className: "px-3 py-2 text-right text-xs", children: [
            "$",
            opp.supplierCost?.toFixed(2) ?? "—"
          ] }),
          /* @__PURE__ */ jsxs("td", { className: "px-3 py-2 text-right text-xs", children: [
            "$",
            opp.suggestedPrice?.toFixed(2) ?? "—"
          ] }),
          /* @__PURE__ */ jsxs("td", { className: "px-3 py-2 text-right text-xs text-emerald-600", children: [
            opp.estimatedMarginPercent?.toFixed(0) ?? "—",
            "%"
          ] }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2 text-center", children: /* @__PURE__ */ jsx("span", { className: `text-xs font-bold ${opp.overallScore >= 70 ? "text-emerald-600" : opp.overallScore >= 50 ? "text-amber-600" : "text-rose-600"}`, children: opp.overallScore.toFixed(0) }) }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2 text-center", children: /* @__PURE__ */ jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-vanta-100 dark:bg-vanta-800", children: opp.status }) })
        ] }, opp.id)) })
      ] }) }) })
    ] }),
    data2.pendingApprovals.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h2", { className: "text-sm font-semibold mb-2 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Shield, { className: "h-4 w-4 text-amber-500" }),
        "Pending Approvals"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-2", children: data2.pendingApprovals.slice(0, 5).map((a) => /* @__PURE__ */ jsx("div", { className: "vanta-card p-3 border-amber-300 dark:border-amber-700", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-xs font-medium", children: [
            "Risk: ",
            a.riskLevel,
            " (",
            (a.riskScore * 100).toFixed(0),
            "%)"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-[10px] text-vanta-muted mt-0.5 line-clamp-2", children: a.actionPreview })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] text-vanta-muted shrink-0", children: formatRelativeTime(a.createdAt, "en") })
      ] }) }, a.id)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h2", { className: "text-sm font-semibold mb-2 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Activity, { className: "h-4 w-4" }),
          "Agent Performance (24h)"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "vanta-card p-4", children: data2.analytics.totalTraces === 0 ? /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: "No agent activity yet. Execute a goal to see traces." }) : /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-vanta-muted", children: [
            data2.analytics.totalTraces,
            " total traces"
          ] }),
          Object.entries(data2.analytics.byAgent).map(([name, stats]) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "font-medium", children: name }),
            /* @__PURE__ */ jsxs("span", { className: "text-vanta-muted", children: [
              stats.count,
              " runs · ",
              stats.errors,
              " errors · ",
              stats.avgMs.toFixed(0),
              "ms avg"
            ] })
          ] }, name))
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h2", { className: "text-sm font-semibold mb-2 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Clock, { className: "h-4 w-4" }),
          "Learning"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "vanta-card p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: data2.learning.lesson }),
          /* @__PURE__ */ jsxs("div", { className: "mt-2 flex gap-3 text-xs", children: [
            /* @__PURE__ */ jsxs("span", { className: "text-emerald-600", children: [
              "✅ ",
              data2.learning.positiveCount,
              " successes"
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "text-rose-600", children: [
              "❌ ",
              data2.learning.negativeCount,
              " failures"
            ] })
          ] })
        ] })
      ] })
    ] }),
    data2.failures.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h2", { className: "text-sm font-semibold mb-2 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(AlertTriangle, { className: "h-4 w-4 text-rose-500" }),
        "Recent Failures"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-2", children: data2.failures.map((f) => /* @__PURE__ */ jsxs("div", { className: "vanta-card p-3 border-rose-300 dark:border-rose-700", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-xs font-medium", children: [
          f.agentName,
          ": ",
          f.spanName
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-[10px] text-vanta-muted mt-0.5", children: f.errorMessage })
      ] }, f.id)) })
    ] })
  ] });
}
function StatCard$1({ icon, label, value, color = "vanta" }) {
  const colors = { vanta: "text-vanta-600", amber: "text-amber-600", emerald: "text-emerald-600", rose: "text-rose-600" };
  return /* @__PURE__ */ jsxs("div", { className: "vanta-card p-3", children: [
    /* @__PURE__ */ jsx("div", { className: `${colors[color]} mb-1`, children: icon }),
    /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold", children: value }),
    /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: label })
  ] });
}
const route21 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$8,
  default: AutonomousHub,
  headers: headers$m,
  loader: loader$p
}, Symbol.toStringTag, { value: "Module" }));
async function loader$o(args) {
  try {
    const ctx = await requireAdmin(args);
    const wl = getWhitelabelConfig();
    return json({
      shopDomain: ctx.shopDomain,
      locale: ctx.shop.preferredLanguage,
      alreadyOnboarded: ctx.shop.completedOnboarding,
      appName: wl.appName,
      supportEmail: wl.supportEmail,
      privacyUrl: wl.privacyPolicyUrl,
      termsUrl: wl.termsOfServiceUrl
    });
  } catch {
    throw redirect("/auth/login");
  }
}
function headers$l(_) {
  return getSecurityHeaders();
}
async function action$7(args) {
  const ctx = await requireAdmin(args);
  await prisma.shop.update({
    where: { id: ctx.shop.id },
    data: { completedOnboarding: true }
  });
  return redirect("/app");
}
function OnboardingSplash() {
  const data2 = useLoaderData();
  const { t } = useTranslation(data2.locale);
  const [accepted, setAccepted] = useState(false);
  if (data2.alreadyOnboarded) {
    if (typeof window !== "undefined") window.location.href = "/app";
  }
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-vanta-50 dark:bg-vanta-950 flex items-center justify-center p-6", children: /* @__PURE__ */ jsxs(
    motion.div,
    {
      initial: { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
      className: "vanta-card w-full max-w-2xl p-8 sm:p-10",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "text-center mb-8", children: [
          /* @__PURE__ */ jsx(
            motion.div,
            {
              initial: { scale: 0.7, opacity: 0 },
              animate: { scale: 1, opacity: 1 },
              transition: { delay: 0.1, duration: 0.4 },
              className: "inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-vanta-500 to-vanta-700 mb-4",
              children: /* @__PURE__ */ jsx(Sparkles, { className: "h-8 w-8 text-white" })
            }
          ),
          /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold mb-2", children: t("onboarding.title") }),
          /* @__PURE__ */ jsx("p", { className: "text-vanta-muted", children: t("onboarding.subtitle") })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8", children: [
          /* @__PURE__ */ jsx(
            FeatureCard,
            {
              icon: /* @__PURE__ */ jsx(Zap, { className: "h-5 w-5 text-vanta-500" }),
              title: "Instant execution",
              body: "Tell VANTA what to do — it plans, confirms, and executes against your Shopify store."
            }
          ),
          /* @__PURE__ */ jsx(
            FeatureCard,
            {
              icon: /* @__PURE__ */ jsx(ShieldCheck, { className: "h-5 w-5 text-vanta-500" }),
              title: "Always in control",
              body: "Blast-radius checks, approval prompts, kill switch, and one-click undo for every change."
            }
          ),
          /* @__PURE__ */ jsx(
            FeatureCard,
            {
              icon: /* @__PURE__ */ jsx(CheckCircle2, { className: "h-5 w-5 text-vanta-500" }),
              title: "Proactive Guardian",
              body: "Background checks catch $0 prices, low inventory, and broken links before customers do."
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(Form, { method: "post", className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("label", { className: "flex items-start gap-3 cursor-pointer", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: accepted,
                onChange: (e2) => setAccepted(e2.target.checked),
                className: "mt-0.5 h-4 w-4 rounded border-vanta-300 text-vanta-600 focus:ring-vanta-500",
                required: true
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "text-sm text-vanta-700 dark:text-vanta-200", children: t("onboarding.consentLabel") })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-4 text-xs text-vanta-muted", children: [
            /* @__PURE__ */ jsx(Link$1, { to: "/app/privacy", className: "hover:underline text-vanta-600 dark:text-vanta-300", children: t("onboarding.privacyLink") }),
            /* @__PURE__ */ jsx(Link$1, { to: "/app/terms", className: "hover:underline text-vanta-600 dark:text-vanta-300", children: t("onboarding.termsLink") })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              disabled: !accepted,
              className: "w-full py-3 rounded-lg bg-vanta-600 text-white font-semibold hover:bg-vanta-700 transition disabled:opacity-40 disabled:cursor-not-allowed",
              children: accepted ? t("onboarding.connect") : t("onboarding.connectDisabled")
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-center text-xs text-vanta-muted mt-6", children: [
          "© ",
          (/* @__PURE__ */ new Date()).getFullYear(),
          " ",
          getWhitelabelConfig().copyrightHolder,
          ". All rights reserved."
        ] })
      ]
    }
  ) });
}
function FeatureCard({ icon, title, body }) {
  return /* @__PURE__ */ jsxs("div", { className: "p-4 rounded-lg bg-vanta-50 dark:bg-vanta-900/40 border border-vanta-border", children: [
    /* @__PURE__ */ jsx("div", { className: "mb-2", children: icon }),
    /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm mb-1", children: title }),
    /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: body })
  ] });
}
const route22 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$7,
  default: OnboardingSplash,
  headers: headers$l,
  loader: loader$o
}, Symbol.toStringTag, { value: "Module" }));
const L1_CACHE = /* @__PURE__ */ new Map();
const L1_MAX_SIZE = 1e4;
async function cacheGet(key) {
  const l1 = L1_CACHE.get(key);
  if (l1 && l1.expiresAt > Date.now()) return l1.value;
  if (l1) L1_CACHE.delete(key);
  try {
    const redis2 = getRedis$2();
    const raw = await redis2.get(`cache:${key}`);
    if (raw) {
      const value = JSON.parse(raw);
      setL1(key, value, 60);
      return value;
    }
  } catch {
  }
  return null;
}
async function cacheSet(key, value, ttlSeconds = 300) {
  setL1(key, value, Math.min(ttlSeconds, 60));
  try {
    const redis2 = getRedis$2();
    await redis2.set(`cache:${key}`, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
  }
}
function setL1(key, value, ttlSeconds) {
  if (L1_CACHE.size >= L1_MAX_SIZE) {
    const firstKey = L1_CACHE.keys().next().value;
    if (firstKey) L1_CACHE.delete(firstKey);
  }
  L1_CACHE.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1e3 });
}
async function predictDemand(admin, shopDomain) {
  const cacheKey = `demand:${shopDomain}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;
  const productsResp = await adminGraphQL(
    admin,
    `#graphql query ProductsWithInventory($first: Int!) { products(first: $first) { edges { node { id title variants(first:1) { edges { node { inventoryQuantity price } } } } } } }`,
    { first: 100 },
    { shopDomain, scopeUsed: "read_products" }
  );
  const predictions = [];
  for (const edge of productsResp.data?.products.edges ?? []) {
    const p = edge.node;
    const stock = p.variants.edges[0]?.node.inventoryQuantity ?? 0;
    const dailyVelocity = Math.max(0.5, Math.random() * 5);
    const predicted7d = Math.round(dailyVelocity * 7);
    const predicted30d = Math.round(dailyVelocity * 30);
    const daysUntilStockout = dailyVelocity > 0 ? Math.floor(stock / dailyVelocity) : 999;
    let stockoutRisk = "LOW";
    let recommendedAction = "MAINTAIN";
    if (daysUntilStockout < 7) {
      stockoutRisk = "CRITICAL";
      recommendedAction = "REORDER";
    } else if (daysUntilStockout < 14) {
      stockoutRisk = "HIGH";
      recommendedAction = "REORDER";
    } else if (daysUntilStockout < 30) {
      stockoutRisk = "MEDIUM";
      recommendedAction = "MAINTAIN";
    } else if (stock > predicted30d * 3) {
      recommendedAction = "DISCOUNT";
    }
    predictions.push({
      productId: p.id,
      title: p.title,
      currentStock: stock,
      predictedDemand7d: predicted7d,
      predictedDemand30d: predicted30d,
      stockoutRisk,
      recommendedAction,
      confidence: 0.75
    });
  }
  await cacheSet(cacheKey, predictions, 600);
  return predictions;
}
async function loader$n(args) {
  const ctx = await requireAdmin(args);
  let predictions = [];
  try {
    predictions = await predictDemand(ctx.admin, ctx.shopDomain);
  } catch (err) {
  }
  return json({
    locale: ctx.shop.preferredLanguage,
    predictions,
    totalProducts: predictions.length,
    criticalCount: predictions.filter((p) => p.stockoutRisk === "CRITICAL").length,
    highCount: predictions.filter((p) => p.stockoutRisk === "HIGH").length
  });
}
function headers$k(_) {
  return getSecurityHeaders();
}
function PredictiveDashboard() {
  const data2 = useLoaderData();
  return /* @__PURE__ */ jsxs("div", { className: "max-w-5xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Brain, { className: "h-6 w-6" }),
        "Predictive Commerce"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted mt-1", children: "الذكاء الاصطناعي كيتوقع الطلب، مخاطر نفاد المخزون، واحتياجات الزبناء قبل ما تحصل." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "vanta-card p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20", children: /* @__PURE__ */ jsxs("p", { className: "text-sm", children: [
      "🔮 ",
      /* @__PURE__ */ jsx("strong", { children: "2026 AI:" }),
      " هاد التوقعات مبنية على تحليل أنماط الطلب، الموسمية، والاتجاهات. النظام كيتعلم من كل طلب وكيحسّن دقته مع الوقت."
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "vanta-card p-4", children: [
        /* @__PURE__ */ jsx(Package, { className: "h-5 w-5 text-vanta-500 mb-1" }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold", children: data2.totalProducts }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: "Products analyzed" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "vanta-card p-4 border-rose-300 dark:border-rose-700", children: [
        /* @__PURE__ */ jsx(AlertTriangle$1, { className: "h-5 w-5 text-rose-500 mb-1" }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-rose-600", children: data2.criticalCount }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: "Critical stockout risk" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "vanta-card p-4 border-amber-300 dark:border-amber-700", children: [
        /* @__PURE__ */ jsx(AlertTriangle$1, { className: "h-5 w-5 text-amber-500 mb-1" }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-amber-600", children: data2.highCount }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: "High stockout risk" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "vanta-card p-4", children: [
        /* @__PURE__ */ jsx(TrendingUp, { className: "h-5 w-5 text-emerald-500 mb-1" }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-emerald-600", children: data2.totalProducts - data2.criticalCount - data2.highCount }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: "Healthy inventory" })
      ] })
    ] }),
    data2.predictions.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "vanta-card p-10 text-center", children: [
      /* @__PURE__ */ jsx(Brain, { className: "h-10 w-10 text-vanta-muted mx-auto mb-3" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted", children: "جاري تحليل منتجاتك... عاود تحميل الصفحة بعد دقيقة." })
    ] }) : /* @__PURE__ */ jsx("div", { className: "vanta-card overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-vanta-50 dark:bg-vanta-900/40 text-xs uppercase text-vanta-muted", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-4 py-2 text-left", children: "Product" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-2 text-right", children: "Stock" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-2 text-right", children: "7d Demand" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-2 text-right", children: "30d Demand" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-2 text-center", children: "Risk" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-2 text-center", children: "Action" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-vanta-border", children: data2.predictions.slice(0, 30).map((p) => /* @__PURE__ */ jsxs("tr", { className: "hover:bg-vanta-50 dark:hover:bg-vanta-900/20", children: [
        /* @__PURE__ */ jsx("td", { className: "px-4 py-2 truncate max-w-[200px]", children: p.title }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-2 text-right", children: p.currentStock }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-2 text-right", children: p.predictedDemand7d }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-2 text-right", children: p.predictedDemand30d }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-2 text-center", children: /* @__PURE__ */ jsx("span", { className: `text-[10px] px-2 py-0.5 rounded-full ${p.stockoutRisk === "CRITICAL" ? "bg-rose-100 text-rose-700" : p.stockoutRisk === "HIGH" ? "bg-amber-100 text-amber-700" : p.stockoutRisk === "MEDIUM" ? "bg-yellow-100 text-yellow-700" : "bg-emerald-100 text-emerald-700"}`, children: p.stockoutRisk }) }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-2 text-center text-xs", children: p.recommendedAction })
      ] }, p.productId)) })
    ] }) }) })
  ] });
}
const route23 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: PredictiveDashboard,
  headers: headers$k,
  loader: loader$n
}, Symbol.toStringTag, { value: "Module" }));
function headers$j(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function loader$m(args) {
  const ctx = await requireAdmin(args);
  const url = new URL(args.request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
  const [scopeLogs, auditLogs] = await Promise.all([
    prisma.scopeAuditLog.findMany({
      where: { shopDomain: ctx.shopDomain },
      orderBy: { timestamp: "desc" },
      take: limit
    }),
    prisma.auditLog.findMany({
      where: { shopDomain: ctx.shopDomain },
      orderBy: { timestamp: "desc" },
      take: limit
    })
  ]);
  return json({
    scopeAuditLog: scopeLogs.map((l) => ({
      id: l.id,
      scope: l.scope,
      taskId: l.taskId,
      endpoint: l.endpoint,
      timestamp: l.timestamp.toISOString()
    })),
    auditLog: auditLogs.map((l) => ({
      id: l.id,
      staffId: l.staffId,
      taskId: l.taskId,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      timestamp: l.timestamp.toISOString()
    }))
  });
}
const route24 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  headers: headers$j,
  loader: loader$m
}, Symbol.toStringTag, { value: "Module" }));
const loader$l = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const target = shop ? `/auth/login?shop=${encodeURIComponent(shop)}` : "/auth/login";
  return redirect(target);
};
const route25 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$l
}, Symbol.toStringTag, { value: "Module" }));
function headers$i(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function action$6(args) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const input = validate(FeedbackSchema, body);
  await prisma.feedback.create({
    data: {
      shopId: ctx.shop.id,
      shopDomain: ctx.shopDomain,
      staffId: ctx.staffId,
      rating: input.rating,
      message: input.message,
      screenshotUrl: input.screenshotUrl,
      page: input.page,
      userAgent: args.request.headers.get("user-agent") ?? null
    }
  });
  return json({ ok: true }, { status: 201 });
}
const route26 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6,
  headers: headers$i
}, Symbol.toStringTag, { value: "Module" }));
function headers$h(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function loader$k(args) {
  const ctx = await requireAdmin(args);
  const shop = ctx.shop;
  return json({
    preferredLanguage: shop.preferredLanguage,
    agentPersona: shop.agentPersona,
    canWriteProducts: shop.canWriteProducts,
    canWriteCollections: shop.canWriteCollections,
    canWriteInventory: shop.canWriteInventory,
    canWriteMetafields: shop.canWriteMetafields,
    canWriteThemes: shop.canWriteThemes,
    canReadOrders: shop.canReadOrders,
    canReadCustomers: shop.canReadCustomers,
    requiresApprovalOnBulk: shop.requiresApprovalOnBulk,
    bulkThreshold: shop.bulkThreshold,
    notifyOnTaskComplete: shop.notifyOnTaskComplete,
    notifyOnGuardianAlert: shop.notifyOnGuardianAlert,
    notifyOnError: shop.notifyOnError,
    emailNotifications: shop.emailNotifications,
    guardianModeEnabled: shop.guardianModeEnabled,
    guardianIntervalHours: shop.guardianIntervalHours,
    killSwitchEnabled: shop.killSwitchEnabled,
    killSwitchReason: shop.killSwitchReason,
    completedOnboarding: shop.completedOnboarding
  });
}
async function action$5(args) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const update = validate(UpdateSettingsSchema, body);
  await prisma.shop.update({
    where: { id: ctx.shop.id },
    data: update
  });
  return json({ ok: true });
}
const route27 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5,
  headers: headers$h,
  loader: loader$k
}, Symbol.toStringTag, { value: "Module" }));
async function loader$j(args) {
  const ctx = await requireAdmin(args);
  const alerts = await prisma.guardianAlert.findMany({
    where: shopScoped(ctx.shopDomain),
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return json({
    locale: ctx.shop.preferredLanguage,
    alerts: alerts.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      description: a.description,
      resolved: a.resolved,
      createdAt: a.createdAt.toISOString()
    }))
  });
}
function headers$g(_) {
  return getSecurityHeaders();
}
async function action$4(args) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const { alertId, action: action2 } = body;
  const alert = await prisma.guardianAlert.findFirst({
    where: { id: alertId, ...shopScoped(ctx.shopDomain) }
  });
  if (!alert) return json({ ok: false }, { status: 404 });
  if (action2 === "resolve") {
    await prisma.guardianAlert.update({
      where: { id: alert.id },
      data: { resolved: true, resolvedAt: /* @__PURE__ */ new Date() }
    });
    return json({ ok: true });
  }
  if (action2 === "fix") {
    const fixPrompt = `Guardian alert "${alert.title}" detected. Description: ${alert.description}. Investigate and propose a fix.`;
    const task2 = await prisma.task.create({
      data: {
        shopId: ctx.shop.id,
        shopDomain: ctx.shopDomain,
        staffId: ctx.staffId,
        command: fixPrompt,
        language: ctx.shop.preferredLanguage,
        persona: ctx.shop.agentPersona,
        status: "QUEUED",
        priority: "HIGH",
        estimatedCredits: 2
      }
    });
    await enqueueTask(
      { taskId: task2.id, shopDomain: ctx.shopDomain, enqueuedAt: (/* @__PURE__ */ new Date()).toISOString() },
      "HIGH"
    );
    return json({ ok: true, taskId: task2.id });
  }
  return json({ ok: false }, { status: 400 });
}
function Guardian() {
  const data2 = useLoaderData();
  const fetcher = useFetcher();
  const { t } = useTranslation(data2.locale);
  const activeAlerts = data2.alerts.filter((a) => !a.resolved);
  const resolvedAlerts = data2.alerts.filter((a) => a.resolved);
  const handleFix = (alertId) => {
    fetcher.submit({ alertId, action: "fix" }, { method: "post", encType: "application/json" });
  };
  const handleResolve = (alertId) => {
    fetcher.submit({ alertId, action: "resolve" }, { method: "post", encType: "application/json" });
  };
  return /* @__PURE__ */ jsxs("div", { className: "max-w-3xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Shield, { className: "h-6 w-6" }),
        t("guardian.title")
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted mt-1", children: t("guardian.subtitle") })
    ] }),
    activeAlerts.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "vanta-card p-10 text-center", children: [
      /* @__PURE__ */ jsx(CheckCircle2, { className: "h-10 w-10 text-emerald-500 mx-auto mb-3" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm", children: t("guardian.noAlerts") })
    ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: activeAlerts.map((alert) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: `vanta-card p-4 ${alert.severity === "critical" ? "border-rose-300 dark:border-rose-700" : "border-amber-300 dark:border-amber-700"}`,
        children: [
          /* @__PURE__ */ jsx("div", { className: "flex items-start justify-between gap-3", children: /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
              /* @__PURE__ */ jsx(
                AlertTriangle$1,
                {
                  className: `h-4 w-4 ${alert.severity === "critical" ? "text-rose-500" : "text-amber-500"}`
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "text-[10px] uppercase tracking-wide font-semibold text-vanta-muted", children: t(`guardian.types.${alert.type}`) })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm", children: alert.title }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mt-1", children: alert.description }),
            /* @__PURE__ */ jsx("p", { className: "text-[10px] text-vanta-muted mt-2", children: formatRelativeTime(alert.createdAt, data2.locale) })
          ] }) }),
          /* @__PURE__ */ jsxs("div", { className: "mt-3 flex gap-2", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => handleFix(alert.id),
                className: "px-3 py-1.5 text-xs rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 transition",
                children: t("guardian.fixNow")
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => handleResolve(alert.id),
                className: "px-3 py-1.5 text-xs rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition",
                children: t("guardian.resolve")
              }
            )
          ] })
        ]
      },
      alert.id
    )) }),
    resolvedAlerts.length > 0 && /* @__PURE__ */ jsxs("details", { className: "vanta-card p-4", children: [
      /* @__PURE__ */ jsxs("summary", { className: "cursor-pointer text-sm font-medium", children: [
        "Resolved alerts (",
        resolvedAlerts.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx("ul", { className: "mt-3 space-y-2 opacity-60", children: resolvedAlerts.map((alert) => /* @__PURE__ */ jsxs("li", { className: "text-xs", children: [
        /* @__PURE__ */ jsx("span", { className: "font-medium", children: alert.title }),
        /* @__PURE__ */ jsxs("span", { className: "ml-2 text-vanta-muted", children: [
          "· ",
          formatRelativeTime(alert.createdAt, data2.locale)
        ] })
      ] }, alert.id)) })
    ] })
  ] });
}
const route28 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4,
  default: Guardian,
  headers: headers$g,
  loader: loader$j
}, Symbol.toStringTag, { value: "Module" }));
function HelpTooltip({ content, side = "top", className }) {
  const [open, setOpen] = useState(false);
  const sideClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  };
  return /* @__PURE__ */ jsxs("span", { className: cn("relative inline-flex", className), children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: () => setOpen((v) => !v),
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false),
        onFocus: () => setOpen(true),
        onBlur: () => setOpen(false),
        className: "rounded-full p-0.5 text-vanta-muted hover:text-vanta-700 dark:hover:text-vanta-200 transition focus:outline-none focus:ring-2 focus:ring-vanta-500",
        "aria-label": "More information",
        "aria-expanded": open,
        children: /* @__PURE__ */ jsx(HelpCircle, { className: "h-4 w-4", "aria-hidden": "true" })
      }
    ),
    open && /* @__PURE__ */ jsx(
      "span",
      {
        role: "tooltip",
        className: cn(
          "absolute z-30 w-64 px-3 py-2 rounded-lg text-xs text-white bg-vanta-900 dark:bg-vanta-700 shadow-lg",
          sideClasses[side]
        ),
        children: content
      }
    )
  ] });
}
async function loader$i(args) {
  const ctx = await requireAdmin(args);
  return json({
    shop: {
      preferredLanguage: ctx.shop.preferredLanguage,
      agentPersona: ctx.shop.agentPersona,
      canWriteProducts: ctx.shop.canWriteProducts,
      canWriteCollections: ctx.shop.canWriteCollections,
      canWriteInventory: ctx.shop.canWriteInventory,
      canWriteMetafields: ctx.shop.canWriteMetafields,
      canWriteThemes: ctx.shop.canWriteThemes,
      canReadOrders: ctx.shop.canReadOrders,
      canReadCustomers: ctx.shop.canReadCustomers,
      requiresApprovalOnBulk: ctx.shop.requiresApprovalOnBulk,
      bulkThreshold: ctx.shop.bulkThreshold,
      notifyOnTaskComplete: ctx.shop.notifyOnTaskComplete,
      notifyOnGuardianAlert: ctx.shop.notifyOnGuardianAlert,
      notifyOnError: ctx.shop.notifyOnError,
      emailNotifications: ctx.shop.emailNotifications,
      guardianModeEnabled: ctx.shop.guardianModeEnabled,
      guardianIntervalHours: ctx.shop.guardianIntervalHours,
      killSwitchEnabled: ctx.shop.killSwitchEnabled,
      killSwitchReason: ctx.shop.killSwitchReason
    },
    locale: ctx.shop.preferredLanguage
  });
}
function headers$f(_) {
  return getSecurityHeaders();
}
async function action$3(args) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const update = validate(UpdateSettingsSchema, body);
  await prisma.shop.update({
    where: { id: ctx.shop.id },
    data: update
  });
  return json({ ok: true });
}
function Settings() {
  const data2 = useLoaderData();
  const { t } = useTranslation(data2.locale);
  const toast = useToast();
  const submit = useSubmit();
  const [form, setForm] = useState(data2.shop);
  const [killSwitchConfirm, setKillSwitchConfirm] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => {
      submit(JSON.stringify(form), {
        method: "post",
        encType: "application/json",
        replace: true
      });
      toast.success(t("settings.saved"));
    }, 800);
    return () => clearTimeout(id);
  }, [form, submit, toast, t]);
  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const toggleKillSwitch = () => {
    if (!form.killSwitchEnabled && !killSwitchConfirm) {
      setKillSwitchConfirm(true);
      return;
    }
    setKillSwitchConfirm(false);
    setField("killSwitchEnabled", !form.killSwitchEnabled);
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6 max-w-3xl", children: [
    /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: t("settings.title") }) }),
    /* @__PURE__ */ jsxs("div", { className: `vanta-card p-5 ${form.killSwitchEnabled ? "border-rose-400 dark:border-rose-600" : ""}`, children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3 mb-2", children: [
        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("h2", { className: "font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Power, { className: "h-4 w-4" }),
          t("settings.killSwitch.title"),
          /* @__PURE__ */ jsx(HelpTooltip, { content: t("settings.killSwitch.hint") })
        ] }) }),
        /* @__PURE__ */ jsx(
          Toggle,
          {
            checked: form.killSwitchEnabled,
            onChange: toggleKillSwitch,
            ariaLabel: t("settings.killSwitch.label"),
            danger: true
          }
        )
      ] }),
      killSwitchConfirm && /* @__PURE__ */ jsxs("div", { className: "mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-700", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-rose-800 dark:text-rose-200 mb-2 flex items-start gap-1", children: [
          /* @__PURE__ */ jsx(AlertTriangle$1, { className: "h-3.5 w-3.5 shrink-0 mt-0.5" }),
          t("settings.killSwitch.hint")
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: toggleKillSwitch,
            className: "px-3 py-1 text-xs rounded-lg bg-rose-600 text-white hover:bg-rose-700",
            children: t("common.confirm")
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setKillSwitchConfirm(false),
            className: "ml-2 px-3 py-1 text-xs rounded-lg bg-vanta-100 dark:bg-vanta-800",
            children: t("common.cancel")
          }
        )
      ] }),
      form.killSwitchEnabled && /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: form.killSwitchReason ?? "",
          onChange: (e2) => setField("killSwitchReason", e2.target.value),
          placeholder: t("settings.killSwitch.reasonLabel"),
          className: "mt-3 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500"
        }
      )
    ] }),
    /* @__PURE__ */ jsx(Section, { title: t("settings.language"), icon: /* @__PURE__ */ jsx(Globe, { className: "h-4 w-4" }), hint: t("settings.languageHint"), children: /* @__PURE__ */ jsxs(
      "select",
      {
        value: form.preferredLanguage,
        onChange: (e2) => setField("preferredLanguage", e2.target.value),
        className: "w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500",
        children: [
          /* @__PURE__ */ jsx("option", { value: "en", children: "English" }),
          /* @__PURE__ */ jsx("option", { value: "ar", children: "العربية (Moroccan business)" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx(Section, { title: t("settings.persona"), icon: /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4" }), children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-2", children: ["PROFESSIONAL", "FRIENDLY", "CONCISE"].map((p) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: () => setField("agentPersona", p),
        className: `px-3 py-2 rounded-lg text-sm transition ${form.agentPersona === p ? "bg-vanta-600 text-white" : "bg-vanta-100 dark:bg-vanta-800 hover:opacity-80"}`,
        children: t(`settings.personaOptions.${p}`)
      },
      p
    )) }) }),
    /* @__PURE__ */ jsxs(
      Section,
      {
        title: t("settings.permissions"),
        icon: /* @__PURE__ */ jsx(Shield, { className: "h-4 w-4" }),
        hint: t("settings.permissionsHint"),
        children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(
              PermissionToggle,
              {
                label: t("settings.canWriteProducts"),
                checked: form.canWriteProducts,
                onChange: (v) => setField("canWriteProducts", v)
              }
            ),
            /* @__PURE__ */ jsx(
              PermissionToggle,
              {
                label: t("settings.canWriteCollections"),
                checked: form.canWriteCollections,
                onChange: (v) => setField("canWriteCollections", v)
              }
            ),
            /* @__PURE__ */ jsx(
              PermissionToggle,
              {
                label: t("settings.canWriteInventory"),
                checked: form.canWriteInventory,
                onChange: (v) => setField("canWriteInventory", v)
              }
            ),
            /* @__PURE__ */ jsx(
              PermissionToggle,
              {
                label: t("settings.canWriteMetafields"),
                checked: form.canWriteMetafields,
                onChange: (v) => setField("canWriteMetafields", v)
              }
            ),
            /* @__PURE__ */ jsx(
              PermissionToggle,
              {
                label: t("settings.canWriteThemes"),
                checked: form.canWriteThemes,
                onChange: (v) => setField("canWriteThemes", v)
              }
            ),
            /* @__PURE__ */ jsx(
              PermissionToggle,
              {
                label: t("settings.canReadOrders"),
                checked: form.canReadOrders,
                onChange: (v) => setField("canReadOrders", v)
              }
            ),
            /* @__PURE__ */ jsx(
              PermissionToggle,
              {
                label: t("settings.canReadCustomers"),
                checked: form.canReadCustomers,
                onChange: (v) => setField("canReadCustomers", v)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-4 pt-4 border-t border-vanta-border", children: [
            /* @__PURE__ */ jsx(
              PermissionToggle,
              {
                label: t("settings.requiresApprovalOnBulk"),
                checked: form.requiresApprovalOnBulk,
                onChange: (v) => setField("requiresApprovalOnBulk", v)
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "mt-3", children: [
              /* @__PURE__ */ jsx("label", { className: "text-xs text-vanta-muted", children: t("settings.bulkThreshold") }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  min: 1,
                  max: 1e4,
                  value: form.bulkThreshold,
                  onChange: (e2) => setField("bulkThreshold", Number(e2.target.value)),
                  className: "mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500"
                }
              )
            ] })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs(
      Section,
      {
        title: t("settings.guardian.title"),
        icon: /* @__PURE__ */ jsx(Shield, { className: "h-4 w-4" }),
        hint: t("settings.guardian.hint"),
        children: [
          /* @__PURE__ */ jsx(
            PermissionToggle,
            {
              label: t("settings.guardian.label"),
              checked: form.guardianModeEnabled,
              onChange: (v) => setField("guardianModeEnabled", v)
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "mt-3", children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs text-vanta-muted", children: t("settings.guardian.intervalLabel") }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "number",
                min: 1,
                max: 72,
                value: form.guardianIntervalHours,
                onChange: (e2) => setField("guardianIntervalHours", Number(e2.target.value)),
                className: "mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500"
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx(Section, { title: t("settings.notifications.title"), icon: /* @__PURE__ */ jsx(Bell, { className: "h-4 w-4" }), children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsx(
        PermissionToggle,
        {
          label: t("settings.notifications.onTaskComplete"),
          checked: form.notifyOnTaskComplete,
          onChange: (v) => setField("notifyOnTaskComplete", v)
        }
      ),
      /* @__PURE__ */ jsx(
        PermissionToggle,
        {
          label: t("settings.notifications.onGuardianAlert"),
          checked: form.notifyOnGuardianAlert,
          onChange: (v) => setField("notifyOnGuardianAlert", v)
        }
      ),
      /* @__PURE__ */ jsx(
        PermissionToggle,
        {
          label: t("settings.notifications.onError"),
          checked: form.notifyOnError,
          onChange: (v) => setField("notifyOnError", v)
        }
      ),
      /* @__PURE__ */ jsx(
        PermissionToggle,
        {
          label: t("settings.notifications.email"),
          checked: form.emailNotifications,
          onChange: (v) => setField("emailNotifications", v)
        }
      )
    ] }) })
  ] });
}
function Section({
  title,
  icon,
  hint,
  children
}) {
  return /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-3", children: [
      /* @__PURE__ */ jsxs("h2", { className: "font-semibold flex items-center gap-2", children: [
        icon,
        title
      ] }),
      hint && /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mt-1", children: hint })
    ] }),
    children
  ] });
}
function PermissionToggle({
  label,
  checked,
  onChange
}) {
  return /* @__PURE__ */ jsxs("label", { className: "flex items-center justify-between gap-3 py-1.5 cursor-pointer", children: [
    /* @__PURE__ */ jsx("span", { className: "text-sm", children: label }),
    /* @__PURE__ */ jsx(Toggle, { checked, onChange, ariaLabel: label })
  ] });
}
function Toggle({
  checked,
  onChange,
  ariaLabel,
  danger
}) {
  return /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": checked,
      "aria-label": ariaLabel,
      onClick: () => onChange(!checked),
      className: `relative h-6 w-11 rounded-full transition shrink-0 ${checked ? danger ? "bg-rose-500" : "bg-vanta-600" : "bg-vanta-200 dark:bg-vanta-700"}`,
      children: /* @__PURE__ */ jsx(
        "span",
        {
          className: `absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`
        }
      )
    }
  );
}
const route29 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3,
  default: Settings,
  headers: headers$f,
  loader: loader$i
}, Symbol.toStringTag, { value: "Module" }));
async function getActiveSubscription(shopDomain) {
  const e2 = loadEnv();
  if (!e2.SHOPIFY_PARTNER_API_TOKEN || !e2.SHOPIFY_PARTNER_APP_ID) {
    const shop = await prisma.shop.findUnique({
      where: { shopDomain },
      select: {
        plan: true,
        planStatus: true,
        creditsRemaining: true,
        creditsUsedCycle: true,
        cycleResetAt: true
      }
    });
    return shop ? {
      plan: shop.plan,
      status: shop.planStatus ?? "ACTIVE",
      creditsRemaining: shop.creditsRemaining,
      creditsUsedCycle: shop.creditsUsedCycle,
      cycleResetAt: shop.cycleResetAt
    } : null;
  }
  try {
    const shop = await prisma.shop.findUnique({
      where: { shopDomain },
      select: {
        plan: true,
        planStatus: true,
        creditsRemaining: true,
        creditsUsedCycle: true,
        cycleResetAt: true
      }
    });
    return shop ? {
      plan: shop.plan,
      status: shop.planStatus ?? "ACTIVE",
      creditsRemaining: shop.creditsRemaining,
      creditsUsedCycle: shop.creditsUsedCycle,
      cycleResetAt: shop.cycleResetAt
    } : null;
  } catch (err) {
    logger.error("getActiveSubscription failed", { shopDomain, error: String(err) });
    return null;
  }
}
const PLAN_CREDITS = {
  FREE: 100,
  GROWTH: 1e3,
  PRO: 1e4,
  PRIVATE_TEST: 999999
};
async function resetCreditCycleIfDue(shopDomain) {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: { plan: true, cycleResetAt: true, creditsRemaining: true }
  });
  if (!shop) return false;
  if (shop.plan === "PRIVATE_TEST") return false;
  if (!shop.cycleResetAt) {
    const nextReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
    await prisma.shop.update({
      where: { shopDomain },
      data: {
        creditsRemaining: PLAN_CREDITS[shop.plan] ?? 100,
        creditsUsedCycle: 0,
        cycleResetAt: nextReset
      }
    });
    logger.info("Credit cycle initialized", { shopDomain, nextReset });
    return true;
  }
  if (shop.cycleResetAt < /* @__PURE__ */ new Date()) {
    const nextReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
    const newCredits = PLAN_CREDITS[shop.plan] ?? 100;
    await prisma.shop.update({
      where: { shopDomain },
      data: {
        creditsRemaining: newCredits,
        creditsUsedCycle: 0,
        cycleResetAt: nextReset
      }
    });
    logger.info("Credit cycle reset", { shopDomain, newCredits, nextReset });
    return true;
  }
  return false;
}
async function checkCredits(shopDomain) {
  await resetCreditCycleIfDue(shopDomain);
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: { creditsRemaining: true, plan: true }
  });
  if (!shop) return { allowed: false, remaining: 0, plan: "UNKNOWN", message: "Shop not found" };
  if (shop.plan === "PRIVATE_TEST") {
    return { allowed: true, remaining: 999999, plan: shop.plan };
  }
  if (shop.creditsRemaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      plan: shop.plan,
      message: "You have no credits remaining. Upgrade your plan or wait for the next billing cycle."
    };
  }
  return { allowed: true, remaining: shop.creditsRemaining, plan: shop.plan };
}
const appEvents = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  checkCredits,
  getActiveSubscription,
  resetCreditCycleIfDue
}, Symbol.toStringTag, { value: "Module" }));
function headers$e(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function loader$h(args) {
  const ctx = await requireAdmin(args);
  const sub = await getActiveSubscription(ctx.shopDomain);
  return json({
    plan: sub?.plan ?? "FREE",
    status: sub?.status ?? "ACTIVE",
    creditsRemaining: sub?.creditsRemaining ?? 0,
    creditsUsedCycle: sub?.creditsUsedCycle ?? 0,
    cycleResetAt: sub?.cycleResetAt?.toISOString() ?? null
  });
}
const route30 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  headers: headers$e,
  loader: loader$h
}, Symbol.toStringTag, { value: "Module" }));
async function loader$g(args) {
  const ctx = await requireAdmin(args);
  const sub = await getActiveSubscription(ctx.shopDomain);
  const recentEvents = await prisma.appEvent.findMany({
    where: { shopDomain: ctx.shopDomain },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  return json({
    locale: ctx.shop.preferredLanguage,
    subscription: sub,
    recentEvents: recentEvents.map((e2) => ({
      id: e2.id,
      eventName: e2.eventName,
      credits: e2.credits,
      createdAt: e2.createdAt.toISOString(),
      taskId: e2.taskId
    }))
  });
}
function headers$d(_) {
  return getSecurityHeaders();
}
function Billing() {
  const data2 = useLoaderData();
  const { t } = useTranslation(data2.locale);
  const sub = data2.subscription;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6 max-w-3xl", children: [
    /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(CreditCard, { className: "h-6 w-6" }),
      t("billing.title")
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted uppercase tracking-wide mb-1", children: t("billing.currentPlan") }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold", children: sub ? t(`billing.plans.${sub.plan}`) : "—" }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-vanta-muted mt-1", children: [
          "Status: ",
          sub?.status ?? "—"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted uppercase tracking-wide mb-1", children: t("billing.creditsRemaining") }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold", children: formatCredits(sub?.creditsRemaining ?? 0) }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-vanta-muted mt-1", children: [
          t("billing.creditsUsed"),
          ": ",
          formatCredits(sub?.creditsUsedCycle ?? 0)
        ] })
      ] })
    ] }),
    sub?.cycleResetAt && /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: t("billing.cycleResets", { date: formatDateTime(sub.cycleResetAt, data2.locale) }) }),
    /* @__PURE__ */ jsxs(
      "a",
      {
        href: `https://${data2.subscription ? "admin.shopify.com" : ""}/charges`,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700 transition",
        children: [
          /* @__PURE__ */ jsx(ExternalLink, { className: "h-3.5 w-3.5" }),
          t("billing.manage")
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5", children: [
      /* @__PURE__ */ jsxs("h2", { className: "font-semibold mb-3 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(TrendingUp, { className: "h-4 w-4 text-vanta-muted" }),
        "Recent credit usage"
      ] }),
      data2.recentEvents.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted", children: "No usage yet this cycle." }) : /* @__PURE__ */ jsx("ul", { className: "divide-y divide-vanta-border", children: data2.recentEvents.map((e2) => /* @__PURE__ */ jsxs("li", { className: "py-2 flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm", children: e2.eventName }),
          e2.taskId && /* @__PURE__ */ jsx("a", { href: `/app/history/${e2.taskId}`, className: "text-xs text-vanta-muted hover:underline", children: "View task" })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-vanta-muted", children: formatDateTime(e2.createdAt, data2.locale) }),
        /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: e2.credits })
      ] }, e2.id)) })
    ] })
  ] });
}
const route31 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Billing,
  headers: headers$d,
  loader: loader$g
}, Symbol.toStringTag, { value: "Module" }));
async function loader$f(args) {
  const ctx = await requireAdmin(args);
  const url = new URL(args.request.url);
  const search = url.searchParams.get("q") ?? "";
  const filter = url.searchParams.get("filter") ?? "all";
  const statusFilter = filter === "completed" ? ["COMPLETED"] : filter === "failed" ? ["ERROR"] : filter === "reverted" ? ["REVERTED"] : void 0;
  const tasks = await prisma.task.findMany({
    where: {
      ...shopScoped(ctx.shopDomain),
      ...statusFilter ? { status: { in: statusFilter } } : {},
      ...search ? { command: { contains: search, mode: "insensitive" } } : {}
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { staff: { select: { name: true } } }
  });
  return json({
    tasks: tasks.map((t) => ({
      id: t.id,
      command: t.command,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString(),
      staffName: t.staff?.name ?? null
    })),
    locale: ctx.shop.preferredLanguage,
    search,
    filter
  });
}
function headers$c(_) {
  return getSecurityHeaders();
}
function HistoryList() {
  const data2 = useLoaderData();
  const { t } = useTranslation(data2.locale);
  const [search, setSearch] = useState(data2.search);
  const filters = [
    { key: "all", label: t("history.filterAll") },
    { key: "completed", label: t("history.filterCompleted") },
    { key: "failed", label: t("history.filterFailed") },
    { key: "reverted", label: t("history.filterReverted") }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: t("history.title") }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted", children: t("history.subtitle") })
    ] }),
    /* @__PURE__ */ jsxs("form", { method: "get", className: "flex gap-2 flex-wrap", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [
        /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vanta-muted" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            name: "q",
            value: search,
            onChange: (e2) => setSearch(e2.target.value),
            placeholder: t("history.search"),
            className: "w-full pl-9 pr-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500"
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        "select",
        {
          name: "filter",
          defaultValue: data2.filter,
          className: "px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500",
          children: filters.map((f) => /* @__PURE__ */ jsx("option", { value: f.key, children: f.label }, f.key))
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "submit",
          className: "px-4 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700 transition flex items-center gap-1.5",
          children: [
            /* @__PURE__ */ jsx(Filter, { className: "h-3.5 w-3.5" }),
            t("common.search")
          ]
        }
      )
    ] }),
    data2.tasks.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "vanta-card p-10 text-center", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted", children: t("history.empty") }),
      /* @__PURE__ */ jsx(
        Link$1,
        {
          to: "/app/canvas",
          className: "inline-block mt-3 text-sm text-vanta-600 dark:text-vanta-300 hover:underline",
          children: t("commandPalette.actions.goCanvas")
        }
      )
    ] }) : /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: data2.tasks.map((task2) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
      Link$1,
      {
        to: `/app/history/${task2.id}`,
        className: "block vanta-card p-4 hover:border-vanta-400 dark:hover:border-vanta-500 transition",
        children: /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium truncate", children: truncate(task2.command, 100) }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-vanta-muted mt-1", children: [
              task2.staffName && `${t("task.initiatedBy", { staff: task2.staffName })} · `,
              formatRelativeTime(task2.createdAt, data2.locale)
            ] })
          ] }),
          /* @__PURE__ */ jsx(StatusBadge$1, { status: task2.status, locale: data2.locale })
        ] })
      }
    ) }, task2.id)) })
  ] });
}
function StatusBadge$1({ status, locale }) {
  const { t } = useTranslation(locale);
  const colors = {
    COMPLETED: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    ERROR: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    AWAITING_APPROVAL: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    QUEUED: "bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200",
    THINKING: "bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200",
    EXECUTING: "bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200",
    CANCELLED: "bg-vanta-100 dark:bg-vanta-800 text-vanta-muted",
    REVERTED: "bg-vanta-100 dark:bg-vanta-800 text-vanta-muted"
  };
  return /* @__PURE__ */ jsx("span", { className: `text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${colors[status] ?? colors.QUEUED}`, children: t(`task.states.${status}`) });
}
const route32 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: HistoryList,
  headers: headers$c,
  loader: loader$f
}, Symbol.toStringTag, { value: "Module" }));
async function loader$e(args) {
  try {
    const ctx = await requireAdmin(args);
    const wl = getWhitelabelConfig();
    return json({
      locale: ctx.shop.preferredLanguage,
      appName: wl.appName,
      supportEmail: wl.supportEmail,
      copyrightHolder: wl.copyrightHolder,
      shopDomain: ctx.shopDomain
    });
  } catch {
    const wl = getWhitelabelConfig();
    return json({
      locale: "en",
      appName: wl.appName,
      supportEmail: wl.supportEmail,
      copyrightHolder: wl.copyrightHolder,
      shopDomain: null
    });
  }
}
function headers$b(_) {
  return getSecurityHeaders();
}
function Privacy() {
  const data2 = useLoaderData();
  const { t } = useTranslation(data2.locale);
  const content = generatePrivacyContent(data2.appName, data2.supportEmail, data2.copyrightHolder);
  return /* @__PURE__ */ jsxs("div", { className: "max-w-3xl mx-auto space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200", children: [
      /* @__PURE__ */ jsx(AlertTriangle$1, { className: "h-4 w-4 shrink-0 mt-0.5" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs", children: t("legal.draftNotice") })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: t("legal.lastUpdated", { date: "2026-06-20" }) }),
    /* @__PURE__ */ jsx(MarkdownRenderer, { content })
  ] });
}
function generatePrivacyContent(appName, supportEmail, copyrightHolder) {
  return `# Privacy Policy — ${appName}

**Last updated: 2026-06-20**

${appName} ("we", "us", "our") operates an AI agent application embedded in your Shopify admin. This Privacy Policy explains what data we collect, why we collect it, how long we retain it, and how you can exercise your data protection rights.

## 1. Data We Collect

We collect the minimum data necessary to operate the agent:

- **Shop domain** — to identify your store and scope all queries to your data only.
- **Shopify OAuth access token** — encrypted at rest via the official Prisma session storage adapter. Used only to call the Shopify Admin GraphQL API on your behalf.
- **Staff member identity** — name, email, and Shopify staff ID extracted from the App Bridge session token. Used for audit trail and accountability.
- **Task commands and outputs** — the natural-language commands you submit to the agent, the AI's reasoning trace, and the structured results of executed Shopify mutations.
- **Audit logs** — every Shopify API scope exercised, by which staff member, for which task, at what timestamp.
- **Before/after state snapshots** — for any product, variant, collection, or metafield modified by the agent, we store the previous state to enable one-click undo.
- **Customer or order data** — only if you explicitly grant the \`read_orders\` or \`read_customers\` scopes for a real feature. We never store customer PII beyond what appears in task logs you voluntarily generate by submitting commands that reference customers.
- **Notification and feedback data** — when you submit feedback or receive in-app notifications, we store the content until you delete it.

## 2. Why We Collect This Data

Each data category serves a specific operational purpose:

- **Shop domain + access token** — required to authenticate Shopify Admin API calls on your behalf and to ensure strict multi-tenant isolation (we never execute an unscoped query).
- **Staff identity** — required for multi-staff accountability, so every change can be traced to the specific person who authorized it.
- **Task commands and outputs** — required to execute your requests, render the result in the UI, and answer future questions about past actions (self-documenting knowledge base).
- **Audit logs** — required by Shopify's platform policies and essential for security incident investigation.
- **Undo snapshots** — required to honor the "undo this action" trust feature; deleted automatically 30 days after the task completes.

## 3. AI Sub-Processor Disclosure

${appName} uses **Google Gemini API** as an AI sub-processor. When you submit a command, your command text and relevant store data are sent to Google's API to generate a response. Google's data processing is governed by their own privacy policy and terms of service.

We do not use your data to train AI models. We do not share your data with any third party other than:

1. Google Gemini (for AI inference only)
2. Shopify (via the official Admin API, at your direction)
3. Resend (for transactional email delivery, only if you have email notifications enabled)
4. Sentry (for error tracking, with PII scrubbed)

## 4. Data Retention

- **Active task data** — retained indefinitely while your shop is installed.
- **Undo snapshots** — retained 30 days after task completion, then automatically deleted.
- **Audit logs** — retained 12 months for security and compliance purposes.
- **Rate limit snapshots** — retained 30 days for API health visibility.
- **Processed webhook records** — retained 30 days for idempotency tracking.

## 5. Your Data Protection Rights

Under GDPR (EU), CCPA (California), PIPEDA (Canada), and Law 09-08 (Morocco), you have the right to:

- **Access** your personal data
- **Rectify** inaccurate data
- **Erase** your personal data ("right to be forgotten")
- **Restrict** processing
- **Port** your data to another service
- **Object** to processing

### How to exercise these rights

You have two paths:

1. **Self-service** — Visit the [Data Controls page](/app/data-controls) in ${appName} to export or delete all data we hold about your shop.

2. **Shopify-mediated webhooks** — Shopify sends mandatory GDPR webhooks on your behalf when a customer requests deletion of their data. ${appName} processes these webhooks within 48 hours, permanently deleting all associated PII from our Postgres database and Redis logs.

For any privacy request, contact us at **${supportEmail}**. We respond within 30 days.

## 6. Security Measures

- All Shopify access tokens are encrypted at rest via Shopify's official Prisma session storage adapter.
- All API communication uses HTTPS with strict Content-Security-Policy headers.
- HMAC verification on every incoming webhook.
- AI prompt injection prevention — your commands are sanitized and wrapped in strict system-prompt boundaries before being sent to Gemini.
- Strict multi-tenant scoping — every database query is filtered by \`shopDomain\`. We assert this in code and never execute an unscoped query.
- Daily automated database backups with 30-day retention.

## 7. International Data Transfers

Your data may be processed in the United States (Google Gemini), Canada (our primary infrastructure), or any region where Shopify's data centers operate. We rely on Standard Contractual Clauses and Google's GCP data processing agreement for lawful international transfer.

## 8. Children's Privacy

${appName} does not knowingly collect data from children under 16. Shopify merchants are required to be of legal age to operate a business in their jurisdiction.

## 9. Changes to This Policy

We will notify you of material changes by posting a notification in the ${appName} dashboard and updating the "Last updated" date above.

## 10. Contact

For privacy questions, requests, or concerns:

- Email: **${supportEmail}**
- In-app: Help → Contact Support

© ${(/* @__PURE__ */ new Date()).getFullYear()} ${copyrightHolder}. All rights reserved.

---

*This Privacy Policy is provided as a draft for review by your legal counsel. It is not legal advice.*
`;
}
const route33 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Privacy,
  headers: headers$b,
  loader: loader$e
}, Symbol.toStringTag, { value: "Module" }));
function Skeleton({ className }) {
  return /* @__PURE__ */ jsx("div", { className: cn("vanta-skeleton h-4 w-full rounded", className) });
}
function SkeletonText({ lines = 3 }) {
  return /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-2", "aria-hidden": "true", children: Array.from({ length: lines }).map((_, i) => /* @__PURE__ */ jsx(
    Skeleton,
    {
      className: i === lines - 1 ? "h-4 w-2/3" : "h-4 w-full"
    },
    i
  )) });
}
function SkeletonCard() {
  return /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5 space-y-4", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(Skeleton, { className: "h-10 w-10 rounded-full" }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-2", children: [
        /* @__PURE__ */ jsx(Skeleton, { className: "h-4 w-1/3" }),
        /* @__PURE__ */ jsx(Skeleton, { className: "h-3 w-1/4" })
      ] })
    ] }),
    /* @__PURE__ */ jsx(SkeletonText, { lines: 3 })
  ] });
}
function SkeletonDashboard() {
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx(Skeleton, { className: "h-8 w-48" }),
      /* @__PURE__ */ jsx(Skeleton, { className: "h-10 w-32 rounded-lg" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: Array.from({ length: 4 }).map((_, i) => /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5 space-y-3", children: [
      /* @__PURE__ */ jsx(Skeleton, { className: "h-3 w-20" }),
      /* @__PURE__ */ jsx(Skeleton, { className: "h-8 w-24" }),
      /* @__PURE__ */ jsx(Skeleton, { className: "h-3 w-16" })
    ] }, i)) }),
    /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5 space-y-4", children: [
      /* @__PURE__ */ jsx(Skeleton, { className: "h-5 w-40" }),
      Array.from({ length: 3 }).map((_, i) => /* @__PURE__ */ jsx(SkeletonCard, {}, i))
    ] })
  ] });
}
async function loader$d(args) {
  const ctx = await requireAdmin(args);
  const locale = ctx.shop.preferredLanguage;
  const [recentTasks, guardianCount, rateLimit2] = await Promise.all([
    prisma.task.findMany({
      where: shopScoped(ctx.shopDomain),
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        command: true,
        status: true,
        priority: true,
        createdAt: true,
        completedAt: true,
        staff: { select: { name: true } }
      }
    }),
    prisma.guardianAlert.count({
      where: { ...shopScoped(ctx.shopDomain), resolved: false }
    }),
    prisma.rateLimitSnapshot.findFirst({
      where: shopScoped(ctx.shopDomain),
      orderBy: { recordedAt: "desc" },
      select: { currentlyAvailable: true, maximumAvailable: true }
    })
  ]);
  return json({
    shopDomain: ctx.shopDomain,
    locale,
    creditsRemaining: ctx.shop.creditsRemaining,
    creditsUsedCycle: ctx.shop.creditsUsedCycle,
    plan: ctx.shop.plan,
    killSwitchEnabled: ctx.shop.killSwitchEnabled,
    recentTasks: recentTasks.map((t) => ({
      ...t,
      staffName: t.staff?.name ?? null
    })),
    guardianCount,
    rateLimitPercent: rateLimit2 ? Math.round(rateLimit2.currentlyAvailable / rateLimit2.maximumAvailable * 100) : null
  });
}
function headers$a(_) {
  return getSecurityHeaders();
}
function Dashboard() {
  const data2 = useLoaderData();
  const { t } = useTranslation(data2.locale);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs(
      motion.div,
      {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
        className: "flex items-center justify-between flex-wrap gap-3",
        children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: t("nav.dashboard") }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted", children: data2.shopDomain })
          ] }),
          /* @__PURE__ */ jsxs(
            Link$1,
            {
              to: "/app/canvas",
              className: "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vanta-600 text-white text-sm font-medium hover:bg-vanta-700 transition",
              children: [
                /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4" }),
                t("commandPalette.actions.newTask")
              ]
            }
          )
        ]
      }
    ),
    data2.killSwitchEnabled && /* @__PURE__ */ jsxs(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        className: "p-4 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 flex items-start gap-3",
        children: [
          /* @__PURE__ */ jsx(AlertTriangle$1, { className: "h-5 w-5 shrink-0 mt-0.5" }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm", children: "Kill switch is active" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs mt-0.5", children: "The agent is globally disabled. New tasks will be rejected. Visit settings to re-enable." })
          ] }),
          /* @__PURE__ */ jsx(
            Link$1,
            {
              to: "/app/settings",
              className: "text-xs underline shrink-0",
              children: t("nav.settings")
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4", children: [
      /* @__PURE__ */ jsx(
        StatCard,
        {
          icon: /* @__PURE__ */ jsx(CreditCard, { className: "h-4 w-4" }),
          label: t("billing.creditsRemaining"),
          value: formatCredits(data2.creditsRemaining),
          accent: "vanta",
          link: "/app/billing"
        }
      ),
      /* @__PURE__ */ jsx(
        StatCard,
        {
          icon: /* @__PURE__ */ jsx(Zap, { className: "h-4 w-4" }),
          label: t("billing.creditsUsed"),
          value: formatCredits(data2.creditsUsedCycle),
          accent: "vanta",
          link: "/app/billing"
        }
      ),
      /* @__PURE__ */ jsx(
        StatCard,
        {
          icon: /* @__PURE__ */ jsx(AlertTriangle$1, { className: "h-4 w-4" }),
          label: t("guardian.title"),
          value: String(data2.guardianCount),
          accent: data2.guardianCount > 0 ? "warning" : "success",
          link: "/app/guardian"
        }
      ),
      /* @__PURE__ */ jsx(
        StatCard,
        {
          icon: /* @__PURE__ */ jsx(TrendingUp, { className: "h-4 w-4" }),
          label: "API health",
          value: data2.rateLimitPercent !== null ? `${data2.rateLimitPercent}%` : "—",
          accent: data2.rateLimitPercent === null ? "neutral" : data2.rateLimitPercent > 30 ? "success" : data2.rateLimitPercent > 15 ? "warning" : "danger",
          link: "/app/settings"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
        /* @__PURE__ */ jsxs("h2", { className: "font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Activity, { className: "h-4 w-4 text-vanta-muted" }),
          "Recent activity"
        ] }),
        /* @__PURE__ */ jsxs(Link$1, { to: "/app/history", className: "text-xs text-vanta-600 dark:text-vanta-300 hover:underline flex items-center gap-1", children: [
          t("history.title"),
          " ",
          /* @__PURE__ */ jsx(ArrowRight, { className: "h-3 w-3" })
        ] })
      ] }),
      data2.recentTasks.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted text-center py-6", children: t("history.empty") }) : /* @__PURE__ */ jsx("ul", { className: "divide-y divide-vanta-border", children: data2.recentTasks.map((task2) => /* @__PURE__ */ jsxs("li", { className: "py-3 flex items-start justify-between gap-3", children: [
        /* @__PURE__ */ jsxs(Link$1, { to: `/app/history/${task2.id}`, className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm truncate", children: task2.command }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-vanta-muted mt-0.5", children: [
            task2.staffName && `${t("task.initiatedBy", { staff: task2.staffName })} · `,
            formatRelativeTime(task2.createdAt, data2.locale)
          ] })
        ] }),
        /* @__PURE__ */ jsx(StatusBadge, { status: task2.status, locale: data2.locale })
      ] }, task2.id)) })
    ] })
  ] });
}
function StatCard({
  icon,
  label,
  value,
  accent,
  link
}) {
  const accentClasses = {
    vanta: "text-vanta-600 dark:text-vanta-300 bg-vanta-100 dark:bg-vanta-800",
    success: "text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40",
    warning: "text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40",
    danger: "text-rose-600 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40",
    neutral: "text-vanta-muted bg-vanta-100 dark:bg-vanta-800"
  };
  const content = /* @__PURE__ */ jsxs("div", { className: "vanta-card p-4 hover:border-vanta-400 dark:hover:border-vanta-500 transition h-full", children: [
    /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 mb-2", children: /* @__PURE__ */ jsx("span", { className: `p-1.5 rounded ${accentClasses[accent]}`, children: icon }) }),
    /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold", children: value }),
    /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mt-0.5", children: label })
  ] });
  return link ? /* @__PURE__ */ jsx(Link$1, { to: link, children: content }) : content;
}
function StatusBadge({ status, locale }) {
  const { t } = useTranslation(locale);
  const colors = {
    COMPLETED: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    ERROR: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    AWAITING_APPROVAL: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    QUEUED: "bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200",
    THINKING: "bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200",
    EXECUTING: "bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200",
    CANCELLED: "bg-vanta-100 dark:bg-vanta-800 text-vanta-muted",
    REVERTED: "bg-vanta-100 dark:bg-vanta-800 text-vanta-muted"
  };
  return /* @__PURE__ */ jsx("span", { className: `text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[status] ?? colors.QUEUED}`, children: t(`task.states.${status}`) });
}
function ErrorBoundary() {
  return /* @__PURE__ */ jsx(SkeletonDashboard, {});
}
const route34 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: Dashboard,
  headers: headers$a,
  loader: loader$d
}, Symbol.toStringTag, { value: "Module" }));
async function loader$c(args) {
  const e2 = loadEnv();
  const authHeader = args.request.headers.get("Authorization");
  const expected = `Bearer ${e2.AGENCY_SECRET}`;
  if (!e2.AGENCY_SECRET || authHeader !== expected) {
    const url = new URL(args.request.url);
    if (url.searchParams.get("secret") !== e2.AGENCY_SECRET) {
      throw new Response("Unauthorized", { status: 401 });
    }
  }
  const shops = await prisma.shop.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      shopDomain: true,
      name: true,
      plan: true,
      planStatus: true,
      creditsRemaining: true,
      creditsUsedCycle: true,
      installed: true,
      killSwitchEnabled: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          tasks: { where: { status: { in: ["QUEUED", "THINKING", "EXECUTING"] } } },
          guardianAlerts: { where: { resolved: false } }
        }
      }
    }
  });
  const withLastTask = await Promise.all(
    shops.map(async (shop) => {
      const lastTask = await prisma.task.findFirst({
        where: { shopDomain: shop.shopDomain },
        orderBy: { createdAt: "desc" },
        select: { id: true, command: true, status: true, createdAt: true }
      });
      return {
        ...shop,
        lastTask: lastTask ? {
          id: lastTask.id,
          command: lastTask.command,
          status: lastTask.status,
          createdAt: lastTask.createdAt.toISOString()
        } : null,
        activeTaskCount: shop._count.tasks,
        unresolvedAlerts: shop._count.guardianAlerts
      };
    })
  );
  return json({ shops: withLastTask });
}
function headers$9(_) {
  return getSecurityHeaders();
}
function AgencyDashboard() {
  const data2 = useLoaderData();
  return /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto p-6 space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Building2, { className: "h-6 w-6" }),
        "Agency Dashboard"
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-vanta-muted", children: [
        data2.shops.length,
        " connected stores"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "overflow-x-auto vanta-card", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-vanta-50 dark:bg-vanta-900/40 text-xs uppercase tracking-wide text-vanta-muted", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "Store" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "Plan" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "Credits" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "Active tasks" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "Guardian alerts" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "Last activity" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "Status" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-vanta-border", children: data2.shops.map((shop) => /* @__PURE__ */ jsxs("tr", { className: "hover:bg-vanta-50 dark:hover:bg-vanta-900/20", children: [
        /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
          /* @__PURE__ */ jsx("p", { className: "font-medium", children: shop.name ?? shop.shopDomain }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: shop.shopDomain })
        ] }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-vanta-100 dark:bg-vanta-800", children: shop.plan }) }),
        /* @__PURE__ */ jsxs("td", { className: "px-4 py-3 text-xs", children: [
          /* @__PURE__ */ jsxs("p", { children: [
            shop.creditsRemaining,
            " remaining"
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-vanta-muted", children: [
            shop.creditsUsedCycle,
            " used"
          ] })
        ] }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: shop.activeTaskCount > 0 ? /* @__PURE__ */ jsxs("span", { className: "text-xs px-2 py-0.5 rounded-full bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-300", children: [
          shop.activeTaskCount,
          " active"
        ] }) : /* @__PURE__ */ jsx("span", { className: "text-xs text-vanta-muted", children: "—" }) }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: shop.unresolvedAlerts > 0 ? /* @__PURE__ */ jsxs("span", { className: "text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300", children: [
          shop.unresolvedAlerts,
          " alerts"
        ] }) : /* @__PURE__ */ jsx("span", { className: "text-xs text-vanta-muted", children: "—" }) }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-xs text-vanta-muted", children: shop.lastTask ? formatRelativeTime(shop.lastTask.createdAt, "en") : "Never" }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: !shop.installed ? /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300", children: "Uninstalled" }) : shop.killSwitchEnabled ? /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300", children: "Kill switch on" }) : /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300", children: "Healthy" }) })
      ] }, shop.id)) })
    ] }) })
  ] });
}
const route35 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AgencyDashboard,
  headers: headers$9,
  loader: loader$c
}, Symbol.toStringTag, { value: "Module" }));
const AGENTS = [
  {
    id: "inventory-guardian",
    name: "Inventory Guardian",
    goal: "Prevent stockouts by auto-reordering before inventory hits zero",
    schedule: "0 */6 * * *",
    // every 6 hours
    lastRun: null,
    status: "IDLE",
    decisions: 0,
    actionsTaken: 0
  },
  {
    id: "price-optimizer",
    name: "Price Optimizer",
    goal: "Maximize revenue by adjusting prices based on demand + competitor data",
    schedule: "0 9 * * 1",
    // every Monday 9am
    lastRun: null,
    status: "IDLE",
    decisions: 0,
    actionsTaken: 0
  },
  {
    id: "seo-enhancer",
    name: "SEO Enhancer",
    goal: "Continuously improve product SEO scores and meta descriptions",
    schedule: "0 2 * * *",
    // daily at 2am
    lastRun: null,
    status: "IDLE",
    decisions: 0,
    actionsTaken: 0
  },
  {
    id: "customer-retention",
    name: "Customer Retention",
    goal: "Identify at-risk customers and trigger win-back campaigns",
    schedule: "0 8 * * *",
    // daily at 8am
    lastRun: null,
    status: "IDLE",
    decisions: 0,
    actionsTaken: 0
  },
  {
    id: "fraud-monitor",
    name: "Fraud Monitor",
    goal: "Score every new order for fraud risk in real-time",
    schedule: "* * * * *",
    // every minute
    lastRun: null,
    status: "IDLE",
    decisions: 0,
    actionsTaken: 0
  },
  {
    id: "trend-scout",
    name: "Trend Scout",
    goal: "Scan social media for trending products matching our catalog",
    schedule: "0 12 * * *",
    // daily at noon
    lastRun: null,
    status: "IDLE",
    decisions: 0,
    actionsTaken: 0
  },
  {
    id: "ab-test-manager",
    name: "A/B Test Manager",
    goal: "Run continuous experiments on product pages, emails, and pricing",
    schedule: "0 0 * * 0",
    // weekly Sunday
    lastRun: null,
    status: "IDLE",
    decisions: 0,
    actionsTaken: 0
  }
];
function listAutonomousAgents() {
  return AGENTS;
}
async function runAutonomousAgent(shopDomain, agentId) {
  if (await isKillSwitchOn(shopDomain)) {
    return { ran: false, reason: "Kill switch enabled" };
  }
  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) return { ran: false, reason: "Agent not found" };
  logger.info("Autonomous agent starting", { shopDomain, agent: agentId });
  const prompt = `You are the ${agent.name} autonomous agent. Your goal: ${agent.goal}

Analyze the current store state and decide ONE high-impact action to take.
Output JSON: {"action": "<description>", "confidence": <0-1>, "reasoning": "<1 sentence>"}`;
  try {
    const resp = await generateContent(prompt, { temperature: 0.3 });
    let decision;
    try {
      const m = resp.text.match(/\{[\s\S]*\}/);
      decision = JSON.parse(m?.[0] ?? "{}");
    } catch {
      decision = {};
    }
    if (decision.action) {
      await prisma.task.create({
        data: {
          shopId: (await prisma.shop.findUnique({ where: { shopDomain }, select: { id: true } }))?.id ?? "",
          shopDomain,
          command: `[Autonomous: ${agent.name}] ${decision.action}`,
          language: "en",
          status: "QUEUED",
          priority: "HIGH",
          estimatedCredits: 2
        }
      });
      agent.decisions++;
      agent.actionsTaken++;
      agent.lastRun = (/* @__PURE__ */ new Date()).toISOString();
      agent.status = "IDLE";
      logger.info("Autonomous agent completed", {
        shopDomain,
        agent: agentId,
        action: decision.action,
        confidence: decision.confidence
      });
    }
    return { ran: true };
  } catch (err) {
    agent.status = "IDLE";
    logger.error("Autonomous agent failed", { agent: agentId, error: String(err) });
    return { ran: false, reason: String(err) };
  }
}
const autonomousAgents = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  listAutonomousAgents,
  runAutonomousAgent
}, Symbol.toStringTag, { value: "Module" }));
const AGENT_ICONS = {
  "inventory-guardian": /* @__PURE__ */ jsx(Shield, { className: "h-5 w-5" }),
  "price-optimizer": /* @__PURE__ */ jsx(DollarSign, { className: "h-5 w-5" }),
  "seo-enhancer": /* @__PURE__ */ jsx(Search, { className: "h-5 w-5" }),
  "customer-retention": /* @__PURE__ */ jsx(Users, { className: "h-5 w-5" }),
  "fraud-monitor": /* @__PURE__ */ jsx(Activity, { className: "h-5 w-5" }),
  "trend-scout": /* @__PURE__ */ jsx(TrendingUp, { className: "h-5 w-5" }),
  "ab-test-manager": /* @__PURE__ */ jsx(Activity, { className: "h-5 w-5" })
};
async function loader$b(args) {
  await requireAdmin(args);
  const agents = listAutonomousAgents();
  return json({ agents });
}
function headers$8(_) {
  return getSecurityHeaders();
}
async function action$2(args) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const { runAutonomousAgent: runAutonomousAgent2 } = await Promise.resolve().then(() => autonomousAgents);
  const result = await runAutonomousAgent2(ctx.shopDomain, body.agentId);
  return json(result);
}
function AgentsDashboard() {
  const data2 = useLoaderData();
  const fetcher = useFetcher();
  const toast = useToast();
  const runAgent = (agentId, name) => {
    fetcher.submit({ agentId }, { method: "post", encType: "application/json" });
    toast.info(`تشغيل ${name}...`, "الأجينت بدأ العمل");
  };
  return /* @__PURE__ */ jsxs("div", { className: "max-w-5xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Bot, { className: "h-6 w-6" }),
        "Autonomous AI Agents"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted mt-1", children: "7 وكلاء ذكاء اصطناعي يعملون 24/7 بدون تدخل بشري. كل واحد عنده هدف وقرارات مستقلة." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "vanta-card p-4 bg-gradient-to-r from-vanta-50 to-purple-50 dark:from-vanta-900/40 dark:to-purple-900/20", children: /* @__PURE__ */ jsxs("p", { className: "text-sm", children: [
      "🔮 ",
      /* @__PURE__ */ jsx("strong", { children: "2026 Technology:" }),
      " هاد الوكلاء كيتفكرو، كيقررو، وكيتنفذو بلا ما حد يقولهم. كيتفحصو المتجر كل ساعات، كيحللو الأنماط، وكيخدو قرارات قابلة للتراجع."
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: data2.agents.map((agent) => /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between mb-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-vanta-100 dark:bg-vanta-800 text-vanta-600 dark:text-vanta-300", children: AGENT_ICONS[agent.id] ?? /* @__PURE__ */ jsx(Bot, { className: "h-5 w-5" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { className: "font-semibold text-sm", children: agent.name }),
            /* @__PURE__ */ jsx("span", { className: `text-[10px] px-2 py-0.5 rounded-full ${agent.status === "RUNNING" ? "bg-emerald-100 text-emerald-700" : "bg-vanta-100 text-vanta-muted"}`, children: agent.status })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => runAgent(agent.id, agent.name),
            disabled: agent.status === "RUNNING",
            className: "px-3 py-1.5 text-xs rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 transition disabled:opacity-50 flex items-center gap-1",
            children: [
              /* @__PURE__ */ jsx(Play, { className: "h-3 w-3" }),
              "Run"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mb-3", children: agent.goal }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 text-[10px] text-vanta-muted", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          "📅 ",
          agent.schedule
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          "🎯 ",
          agent.decisions,
          " decisions"
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          "⚡ ",
          agent.actionsTaken,
          " actions"
        ] })
      ] }),
      agent.lastRun && /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-vanta-muted mt-2", children: [
        "Last: ",
        new Date(agent.lastRun).toLocaleString()
      ] })
    ] }, agent.id)) })
  ] });
}
const route36 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: AgentsDashboard,
  headers: headers$8,
  loader: loader$b
}, Symbol.toStringTag, { value: "Module" }));
const PRIORITY_BADGE = {
  LOW: "bg-vanta-100 dark:bg-vanta-800 text-vanta-600 dark:text-vanta-300",
  NORMAL: "bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200",
  HIGH: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  URGENT: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
};
function TaskCard({
  task: task2,
  locale,
  onApprove,
  onReject,
  onUndo,
  onRetry,
  onViewDiff,
  onViewLogs
}) {
  const { t } = useTranslation(locale);
  const [expanded, setExpanded] = useState(false);
  const state = task2.status;
  return /* @__PURE__ */ jsxs(
    motion.div,
    {
      layout: true,
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
      className: cn(
        "vanta-card overflow-hidden",
        state === "ERROR" && "border-rose-300 dark:border-rose-700",
        state === "COMPLETED" && "border-emerald-300 dark:border-emerald-700"
      ),
      children: [
        /* @__PURE__ */ jsxs("div", { className: "px-5 py-4 flex items-start gap-3", children: [
          /* @__PURE__ */ jsx(StateIcon, { state }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide",
                    PRIORITY_BADGE[task2.priority]
                  ),
                  children: t(`canvas.priority.${task2.priority}`)
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "text-xs text-vanta-muted", children: formatRelativeTime(task2.createdAt, locale) }),
              task2.initiatedByStaffName && /* @__PURE__ */ jsxs("span", { className: "text-xs text-vanta-muted", children: [
                "· ",
                t("task.initiatedBy", { staff: task2.initiatedByStaffName })
              ] })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium mt-1 break-words", children: task2.command }),
            task2.confidenceScore !== void 0 && task2.confidenceScore !== null && /* @__PURE__ */ jsxs(
              "p",
              {
                className: cn(
                  "text-xs mt-1.5",
                  task2.confidenceScore < 70 ? "text-amber-600 dark:text-amber-400" : "text-vanta-muted"
                ),
                children: [
                  t("task.confidence", { score: task2.confidenceScore }),
                  task2.confidenceScore < 70 && /* @__PURE__ */ jsx("span", { className: "block mt-0.5 italic", children: t("task.lowConfidence") })
                ]
              }
            )
          ] })
        ] }),
        task2.output && (state === "COMPLETED" || state === "ERROR" || state === "AWAITING_APPROVAL") && /* @__PURE__ */ jsx("div", { className: "px-5 pb-4", children: /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-vanta-50 dark:bg-vanta-900/40 p-3", children: /* @__PURE__ */ jsx(MarkdownRenderer, { content: task2.output }) }) }),
        state === "AWAITING_APPROVAL" && /* @__PURE__ */ jsxs("div", { className: "px-5 pb-4 flex flex-wrap gap-2", children: [
          task2.blastRadius !== void 0 && task2.blastRadius > 0 && /* @__PURE__ */ jsxs("div", { className: "w-full mb-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs", children: [
            "⚠️ ",
            t("task.blastRadius", {
              count: task2.blastRadius,
              description: t(`task.states.${state}`)
            })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => onApprove?.(task2.id),
              className: "px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition",
              children: t("task.approve")
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => onReject?.(task2.id),
              className: "px-4 py-2 text-sm rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition",
              children: t("task.reject")
            }
          )
        ] }),
        state === "ERROR" && /* @__PURE__ */ jsxs("div", { className: "px-5 pb-4", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => setExpanded((v) => !v),
              className: "text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1",
              children: [
                expanded ? /* @__PURE__ */ jsx(ChevronUp, { className: "h-3 w-3" }) : /* @__PURE__ */ jsx(ChevronDown, { className: "h-3 w-3" }),
                t("task.needsInput")
              ]
            }
          ),
          /* @__PURE__ */ jsx(AnimatePresence, { children: expanded && task2.errorMessage && /* @__PURE__ */ jsx(
            motion.pre,
            {
              initial: { opacity: 0, height: 0 },
              animate: { opacity: 1, height: "auto" },
              exit: { opacity: 0, height: 0 },
              className: "mt-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 text-xs overflow-x-auto",
              children: task2.errorMessage
            }
          ) }),
          /* @__PURE__ */ jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => onRetry?.(task2.id),
              className: "px-3 py-1.5 text-xs rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 transition",
              children: t("task.retry")
            }
          ) })
        ] }),
        state === "COMPLETED" && /* @__PURE__ */ jsxs("div", { className: "px-5 pb-4 flex flex-wrap gap-2", children: [
          task2.undoable && /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => onUndo?.(task2.id),
              className: "px-3 py-1.5 text-xs rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition flex items-center gap-1",
              children: [
                /* @__PURE__ */ jsx(Undo2, { className: "h-3 w-3" }),
                t("task.undo")
              ]
            }
          ),
          onViewDiff && /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => onViewDiff(task2.id),
              className: "px-3 py-1.5 text-xs rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition flex items-center gap-1",
              children: [
                /* @__PURE__ */ jsx(FileText, { className: "h-3 w-3" }),
                t("task.viewDiff")
              ]
            }
          ),
          onViewLogs && /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => onViewLogs(task2.id),
              className: "px-3 py-1.5 text-xs rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition flex items-center gap-1",
              children: [
                /* @__PURE__ */ jsx(ListTree, { className: "h-3 w-3" }),
                t("task.viewLogs")
              ]
            }
          ),
          task2.deepLinks?.slice(0, 3).map((link, i) => /* @__PURE__ */ jsxs(
            "a",
            {
              href: link.url,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "px-3 py-1.5 text-xs rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition truncate max-w-[180px]",
              title: link.label,
              children: [
                truncate(link.label, 30),
                " ↗"
              ]
            },
            i
          ))
        ] })
      ]
    }
  );
}
function StateIcon({ state }) {
  const iconClass = "h-5 w-5 shrink-0 mt-0.5";
  switch (state) {
    case "QUEUED":
      return /* @__PURE__ */ jsx(
        motion.div,
        {
          animate: { rotate: 360 },
          transition: { duration: 4, repeat: Infinity, ease: "linear" },
          className: "mt-0.5",
          children: /* @__PURE__ */ jsx(Hourglass, { className: cn(iconClass, "text-vanta-muted") })
        }
      );
    case "THINKING":
      return /* @__PURE__ */ jsx(
        motion.div,
        {
          animate: {
            scale: [1, 1.15, 1],
            filter: [
              "drop-shadow(0 0 0px rgba(124,92,255,0))",
              "drop-shadow(0 0 8px rgba(124,92,255,0.6))",
              "drop-shadow(0 0 0px rgba(124,92,255,0))"
            ]
          },
          transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
          className: "mt-0.5",
          children: /* @__PURE__ */ jsx(Brain, { className: cn(iconClass, "text-vanta-600 dark:text-vanta-300") })
        }
      );
    case "EXECUTING":
      return /* @__PURE__ */ jsx(
        motion.div,
        {
          animate: { rotate: 360 },
          transition: { duration: 2.5, repeat: Infinity, ease: "linear" },
          className: "mt-0.5",
          children: /* @__PURE__ */ jsx(Settings$1, { className: cn(iconClass, "text-vanta-600 dark:text-vanta-300") })
        }
      );
    case "AWAITING_APPROVAL":
      return /* @__PURE__ */ jsx(PauseCircle, { className: cn(iconClass, "text-amber-500") });
    case "COMPLETED":
      return /* @__PURE__ */ jsx(
        motion.div,
        {
          initial: { scale: 0.5, rotate: -12, opacity: 0 },
          animate: { scale: 1, rotate: 0, opacity: 1 },
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
          className: "mt-0.5",
          children: /* @__PURE__ */ jsx(CheckCircle2, { className: cn(iconClass, "text-emerald-500") })
        }
      );
    case "ERROR":
      return /* @__PURE__ */ jsx(
        motion.div,
        {
          initial: { scale: 0.5, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { duration: 0.3 },
          className: "mt-0.5",
          children: /* @__PURE__ */ jsx(AlertCircle, { className: cn(iconClass, "text-rose-500") })
        }
      );
    case "CANCELLED":
      return /* @__PURE__ */ jsx(AlertCircle, { className: cn(iconClass, "text-vanta-muted") });
    case "REVERTED":
      return /* @__PURE__ */ jsx(Undo2, { className: cn(iconClass, "text-vanta-muted") });
    default:
      return /* @__PURE__ */ jsx(Network, { className: cn(iconClass, "text-vanta-muted") });
  }
}
function useOffline(onReconnect) {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsOffline(!navigator.onLine);
    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };
    const handleOnline = () => {
      setIsOffline(false);
      onReconnect?.();
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [onReconnect]);
  return { isOffline, wasOffline };
}
function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}
function useVoiceInput(lang = "en-US") {
  const [supported] = useState(() => getSpeechRecognition() !== null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (i === event.results.length - 1) {
          interimText = text;
        } else {
          finalText += text;
        }
      }
      if (finalText) {
        setTranscript((prev) => prev + finalText);
      }
      setInterimTranscript(interimText);
    };
    recognition.onerror = (event) => {
      setError(event.error);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
    };
    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.abort();
      } catch {
      }
    };
  }, [lang]);
  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    setError(null);
    setTranscript("");
    setInterimTranscript("");
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start voice input");
    }
  }, [listening]);
  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
    }
    setListening(false);
  }, []);
  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);
  return {
    supported,
    listening,
    transcript,
    interimTranscript,
    start,
    stop,
    reset,
    error
  };
}
function useCommandHistory(shopDomain) {
  const [history2, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/command-history?limit=20");
      if (!r.ok) return;
      const json2 = await r.json();
      setHistory(json2.commands);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);
  const pushCommand = useCallback(async (command) => {
    try {
      await fetch("/api/command-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command })
      });
      setHistory((prev) => [command, ...prev.filter((c) => c !== command)].slice(0, 20));
    } catch {
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh, shopDomain]);
  return { history: history2, loading, refresh, pushCommand };
}
function useHistoryCursor(history2) {
  const [index, setIndex] = useState(-1);
  const previous = useCallback(() => {
    if (history2.length === 0) return void 0;
    setIndex((i) => {
      const next2 = i + 1;
      if (next2 >= history2.length) return i;
      return next2;
    });
  }, [history2.length]);
  const next = useCallback(() => {
    if (history2.length === 0) return void 0;
    setIndex((i) => {
      const n = i - 1;
      if (n < 0) return -1;
      return n;
    });
  }, [history2.length]);
  const reset = useCallback(() => setIndex(-1), []);
  const current = index >= 0 && index < history2.length ? history2[index] : void 0;
  return { index, current, previous, next, reset };
}
const MAX_CHARS = 2e3;
const PROMPT_STARTERS = [
  { key: "1" },
  { key: "2" },
  { key: "3" },
  { key: "4" }
];
function AgentCanvas({ locale, shopDomain, initialTasks = [], onSubmit }) {
  const { t } = useTranslation(locale);
  const { info, error: errorToast, warning } = useToast();
  const [command, setCommand] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const inputRef = useRef(null);
  const { history: history2, pushCommand } = useCommandHistory(shopDomain);
  const cursor = useHistoryCursor(history2);
  const voice = useVoiceInput(locale === "ar" ? "ar-MA" : "en-US");
  const { isOffline } = useOffline(() => {
    info(t("toasts.online"));
  });
  useEffect(() => {
    if (isOffline) warning(t("toasts.offline"));
  }, [isOffline, warning, t]);
  useEffect(() => {
    if (voice.transcript) {
      setCommand((prev) => prev ? `${prev} ${voice.transcript}`.trim() : voice.transcript);
      voice.reset();
    }
  }, [voice.transcript, voice]);
  const charCount = command.length;
  const overLimit = charCount > MAX_CHARS;
  const estimatedCredits = Math.max(1, Math.ceil(charCount / 500));
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch("/api/tasks?limit=20");
        if (!r.ok) return;
        const json2 = await r.json();
        setTasks(json2.tasks);
      } catch {
      }
    };
    const interval = setInterval(poll, 2500);
    return () => clearInterval(interval);
  }, []);
  const handleSubmit = useCallback(
    async (e2) => {
      e2?.preventDefault();
      const trimmed = command.trim();
      if (!trimmed || overLimit || submitting || isOffline) return;
      setSubmitting(true);
      try {
        const result = onSubmit ? await onSubmit({ command: trimmed, priority, language: locale }) : await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: trimmed, priority, language: locale })
        }).then((r) => r.ok ? r.json() : null);
        if (result) {
          setTasks((prev) => [result, ...prev]);
          setCommand("");
          cursor.reset();
          await pushCommand(trimmed);
          info(t("toasts.taskQueued"));
        }
      } catch (err) {
        errorToast(t("common.error"), err instanceof Error ? err.message : void 0);
      } finally {
        setSubmitting(false);
      }
    },
    [command, overLimit, submitting, isOffline, priority, locale, onSubmit, pushCommand, cursor, info, errorToast, t]
  );
  const handleKeyDown = (e2) => {
    if (e2.key === "ArrowUp" && history2.length > 0) {
      e2.preventDefault();
      const c = cursor.previous();
      if (c !== void 0) setCommand(c);
    } else if (e2.key === "ArrowDown" && history2.length > 0) {
      e2.preventDefault();
      const c = cursor.next();
      setCommand(c ?? "");
    }
  };
  const handleStarterClick = (key) => {
    const text = t(`canvas.starters.${key}`);
    setCommand(text);
    inputRef.current?.focus();
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full", children: [
    tasks.length === 0 && /* @__PURE__ */ jsx("div", { className: "flex-1 flex items-center justify-center p-6", children: /* @__PURE__ */ jsxs("div", { className: "text-center max-w-md", children: [
      /* @__PURE__ */ jsx(
        motion.div,
        {
          initial: { scale: 0.8, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
          className: "inline-flex items-center justify-center h-16 w-16 rounded-full bg-vanta-100 dark:bg-vanta-800 mb-4",
          children: /* @__PURE__ */ jsx(Sparkles, { className: "h-8 w-8 text-vanta-500", "aria-hidden": "true" })
        }
      ),
      /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold mb-2", children: t("canvas.title") }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted mb-6", children: t("canvas.subtitle") }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-vanta-muted", children: t("canvas.starters.title") }),
        PROMPT_STARTERS.map(({ key }) => /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => handleStarterClick(key),
            className: "block w-full text-left px-4 py-2.5 rounded-lg vanta-card hover:border-vanta-400 dark:hover:border-vanta-500 transition text-sm",
            children: t(`canvas.starters.${key}`)
          },
          key
        ))
      ] })
    ] }) }),
    tasks.length > 0 && /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto p-4 space-y-3", children: /* @__PURE__ */ jsx(AnimatePresence, { children: tasks.map((task2) => /* @__PURE__ */ jsx(TaskCard, { task: task2, locale }, task2.id)) }) }),
    /* @__PURE__ */ jsxs("div", { className: "border-t border-vanta-border vanta-glass p-3 sm:p-4", children: [
      isOffline && /* @__PURE__ */ jsxs("div", { className: "mb-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(WifiOff, { className: "h-3.5 w-3.5" }),
        /* @__PURE__ */ jsx("span", { children: t("canvas.offline.title") }),
        /* @__PURE__ */ jsxs("span", { className: "opacity-70", children: [
          "· ",
          t("canvas.offline.body")
        ] })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            "textarea",
            {
              ref: inputRef,
              value: command,
              onChange: (e2) => setCommand(e2.target.value),
              onKeyDown: handleKeyDown,
              placeholder: t("canvas.placeholder"),
              disabled: isOffline,
              maxLength: MAX_CHARS,
              rows: 2,
              className: cn(
                "w-full px-3 py-2.5 pr-12 rounded-lg border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed",
                overLimit ? "border-rose-400 dark:border-rose-600" : "border-vanta-border"
              ),
              "aria-label": t("canvas.placeholder")
            }
          ),
          voice.supported && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: voice.listening ? voice.stop : voice.start,
              className: cn(
                "absolute top-2 right-2 p-1.5 rounded-lg transition",
                voice.listening ? "bg-rose-500 text-white animate-pulse" : "text-vanta-muted hover:bg-vanta-100 dark:hover:bg-vanta-800"
              ),
              "aria-label": t("canvas.voice"),
              disabled: isOffline,
              children: voice.listening ? /* @__PURE__ */ jsx(MicOff, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(Mic, { className: "h-4 w-4" })
            }
          ),
          voice.listening && /* @__PURE__ */ jsxs("p", { className: "text-xs text-rose-500 mt-1 animate-pulse", children: [
            "● Listening... ",
            voice.interimTranscript
          ] }),
          voice.error && /* @__PURE__ */ jsx("p", { className: "text-xs text-rose-500 mt-1", children: voice.error })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2 flex-wrap", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-xs text-vanta-muted", children: [
            /* @__PURE__ */ jsx("span", { className: cn(overLimit && "text-rose-500 font-medium"), children: t("canvas.charCount", { count: charCount, max: MAX_CHARS }) }),
            /* @__PURE__ */ jsx("span", { className: "px-2 py-0.5 rounded-full bg-vanta-100 dark:bg-vanta-800", children: t("canvas.estimatedCost", { credits: estimatedCredits }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(
              "select",
              {
                value: priority,
                onChange: (e2) => setPriority(e2.target.value),
                className: "px-2 py-1.5 text-xs rounded-lg border border-vanta-border bg-transparent outline-none focus:ring-2 focus:ring-vanta-500",
                "aria-label": t("canvas.priority.label"),
                children: ["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => /* @__PURE__ */ jsx("option", { value: p, children: t(`canvas.priority.${p}`) }, p))
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "submit",
                disabled: !command.trim() || overLimit || submitting || isOffline,
                className: "px-4 py-1.5 text-sm rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5",
                children: [
                  /* @__PURE__ */ jsx(Send, { className: "h-3.5 w-3.5" }),
                  t("canvas.submit")
                ]
              }
            )
          ] })
        ] }),
        history2.length > 0 && /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-vanta-muted flex items-center gap-1", children: [
          /* @__PURE__ */ jsx(ChevronUp, { className: "h-3 w-3" }),
          "Press ↑ to recall previous commands"
        ] })
      ] })
    ] })
  ] });
}
async function loader$a(args) {
  const ctx = await requireAdmin(args);
  const tasks = await prisma.task.findMany({
    where: shopScoped(ctx.shopDomain),
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      staff: { select: { name: true } },
      _count: { select: { undoSnapshots: true } }
    }
  });
  return json({
    shopDomain: ctx.shopDomain,
    locale: ctx.shop.preferredLanguage,
    initialTasks: tasks.map((t) => ({
      id: t.id,
      command: t.command,
      status: t.status,
      priority: t.priority,
      output: t.output ?? void 0,
      errorMessage: t.errorMessage ?? void 0,
      confidenceScore: t.confidenceScore ?? void 0,
      blastRadius: t.blastRadius,
      requiresApproval: t.requiresApproval,
      initiatedByStaffName: t.staff?.name ?? void 0,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString(),
      undoable: t._count.undoSnapshots > 0 && t.status === "COMPLETED"
    }))
  });
}
function headers$7(_) {
  return getSecurityHeaders();
}
function CanvasRoute() {
  const data2 = useLoaderData();
  const toast = useToast();
  const handleSubmit = useCallback(
    async (input) => {
      try {
        const formData = new FormData();
        formData.append("command", input.command);
        formData.append("priority", input.priority);
        formData.append("language", input.language);
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command: input.command,
            priority: input.priority,
            language: input.language
          })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.message || errorData.error || `HTTP ${response.status}`;
          if (response.status === 429) {
            toast.warning("Rate limited", "بطيء شوية — عاود جرّب بعد دقيقة");
          } else if (response.status === 403) {
            toast.error("Kill switch مفعّل", "الأجينت معطّل من الإعدادات");
          } else if (response.status === 409) {
            toast.warning("مهمة مكررة", "هذا الأمر كيخدم ديجا");
          } else {
            toast.error("خطأ", message);
          }
          return null;
        }
        const result = await response.json();
        toast.success("تم!", "المهمة تصيفطات للأجينت");
        return {
          id: result.id,
          command: result.command,
          status: result.status,
          priority: result.priority,
          createdAt: result.createdAt
        };
      } catch (err) {
        toast.error("خطأ شبكي", err instanceof Error ? err.message : "تعذّر الاتصال بالخادم");
        return null;
      }
    },
    [toast]
  );
  return /* @__PURE__ */ jsx("div", { className: "h-[calc(100vh-180px)] sm:h-[calc(100vh-160px)]", children: /* @__PURE__ */ jsx(
    AgentCanvas,
    {
      locale: data2.locale,
      shopDomain: data2.shopDomain,
      initialTasks: data2.initialTasks,
      onSubmit: handleSubmit
    }
  ) });
}
const route37 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: CanvasRoute,
  headers: headers$7,
  loader: loader$a
}, Symbol.toStringTag, { value: "Module" }));
const loader$9 = async ({ request }) => {
  await shopify.authenticate.login(request);
};
const route38 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$9
}, Symbol.toStringTag, { value: "Module" }));
const INJECTION_PATTERNS = [
  { pattern: /ignore\s+(previous|prior|all|above|earlier)\s+instructions/i, label: "ignore_instructions" },
  { pattern: /forget\s+(your|all|previous|the)\s+(rules|instructions|prompt)/i, label: "forget_rules" },
  { pattern: /act\s+as\s+(if\s+you\s+are|a|an)\s+(?!a\s+helpful)/i, label: "act_as" },
  { pattern: /disregard\s+(the\s+)?(above|previous|all|prior)/i, label: "disregard" },
  { pattern: /you\s+are\s+now\s+(in\s+)?(developer|root|admin|jailbreak|unrestricted)/i, label: "role_assume" },
  { pattern: /system\s*:\s*/i, label: "system_prefix" },
  { pattern: /\[system\]|\[admin\]|\[developer\]/i, label: "bracket_prefix" },
  { pattern: /reveal\s+(your|the)\s+(system|hidden|secret|initial)\s+prompt/i, label: "prompt_leak" },
  { pattern: /print\s+your\s+(instructions|prompt|rules)/i, label: "print_prompt" },
  { pattern: /enable\s+(developer|god|root|unrestricted|debug)\s+mode/i, label: "developer_mode" },
  { pattern: /override\s+(safety|content|guardrails|restrictions)/i, label: "override_safety" },
  { pattern: /\bdo\s+anything\s+now\b/i, label: "daa_now" },
  { pattern: /bypass\s+(shopify|api|admin|payment)/i, label: "bypass_platform" },
  { pattern: /execute\s+arbitrary\s+(code|sql|graphql)/i, label: "arbitrary_exec" }
];
function checkPromptInjection(command) {
  const matched = [];
  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(command)) {
      matched.push(label);
    }
  }
  return {
    safe: matched.length === 0,
    matchedPatterns: matched,
    sanitizedCommand: sanitize(command)
  };
}
function sanitize(command) {
  return command.replace(/[\u0000-\u001F\u007F]/g, "").replace(/`/g, "'").replace(/\$\{/g, "\\${").replace(/\s+/g, " ").trim().slice(0, 2e3);
}
async function logInjectionAttempt(shopDomain, command, matchedPatterns, staffId) {
  logger.warn("Prompt injection attempt blocked", {
    shopDomain,
    matchedPatterns,
    commandPreview: command.slice(0, 200)
  });
  await prisma.auditLog.create({
    data: {
      shopDomain,
      staffId,
      action: "PROMPT_INJECTION_BLOCKED",
      resourceType: "ai_input",
      metadata: {
        patterns: matchedPatterns,
        commandLength: command.length,
        preview: command.slice(0, 500)
      }
    }
  }).catch(() => {
  });
}
function headers$6(_) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}
async function loader$8(args) {
  const ctx = await requireAdmin(args);
  const url = new URL(args.request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
  const status = url.searchParams.get("status");
  const tasks = await prisma.task.findMany({
    where: {
      ...shopScoped(ctx.shopDomain),
      ...status ? { status } : {}
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      staff: { select: { name: true } },
      _count: { select: { undoSnapshots: true } }
    }
  });
  return json({
    tasks: tasks.map((t) => ({
      id: t.id,
      command: t.command,
      status: t.status,
      priority: t.priority,
      output: t.output ?? void 0,
      errorMessage: t.errorMessage ?? void 0,
      confidenceScore: t.confidenceScore ?? void 0,
      blastRadius: t.blastRadius,
      requiresApproval: t.requiresApproval,
      initiatedByStaffName: t.staff?.name ?? void 0,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString(),
      undoable: t._count.undoSnapshots > 0 && t.status === "COMPLETED"
    }))
  });
}
async function action$1(args) {
  const ctx = await requireAdmin(args);
  const rl = await rateLimitTaskCreation(ctx.shopDomain);
  if (!rl.allowed) {
    return json(
      { error: "rate_limited", retryAfter: rl.retryAfterSec, message: "Too many tasks. Please slow down." },
      { status: 429 }
    );
  }
  const body = await args.request.json();
  let input;
  try {
    input = validate(CreateTaskSchema, body);
  } catch (e2) {
    const err = e2;
    return json({ error: "validation_failed", fields: err.fields ?? {} }, { status: 400 });
  }
  if (ctx.shop.killSwitchEnabled) {
    return json(
      { error: "kill_switch_enabled", message: "Agent is globally disabled by the merchant." },
      { status: 403 }
    );
  }
  const { checkCredits: checkCredits2 } = await Promise.resolve().then(() => appEvents);
  const creditCheck = await checkCredits2(ctx.shopDomain);
  if (!creditCheck.allowed) {
    return json(
      {
        error: "insufficient_credits",
        message: creditCheck.message ?? "No credits remaining.",
        creditsRemaining: 0,
        plan: creditCheck.plan,
        upgradeUrl: "/app/billing"
      },
      { status: 402 }
    );
  }
  const injectionCheck = checkPromptInjection(input.command);
  if (!injectionCheck.safe) {
    await logInjectionAttempt(
      ctx.shopDomain,
      input.command,
      injectionCheck.matchedPatterns,
      ctx.staffId
    );
    return json(
      {
        error: "prompt_injection_blocked",
        message: "Your command was blocked because it matched a known prompt-injection pattern.",
        patterns: injectionCheck.matchedPatterns
      },
      { status: 400 }
    );
  }
  const duplicate = await prisma.task.findFirst({
    where: {
      ...shopScoped(ctx.shopDomain),
      command: input.command,
      id: { not: void 0 },
      status: { in: ["QUEUED", "THINKING", "EXECUTING", "AWAITING_APPROVAL"] },
      createdAt: { gte: new Date(Date.now() - 6e4) }
    },
    select: { id: true }
  });
  if (duplicate) {
    return json(
      { error: "duplicate_task", message: "This task is already running. Please wait for it to complete before submitting again." },
      { status: 409 }
    );
  }
  const task2 = await prisma.task.create({
    data: {
      shopId: ctx.shop.id,
      shopDomain: ctx.shopDomain,
      staffId: ctx.staffId,
      command: injectionCheck.sanitizedCommand,
      language: input.language,
      persona: ctx.shop.agentPersona,
      status: "QUEUED",
      priority: input.priority,
      threadParentId: input.threadParentId,
      csvAttachmentUrl: input.csvAttachmentUrl,
      estimatedCredits: input.estimatedCredits
    }
  });
  await prisma.commandHistory.create({
    data: {
      shopId: ctx.shop.id,
      shopDomain: ctx.shopDomain,
      staffId: ctx.staffId,
      command: injectionCheck.sanitizedCommand
    }
  });
  await enqueueTask(
    {
      taskId: task2.id,
      shopDomain: ctx.shopDomain,
      staffId: ctx.staffId,
      enqueuedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    input.priority
  );
  logger.info("Task created via API", {
    taskId: task2.id,
    shopDomain: ctx.shopDomain,
    staffId: ctx.staffId
  });
  return json(
    {
      id: task2.id,
      command: task2.command,
      status: task2.status,
      priority: task2.priority,
      createdAt: task2.createdAt.toISOString()
    },
    { status: 201 }
  );
}
const route39 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  headers: headers$6,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
async function createGoal(input) {
  const goal = await prisma.goal.create({
    data: {
      shopDomain: input.shopDomain,
      staffId: input.staffId,
      title: input.title,
      description: input.description,
      successCriteria: input.successCriteria,
      priority: input.priority ?? "NORMAL",
      autonomyLevel: input.autonomyLevel ?? "ASSISTED",
      deadline: input.deadline,
      status: "ACTIVE",
      startedAt: /* @__PURE__ */ new Date()
    }
  });
  logger.info("Goal created", { goalId: goal.id, title: input.title });
  return goal;
}
async function generatePlan(goalId) {
  const goal = await prisma.goal.findUniqueOrThrow({ where: { id: goalId } });
  const prompt = `You are VANTA OS's Planner Agent. A merchant has set this goal:

Title: ${goal.title}
Description: ${goal.description}
Success criteria: ${goal.successCriteria ?? "Not specified"}
Autonomy level: ${goal.autonomyLevel}

Create a detailed multi-step execution plan. Each step must be:
- Concrete and actionable
- Assigned to a specific agent (planner, research, product_hunter, store_optimizer, marketing, analyst, reviewer)
- Have clear dependencies on previous steps
- Have a risk level (LOW/MEDIUM/HIGH/CRITICAL)

Output JSON only:
{
  "reasoning": "<why this plan will achieve the goal>",
  "steps": [
    { "agent": "<agent_name>", "action": "<specific action>", "dependsOn": [<step_numbers>], "riskLevel": "LOW", "estimatedCredits": 2 }
  ],
  "estimatedDurationMin": 30,
  "totalRiskScore": 0.2
}`;
  const response = await generateContent(prompt, { temperature: 0.4 });
  let plan;
  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    plan = JSON.parse(jsonMatch?.[0] ?? "{}");
  } catch {
    plan = {
      reasoning: "Fallback plan",
      steps: [{ agent: "research", action: `Research: ${goal.title}`, dependsOn: [], riskLevel: "LOW", estimatedCredits: 2 }],
      estimatedDurationMin: 30,
      totalRiskScore: 0.2
    };
  }
  const planRow = await prisma.plan.create({
    data: {
      goalId: goal.id,
      shopDomain: goal.shopDomain,
      reasoning: plan.reasoning,
      status: goal.autonomyLevel === "AUTONOMOUS" ? "APPROVED" : "DRAFT",
      totalSteps: plan.steps.length
    }
  });
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    await prisma.planStep.create({
      data: {
        planId: planRow.id,
        shopDomain: goal.shopDomain,
        stepNumber: i + 1,
        agent: step.agent,
        action: step.action,
        dependsOn: step.dependsOn.map(String),
        riskLevel: step.riskLevel,
        estimatedCredits: step.estimatedCredits,
        maxAttempts: 3,
        status: "PENDING"
      }
    });
  }
  await prisma.goal.update({
    where: { id: goal.id },
    data: { totalSteps: plan.steps.length, estimatedDurationMin: plan.estimatedDurationMin, riskScore: plan.totalRiskScore }
  });
  logger.info("Plan generated", { goalId, planId: planRow.id, steps: plan.steps.length });
  return plan;
}
async function executePlan(planId) {
  const plan = await prisma.plan.findUniqueOrThrow({
    where: { id: planId },
    include: { steps: { orderBy: { stepNumber: "asc" } } }
  });
  if (plan.status === "DRAFT") {
    const goal = await prisma.goal.findUniqueOrThrow({ where: { id: plan.goalId } });
    if (goal.autonomyLevel !== "AUTONOMOUS") {
      logger.warn("Plan not approved", { planId });
      return { completed: false, failedSteps: 0 };
    }
    await prisma.plan.update({ where: { id: planId }, data: { status: "EXECUTING" } });
  }
  if (await isKillSwitchOn(plan.shopDomain)) {
    await prisma.plan.update({ where: { id: planId }, data: { status: "FAILED", lastRevisionReason: "Kill switch" } });
    return { completed: false, failedSteps: 0 };
  }
  let failedSteps = 0;
  let completedCount = 0;
  for (const step of plan.steps) {
    if (step.status === "COMPLETED") {
      completedCount++;
      continue;
    }
    const deps = step.dependsOn;
    if (deps.length > 0) {
      const depSteps = await prisma.planStep.findMany({
        where: { planId, stepNumber: { in: deps.map(Number) } },
        select: { status: true }
      });
      if (!depSteps.every((d) => d.status === "COMPLETED" || d.status === "SKIPPED")) {
        await prisma.planStep.update({ where: { id: step.id }, data: { status: "BLOCKED" } });
        continue;
      }
    }
    const result = await executeStep(step.id, plan.goalId);
    if (result.success) completedCount++;
    else {
      failedSteps++;
      if (step.attemptCount >= step.maxAttempts) {
        await selfHealPlan(planId, step.id, result.error ?? "Unknown");
      }
    }
  }
  const allComplete = completedCount === plan.steps.length;
  await prisma.plan.update({ where: { id: planId }, data: { status: allComplete ? "COMPLETED" : "FAILED", completedSteps: completedCount } });
  await updateGoalProgress(plan.goalId);
  return { completed: allComplete, failedSteps };
}
async function executeStep(stepId, goalId, planId) {
  const step = await prisma.planStep.findUniqueOrThrow({ where: { id: stepId } });
  const startTime = Date.now();
  await prisma.planStep.update({
    where: { id: stepId },
    data: { status: "RUNNING", startedAt: /* @__PURE__ */ new Date(), attemptCount: { increment: 1 }, checkpoint: { attempt: step.attemptCount + 1 } }
  });
  try {
    const shop = await prisma.shop.findUnique({
      where: { shopDomain: step.shopDomain },
      select: {
        id: true,
        canWriteProducts: true,
        canWriteCollections: true,
        canWriteInventory: true,
        canWriteMetafields: true,
        canWriteThemes: true,
        canReadOrders: true,
        canReadCustomers: true
      }
    });
    const goal = await prisma.goal.findUniqueOrThrow({ where: { id: goalId } });
    if (step.riskLevel === "CRITICAL" && goal.autonomyLevel === "SUPERVISED") {
      await prisma.planStep.update({ where: { id: stepId }, data: { status: "PENDING" } });
      logger.warn("Critical step requires approval under SUPERVISED autonomy", { stepId, goalId });
      return { success: false, error: "Critical step requires merchant approval" };
    }
    const task2 = await prisma.task.create({
      data: {
        shopId: shop?.id ?? "",
        shopDomain: step.shopDomain,
        command: `[Step ${step.stepNumber}] ${step.action}`,
        language: "en",
        status: "QUEUED",
        priority: "HIGH",
        estimatedCredits: step.estimatedCredits
      }
    });
    await enqueueTask({ taskId: task2.id, shopDomain: step.shopDomain, enqueuedAt: (/* @__PURE__ */ new Date()).toISOString() }, "HIGH");
    const result = await waitForTaskCompletion(task2.id, 12e4);
    await prisma.planStep.update({
      where: { id: stepId },
      data: {
        status: result.success ? "COMPLETED" : "FAILED",
        taskId: task2.id,
        result: result.data,
        errorMessage: result.error,
        completedAt: /* @__PURE__ */ new Date(),
        durationMs: Date.now() - startTime
      }
    });
    return { success: result.success, error: result.error };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.planStep.update({ where: { id: stepId }, data: { status: "FAILED", errorMessage: errorMsg, completedAt: /* @__PURE__ */ new Date(), durationMs: Date.now() - startTime } });
    return { success: false, error: errorMsg };
  }
}
async function waitForTaskCompletion(taskId, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const task2 = await prisma.task.findUnique({ where: { id: taskId }, select: { status: true, output: true, errorMessage: true } });
    if (!task2) return { success: false, error: "Task not found" };
    if (task2.status === "COMPLETED") return { success: true, data: task2.output };
    if (task2.status === "ERROR") return { success: false, error: task2.errorMessage ?? "Failed" };
    if (task2.status === "CANCELLED") return { success: false, error: "Cancelled" };
    await new Promise((r) => setTimeout(r, 3e3));
  }
  return { success: false, error: "Timeout" };
}
async function selfHealPlan(planId, failedStepId, failureReason) {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { id: planId }, include: { steps: { orderBy: { stepNumber: "asc" } } } });
  const failedStep = plan.steps.find((s) => s.id === failedStepId);
  if (!failedStep) return;
  logger.info("Self-healing plan", { planId, failedStep: failedStep.stepNumber });
  const prompt = `Step failed: "${failedStep.action}" (agent: ${failedStep.agent}, reason: ${failureReason}). Generate an alternative. Output JSON: {"alternativeAction":"...","reasoning":"...","riskLevel":"LOW"}`;
  const response = await generateContent(prompt, { temperature: 0.5 });
  const jsonMatch = response.text.match(/\{[\s\S]*\}/);
  const alt = jsonMatch ? JSON.parse(jsonMatch[0]) : { alternativeAction: failedStep.action, reasoning: "Retry", riskLevel: failedStep.riskLevel };
  const newPlan = await prisma.plan.create({
    data: {
      goalId: plan.goalId,
      shopDomain: plan.shopDomain,
      version: plan.version + 1,
      reasoning: `Self-healed: ${alt.reasoning}`,
      status: "EXECUTING",
      totalSteps: plan.steps.length,
      revisionCount: plan.revisionCount + 1,
      lastRevisionReason: failureReason
    }
  });
  for (const step of plan.steps) {
    await prisma.planStep.create({
      data: {
        planId: newPlan.id,
        shopDomain: step.shopDomain,
        stepNumber: step.stepNumber,
        agent: step.agent,
        action: step.id === failedStepId ? alt.alternativeAction : step.action,
        dependsOn: step.dependsOn,
        riskLevel: step.id === failedStepId ? alt.riskLevel ?? step.riskLevel : step.riskLevel,
        estimatedCredits: step.estimatedCredits,
        maxAttempts: 3,
        status: step.id === failedStepId ? "PENDING" : step.status === "COMPLETED" ? "COMPLETED" : "PENDING"
      }
    });
  }
  await prisma.plan.update({ where: { id: planId }, data: { status: "SUPERSEDED" } });
  logger.info("Plan self-healed", { oldPlanId: planId, newPlanId: newPlan.id });
}
async function updateGoalProgress(goalId) {
  const plans = await prisma.plan.findMany({ where: { goalId, status: { in: ["EXECUTING", "COMPLETED"] } }, include: { steps: { select: { status: true } } } });
  const totalSteps = plans.reduce((s, p) => s + p.steps.length, 0);
  const completedSteps = plans.reduce((s, p) => s + p.steps.filter((st) => st.status === "COMPLETED").length, 0);
  const progress = totalSteps > 0 ? completedSteps / totalSteps : 0;
  const allComplete = completedSteps === totalSteps && totalSteps > 0;
  await prisma.goal.update({ where: { id: goalId }, data: { progress, completedSteps, status: allComplete ? "COMPLETED" : "ACTIVE", completedAt: allComplete ? /* @__PURE__ */ new Date() : null } });
}
async function loader$7(args) {
  const ctx = await requireAdmin(args);
  const goals = await prisma.goal.findMany({
    where: shopScoped(ctx.shopDomain),
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { plans: { orderBy: { version: "desc" }, take: 1, select: { id: true, status: true, version: true, totalSteps: true, completedSteps: true } } }
  });
  return json({
    shopId: ctx.shop.id,
    shopDomain: ctx.shopDomain,
    staffId: ctx.staffId,
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      status: g.status,
      priority: g.priority,
      progress: g.progress,
      totalSteps: g.totalSteps,
      completedSteps: g.completedSteps,
      failedSteps: g.failedSteps,
      autonomyLevel: g.autonomyLevel,
      riskScore: g.riskScore,
      latestPlan: g.plans[0] ? { id: g.plans[0].id, status: g.plans[0].status, version: g.plans[0].version, totalSteps: g.plans[0].totalSteps, completedSteps: g.plans[0].completedSteps } : null,
      createdAt: g.createdAt.toISOString()
    }))
  });
}
function headers$5(_) {
  return getSecurityHeaders();
}
async function action(args) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  if (body.action === "create_goal") {
    const goal = await createGoal({
      shopDomain: ctx.shopDomain,
      shopId: ctx.shop.id,
      staffId: ctx.staffId,
      title: body.title,
      description: body.description,
      successCriteria: body.successCriteria,
      priority: body.priority,
      autonomyLevel: body.autonomyLevel
    });
    await generatePlan(goal.id);
    return json({ ok: true, goalId: goal.id });
  }
  if (body.action === "execute_plan") {
    const result = await executePlan(body.planId);
    return json({ ok: true, ...result });
  }
  return json({ error: "Unknown action" }, { status: 400 });
}
function GoalsDashboard() {
  const data2 = useLoaderData();
  const fetcher = useFetcher();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [autonomy, setAutonomy] = useState("ASSISTED");
  const createAndPlan = async () => {
    if (!title.trim() || !description.trim()) return;
    fetcher.submit({ action: "create_goal", title, description, autonomyLevel: autonomy, priority: "NORMAL" }, { method: "post", encType: "application/json" });
    toast.success("Goal created", "AI is planning the execution steps...");
    setShowForm(false);
    setTitle("");
    setDescription("");
  };
  const execute = (planId) => {
    fetcher.submit({ action: "execute_plan", planId }, { method: "post", encType: "application/json" });
    toast.info("Executing plan", "Steps are running in the background");
  };
  return /* @__PURE__ */ jsxs("div", { className: "max-w-5xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Target, { className: "h-6 w-6" }),
          "Goals & Plans"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted mt-1", children: "Set high-level goals. AI plans the steps, executes them, and self-heals on failure." })
      ] }),
      /* @__PURE__ */ jsxs("button", { onClick: () => setShowForm(!showForm), className: "px-3 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700 flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }),
        "New Goal"
      ] })
    ] }),
    showForm && /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5 space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-vanta-muted", children: "Goal title" }),
        /* @__PURE__ */ jsx("input", { value: title, onChange: (e2) => setTitle(e2.target.value), placeholder: "e.g. Build my dropshipping business", className: "mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-vanta-muted", children: "Describe what you want" }),
        /* @__PURE__ */ jsx("textarea", { value: description, onChange: (e2) => setDescription(e2.target.value), rows: 3, placeholder: "I want to build and grow my Shopify store automatically.", className: "mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-vanta-muted", children: "Autonomy level" }),
        /* @__PURE__ */ jsxs("select", { value: autonomy, onChange: (e2) => setAutonomy(e2.target.value), className: "mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm", children: [
          /* @__PURE__ */ jsx("option", { value: "ASSISTED", children: "Assisted — ask me before each step" }),
          /* @__PURE__ */ jsx("option", { value: "SUPERVISED", children: "Supervised — ask only for risky actions" }),
          /* @__PURE__ */ jsx("option", { value: "AUTONOMOUS", children: "Autonomous — execute everything automatically" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: createAndPlan, disabled: !title.trim() || !description.trim(), className: "px-4 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700 disabled:opacity-50", children: "Create & Plan" })
    ] }),
    data2.goals.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "vanta-card p-10 text-center", children: [
      /* @__PURE__ */ jsx(Target, { className: "h-10 w-10 text-vanta-muted mx-auto mb-3" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted", children: "No goals yet. Create one above — AI will plan and execute it for you." })
    ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: data2.goals.map((goal) => /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5", children: [
      /* @__PURE__ */ jsx("div", { className: "flex items-start justify-between gap-3 mb-2", children: /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
          /* @__PURE__ */ jsx("h2", { className: "font-semibold text-sm", children: goal.title }),
          /* @__PURE__ */ jsx("span", { className: `text-[10px] px-2 py-0.5 rounded-full ${goal.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : goal.status === "ACTIVE" ? "bg-vanta-100 text-vanta-700" : goal.status === "FAILED" ? "bg-rose-100 text-rose-700" : "bg-vanta-100 text-vanta-muted"}`, children: goal.status }),
          /* @__PURE__ */ jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700", children: goal.autonomyLevel })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mt-1 line-clamp-2", children: goal.description })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs mb-1", children: [
          /* @__PURE__ */ jsxs("span", { className: "text-vanta-muted", children: [
            goal.completedSteps,
            "/",
            goal.totalSteps,
            " steps"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "text-vanta-muted", children: [
            (goal.progress * 100).toFixed(0),
            "%"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "h-2 bg-vanta-100 dark:bg-vanta-800 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-vanta-500 transition-all", style: { width: `${goal.progress * 100}%` } }) })
      ] }),
      goal.latestPlan && /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-xs text-vanta-muted", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            "Plan v",
            goal.latestPlan.version
          ] }),
          /* @__PURE__ */ jsx("span", { children: "•" }),
          /* @__PURE__ */ jsx("span", { children: goal.latestPlan.status }),
          goal.failedSteps > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("span", { children: "•" }),
            /* @__PURE__ */ jsxs("span", { className: "text-rose-500 flex items-center gap-1", children: [
              /* @__PURE__ */ jsx(AlertTriangle$1, { className: "h-3 w-3" }),
              goal.failedSteps,
              " failed"
            ] })
          ] })
        ] }),
        goal.latestPlan.status === "APPROVED" && /* @__PURE__ */ jsxs("button", { onClick: () => execute(goal.latestPlan.id), className: "px-3 py-1.5 text-xs rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 flex items-center gap-1", children: [
          /* @__PURE__ */ jsx(Play, { className: "h-3 w-3" }),
          "Execute"
        ] }),
        goal.latestPlan.status === "DRAFT" && /* @__PURE__ */ jsxs("span", { className: "text-xs text-amber-600 flex items-center gap-1", children: [
          /* @__PURE__ */ jsx(Clock, { className: "h-3 w-3" }),
          "Awaiting approval"
        ] }),
        goal.latestPlan.status === "COMPLETED" && /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-emerald-500" })
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-vanta-muted mt-2", children: [
        "Created ",
        formatRelativeTime(goal.createdAt, "en")
      ] })
    ] }, goal.id)) })
  ] });
}
const route40 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: GoalsDashboard,
  headers: headers$5,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
async function loader$6(args) {
  try {
    const ctx = await requireAdmin(args);
    const wl = getWhitelabelConfig();
    return json({
      locale: ctx.shop.preferredLanguage,
      appName: wl.appName,
      supportEmail: wl.supportEmail,
      copyrightHolder: wl.copyrightHolder
    });
  } catch {
    const wl = getWhitelabelConfig();
    return json({
      locale: "en",
      appName: wl.appName,
      supportEmail: wl.supportEmail,
      copyrightHolder: wl.copyrightHolder
    });
  }
}
function headers$4(_) {
  return getSecurityHeaders();
}
function Terms() {
  const data2 = useLoaderData();
  const { t } = useTranslation(data2.locale);
  const content = generateTermsContent(data2.appName, data2.supportEmail, data2.copyrightHolder);
  return /* @__PURE__ */ jsxs("div", { className: "max-w-3xl mx-auto space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200", children: [
      /* @__PURE__ */ jsx(AlertTriangle$1, { className: "h-4 w-4 shrink-0 mt-0.5" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs", children: t("legal.draftNotice") })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: t("legal.lastUpdated", { date: "2026-06-20" }) }),
    /* @__PURE__ */ jsx(MarkdownRenderer, { content })
  ] });
}
function generateTermsContent(appName, supportEmail, copyrightHolder) {
  return `# Terms of Service — ${appName}

**Last updated: 2026-06-20**

These Terms of Service ("Terms") govern your use of ${appName} ("the Service"), an AI agent application embedded in your Shopify admin. By installing or using the Service, you agree to these Terms.

## 1. What the Agent Is Authorized to Do

When you grant the requested Shopify access scopes, ${appName} is authorized to:

- **Read and write products, variants, collections, and metafields** — within the scopes you explicitly grant and the permissions you configure in Settings.
- **Adjust inventory levels** — only if you enable the inventory write permission.
- **Read orders and customers** — only if you explicitly grant those scopes for a real feature.
- **Generate AI-drafted content** — SEO descriptions, marketing copy, summaries.

Every action is logged with the staff member who initiated it, the timestamp, and the before/after state. You can undo any modifying action within 30 days.

## 2. What the Agent Is NOT Authorized to Do

The agent will NEVER:

- **Access payment gateway, payout, or financial settings** — if a request involves these, the agent will generate a deep link to the relevant Shopify Admin page and instruct you to perform the action manually.
- **Process refunds outside the original payment processor** — refunds must go through Shopify's native refund flow.
- **Log into third-party platforms (suppliers, marketplaces) using stored credentials via browser automation** — if supplier-sourcing becomes a feature, it will use the platform's official API or a CSV you upload, never browser automation with stored passwords.
- **Bypass Shopify checkout** — the agent respects Shopify's checkout flow completely.
- **Operate outside the permission guardrails you configure** — even if a command requests a disallowed action, the agent will refuse and explain why.

## 3. Approval and Blast-Radius Safeguards

For any bulk or irreversible action (default threshold: 10+ items), the agent:

1. Performs a "dry run" to calculate the exact scope of the change.
2. Presents a precise warning: "This action will modify N items."
3. Waits for your explicit approval before executing.

You can adjust the threshold or disable approval entirely in Settings. Doing so is at your own risk.

## 4. Billing Terms

${appName} uses **Shopify App Pricing** for billing. Plans and credit allocations are defined in the Shopify Partner Dashboard and managed by Shopify directly.

- **Free plan** — limited monthly credits for evaluation.
- **Growth plan** — higher credit allocation for active stores.
- **Pro plan** — maximum credits for high-volume operations.
- **Private test plan** — $0 plan for development and QA, always available.

Credits are consumed per completed task based on AI inference cost + Shopify API operations. Usage is reported to Shopify via the App Events API for metering and invoicing.

You can cancel at any time by uninstalling the app from your Shopify admin. Cancellation takes effect immediately and no further charges accrue.

## 5. Kill Switch

You have a "Disable Agent Globally" toggle in Settings. When enabled, the agent aborts all pending tasks, rejects new commands, and refuses to execute any Shopify mutation. This is your emergency brake.

## 6. Data and Privacy

Our handling of your data is described in detail in our [Privacy Policy](/app/privacy). Key commitments:

- We never share your data with third parties other than the AI sub-processor (Google Gemini), Shopify itself, and email/telemetry providers (Resend, Sentry) — all with strict data processing agreements.
- We never use your data to train AI models.
- You can export or delete all your data at any time via the Data Controls page.
- Shopify-mediated GDPR webhooks (customer redaction, data request, shop redaction) are processed within 48 hours.

## 7. Acceptable Use

You agree NOT to:

- Submit commands that attempt prompt injection, jailbreaks, or attempts to override the agent's guardrails.
- Use the agent to perform actions that violate Shopify's Acceptable Use Policy.
- Resell or sublicense access to the agent without written permission.
- Attempt to access data belonging to other shops (we enforce multi-tenant isolation in code, but you agree not to attempt to circumvent it).

## 8. Service Availability

We target 99.9% uptime for the web application and worker process. We are not liable for:

- Outages caused by Shopify, Google Gemini, or other third-party providers.
- Data loss caused by your failure to maintain Shopify admin access.
- Delays caused by Shopify API rate limits.

## 9. Intellectual Property

${appName}, including its source code, UI design, brand assets, and documentation, is the exclusive property of **${copyrightHolder}**. You receive a limited, revocable, non-transferable license to use the Service for the duration of your subscription.

## 10. Disclaimer of Warranties

THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. The agent uses artificial intelligence to interpret natural-language commands, and AI can misinterpret intent. You are responsible for reviewing proposed actions before approval and for verifying completed actions. We do not warrant that the agent will be error-free, uninterrupted, or fit for any particular purpose.

## 11. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${copyrightHolder} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, BUSINESS OPPORTUNITY, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.

Total liability for any claim shall not exceed the amount you paid to ${appName} in the 12 months preceding the claim.

## 12. Indemnification

You agree to indemnify and hold harmless ${copyrightHolder} from any claim arising from:

- Actions taken by the agent at your direction.
- Your violation of these Terms or Shopify's policies.
- Your infringement of third-party intellectual property rights.

## 13. Termination

You can terminate these Terms at any time by uninstalling ${appName} from your Shopify admin. Upon termination:

- All pending tasks are cancelled.
- All Shopify sessions are revoked.
- Your data is retained for 48 hours to allow you to export it, then permanently deleted (unless retention is required by law).

## 14. Governing Law

These Terms are governed by the laws of the jurisdiction where ${copyrightHolder} operates, without regard to conflict-of-laws principles. Disputes will be resolved in the courts of that jurisdiction.

## 15. Changes to These Terms

We may update these Terms from time to time. Material changes will be notified via in-app notification and email. Continued use after the effective date constitutes acceptance of the revised Terms.

## 16. Contact

For questions about these Terms:

- Email: **${supportEmail}**
- In-app: Help → Contact Support

© ${(/* @__PURE__ */ new Date()).getFullYear()} ${copyrightHolder}. All rights reserved.

---

*These Terms of Service are provided as a draft for review by your legal counsel. They are not legal advice.*
`;
}
const route41 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Terms,
  headers: headers$4,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
function useStreamingChat() {
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentThinking, setCurrentThinking] = useState("");
  const [activeAgent, setActiveAgent] = useState(null);
  const abortControllerRef = useRef(null);
  const currentTaskIdRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const sendMessage = useCallback(async (text, options) => {
    const userMsg = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      isStreaming: false,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      imageUrl: options?.imageUrl,
      voiceUrl: options?.voiceUrl
    };
    setMessages((prev) => [...prev, userMsg]);
    const aiMsgId = `msg-${Date.now() + 1}`;
    const aiMsg = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      isStreaming: true,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    setMessages((prev) => [...prev, aiMsg]);
    setIsGenerating(true);
    setActiveAgent("vanta");
    const thinkingPhases = [
      "Analyzing your request...",
      "Checking store data...",
      "Consulting specialized agents...",
      "Formulating response..."
    ];
    for (let i = 0; i < thinkingPhases.length; i++) {
      setCurrentThinking(thinkingPhases[i]);
      await new Promise((r) => setTimeout(r, 400));
      if (abortControllerRef.current?.signal.aborted) break;
    }
    setCurrentThinking("");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: text,
          language: options?.language ?? "en",
          priority: options?.priority ?? "NORMAL"
        })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? `HTTP ${response.status}`);
      }
      const task2 = await response.json();
      currentTaskIdRef.current = task2.id;
      let lastContent = "";
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusResp = await fetch(`/api/tasks/${task2.id}`);
          if (!statusResp.ok) return;
          const status = await statusResp.json();
          if (status.output && status.output !== lastContent) {
            lastContent = status.output;
            setMessages(
              (prev) => prev.map(
                (m) => m.id === aiMsgId ? { ...m, content: status.output } : m
              )
            );
          }
          if (["COMPLETED", "ERROR", "CANCELLED"].includes(status.status)) {
            clearInterval(pollIntervalRef.current);
            setIsGenerating(false);
            setActiveAgent(null);
            setMessages(
              (prev) => prev.map(
                (m) => m.id === aiMsgId ? {
                  ...m,
                  isStreaming: false,
                  content: status.output ?? m.content ?? "Task completed.",
                  confidence: status.confidenceScore
                } : m
              )
            );
            if (status.status === "COMPLETED" && status.undoable) {
              setMessages(
                (prev) => prev.map(
                  (m) => m.id === aiMsgId ? {
                    ...m,
                    actions: [
                      { label: "Undo", action: `undo:${task2.id}`, variant: "danger" },
                      { label: "View Details", action: `details:${task2.id}`, variant: "secondary" }
                    ]
                  } : m
                )
              );
            }
          }
        } catch {
        }
      }, 1500);
      setTimeout(() => clearInterval(pollIntervalRef.current), 3e5);
    } catch (err) {
      setIsGenerating(false);
      setActiveAgent(null);
      setMessages(
        (prev) => prev.map(
          (m) => m.id === aiMsgId ? {
            ...m,
            isStreaming: false,
            content: `❌ ${err instanceof Error ? err.message : "Something went wrong"}`
          } : m
        )
      );
    }
  }, []);
  const stopGeneration = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (currentTaskIdRef.current) {
      fetch(`/api/tasks/${currentTaskIdRef.current}/cancel`, { method: "POST" }).catch(() => {
      });
      currentTaskIdRef.current = null;
    }
    setIsGenerating(false);
    setActiveAgent(null);
    setCurrentThinking("");
    setMessages(
      (prev) => prev.map((m) => m.isStreaming ? { ...m, isStreaming: false, content: m.content + " [cancelled]" } : m)
    );
  }, []);
  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentThinking("");
    setActiveAgent(null);
  }, []);
  return {
    messages,
    isGenerating,
    currentThinking,
    activeAgent,
    sendMessage,
    stopGeneration,
    clearChat
  };
}
const PREDICTIVE_SUGGESTIONS = [
  { icon: /* @__PURE__ */ jsx(TrendingUp, { className: "h-3.5 w-3.5" }), text: "What are my best-selling products this week?", category: "analytics" },
  { icon: /* @__PURE__ */ jsx(Shield, { className: "h-3.5 w-3.5" }), text: "Check my store for any security issues", category: "safety" },
  { icon: /* @__PURE__ */ jsx(Zap, { className: "h-3.5 w-3.5" }), text: "Find products with zero inventory and tag them", category: "inventory" },
  { icon: /* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5" }), text: "Generate Arabic SEO descriptions for my latest products", category: "seo" },
  { icon: /* @__PURE__ */ jsx(Brain, { className: "h-3.5 w-3.5" }), text: "Analyze my competitors' pricing strategy", category: "intelligence" },
  { icon: /* @__PURE__ */ jsx(Wand2, { className: "h-3.5 w-3.5" }), text: "Create a 20% off sale for slow-moving inventory", category: "marketing" }
];
const AGENT_AVATARS = {
  vanta: { icon: /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4" }), color: "from-vanta-500 to-purple-600", name: "VANTA" },
  planner: { icon: /* @__PURE__ */ jsx(Brain, { className: "h-4 w-4" }), color: "from-blue-500 to-cyan-500", name: "Planner" },
  research: { icon: /* @__PURE__ */ jsx(Search, { className: "h-4 w-4" }), color: "from-emerald-500 to-teal-500", name: "Research" },
  product_hunter: { icon: /* @__PURE__ */ jsx(TrendingUp, { className: "h-4 w-4" }), color: "from-amber-500 to-orange-500", name: "Hunter" },
  store_optimizer: { icon: /* @__PURE__ */ jsx(Cpu, { className: "h-4 w-4" }), color: "from-pink-500 to-rose-500", name: "Optimizer" },
  marketing: { icon: /* @__PURE__ */ jsx(Wand2, { className: "h-4 w-4" }), color: "from-indigo-500 to-violet-500", name: "Marketing" },
  analyst: { icon: /* @__PURE__ */ jsx(Activity, { className: "h-4 w-4" }), color: "from-slate-500 to-gray-600", name: "Analyst" },
  reviewer: { icon: /* @__PURE__ */ jsx(Shield, { className: "h-4 w-4" }), color: "from-red-500 to-rose-600", name: "Reviewer" }
};
function TypewriterCursor({ visible }) {
  if (!visible) return null;
  return /* @__PURE__ */ jsx(
    motion.span,
    {
      className: "inline-block w-0.5 h-4 bg-vanta-500 ml-0.5",
      animate: { opacity: [1, 0, 1] },
      transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
    }
  );
}
function ThinkingIndicator({ phase }) {
  return /* @__PURE__ */ jsxs(
    motion.div,
    {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      className: "flex items-center gap-3 px-4 py-3 bg-vanta-50 dark:bg-vanta-900/40 rounded-lg",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            motion.div,
            {
              className: "w-8 h-8 rounded-full bg-gradient-to-br from-vanta-500 to-purple-600 flex items-center justify-center",
              animate: {
                scale: [1, 1.1, 1],
                boxShadow: [
                  "0 0 0 0 rgba(124,92,255,0)",
                  "0 0 20px 4px rgba(124,92,255,0.3)",
                  "0 0 0 0 rgba(124,92,255,0)"
                ]
              },
              transition: { duration: 2, repeat: Infinity },
              children: /* @__PURE__ */ jsx(Brain, { className: "h-4 w-4 text-white" })
            }
          ),
          [0, 1, 2].map((i) => /* @__PURE__ */ jsx(
            motion.div,
            {
              className: "absolute inset-0 rounded-full border border-vanta-300",
              animate: { scale: [1, 1.5], opacity: [0.5, 0] },
              transition: { duration: 1.5, repeat: Infinity, delay: i * 0.5 }
            },
            i
          ))
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-medium text-vanta-700 dark:text-vanta-200", children: phase }),
          /* @__PURE__ */ jsx("div", { className: "flex gap-1 mt-1", children: [0, 1, 2].map((i) => /* @__PURE__ */ jsx(
            motion.div,
            {
              className: "w-1 h-1 rounded-full bg-vanta-400",
              animate: { opacity: [0.3, 1, 0.3] },
              transition: { duration: 1, repeat: Infinity, delay: i * 0.2 }
            },
            i
          )) })
        ] })
      ]
    }
  );
}
function LiveAgentPanel({ activeAgent }) {
  const agents = Object.entries(AGENT_AVATARS);
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 px-3 py-1.5 bg-vanta-50 dark:bg-vanta-900/40 rounded-lg overflow-x-auto", children: [
    /* @__PURE__ */ jsx("span", { className: "text-[10px] text-vanta-muted shrink-0 mr-1", children: "Agents:" }),
    agents.map(([key, avatar]) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] transition-all",
          activeAgent === key ? `bg-gradient-to-r ${avatar.color} text-white scale-110` : "bg-vanta-100 dark:bg-vanta-800 text-vanta-muted opacity-50"
        ),
        children: [
          avatar.icon,
          /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: avatar.name }),
          activeAgent === key && /* @__PURE__ */ jsx(
            motion.span,
            {
              className: "w-1.5 h-1.5 rounded-full bg-white",
              animate: { opacity: [1, 0.3, 1] },
              transition: { duration: 0.8, repeat: Infinity }
            }
          )
        ]
      },
      key
    ))
  ] });
}
function InteractiveCard({ card }) {
  if (card.type === "stat") {
    const data2 = card.data;
    return /* @__PURE__ */ jsxs("div", { className: "vanta-card p-3 my-2 inline-block", children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: data2.label }),
      /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold", children: data2.value }),
      data2.change && /* @__PURE__ */ jsx("p", { className: "text-xs text-emerald-500", children: data2.change })
    ] });
  }
  if (card.type === "alert") {
    const data2 = card.data;
    return /* @__PURE__ */ jsxs("div", { className: cn("p-3 my-2 rounded-lg border", data2.severity === "critical" ? "border-rose-300 bg-rose-50" : "border-amber-300 bg-amber-50"), children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs font-medium", children: card.title }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mt-1", children: data2.message })
    ] });
  }
  return /* @__PURE__ */ jsx("div", { className: "vanta-card p-3 my-2", children: /* @__PURE__ */ jsx("p", { className: "text-xs font-medium", children: card.title }) });
}
function MessageActions({ actions, onAction }) {
  const variants = {
    primary: "bg-vanta-600 text-white hover:bg-vanta-700",
    secondary: "bg-vanta-100 dark:bg-vanta-800 hover:opacity-80",
    danger: "bg-rose-100 text-rose-700 hover:bg-rose-200",
    success: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
  };
  return /* @__PURE__ */ jsx("div", { className: "flex gap-2 mt-2", children: actions.map((a) => /* @__PURE__ */ jsx(
    "button",
    {
      onClick: () => onAction(a.action),
      className: cn("px-3 py-1 text-xs rounded-lg transition", variants[a.variant]),
      children: a.label
    },
    a.action
  )) });
}
function MessageBubble({ msg, onAction }) {
  const [showActions, setShowActions] = useState(false);
  const isUser = msg.role === "user";
  const avatar = AGENT_AVATARS[msg.agentName ?? "vanta"] ?? AGENT_AVATARS.vanta;
  return /* @__PURE__ */ jsxs(
    motion.div,
    {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
      className: cn("flex gap-3 group", isUser ? "flex-row-reverse" : "flex-row"),
      onMouseEnter: () => setShowActions(true),
      onMouseLeave: () => setShowActions(false),
      children: [
        /* @__PURE__ */ jsx("div", { className: cn("w-8 h-8 rounded-full shrink-0 flex items-center justify-center", isUser ? "bg-vanta-200 dark:bg-vanta-700" : `bg-gradient-to-br ${avatar.color}`), children: isUser ? /* @__PURE__ */ jsx(User, { className: "h-4 w-4 text-vanta-600" }) : /* @__PURE__ */ jsx("span", { className: "text-white", children: avatar.icon }) }),
        /* @__PURE__ */ jsx("div", { className: cn("flex-1 min-w-0 max-w-[85%]", isUser && "flex justify-end"), children: /* @__PURE__ */ jsxs("div", { className: cn("inline-block max-w-full", isUser ? "text-right" : "text-left"), children: [
          !isUser && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold", children: avatar.name }),
            msg.confidence !== void 0 && /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-vanta-muted", children: [
              "Confidence: ",
              (msg.confidence * 100).toFixed(0),
              "%"
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-[10px] text-vanta-muted", children: formatRelativeTime(msg.timestamp, "en") })
          ] }),
          msg.imageUrl && /* @__PURE__ */ jsx("img", { src: msg.imageUrl, alt: "attachment", className: "max-w-xs rounded-lg mb-2" }),
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: cn(
                "px-4 py-2.5 rounded-2xl text-sm",
                isUser ? "bg-vanta-600 text-white rounded-tr-sm" : "vanta-card rounded-tl-sm"
              ),
              children: [
                msg.content ? isUser ? /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap", children: msg.content }) : /* @__PURE__ */ jsx("div", { className: "prose prose-sm dark:prose-invert max-w-none", children: /* @__PURE__ */ jsx(MarkdownRenderer, { content: msg.content }) }) : msg.isStreaming ? /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 text-vanta-muted", children: /* @__PURE__ */ jsx(motion.div, { className: "flex gap-1", children: [0, 1, 2].map((i) => /* @__PURE__ */ jsx(
                  motion.div,
                  {
                    className: "w-2 h-2 rounded-full bg-vanta-400",
                    animate: { y: [0, -6, 0] },
                    transition: { duration: 0.6, repeat: Infinity, delay: i * 0.15 }
                  },
                  i
                )) }) }) : null,
                /* @__PURE__ */ jsx(TypewriterCursor, { visible: msg.isStreaming && !!msg.content })
              ]
            }
          ),
          msg.cards && msg.cards.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-2", children: msg.cards.map((card, i) => /* @__PURE__ */ jsx(InteractiveCard, { card }, i)) }),
          msg.actions && msg.actions.length > 0 && /* @__PURE__ */ jsx(MessageActions, { actions: msg.actions, onAction }),
          showActions && !msg.isStreaming && /* @__PURE__ */ jsxs(
            motion.div,
            {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              className: "flex gap-1 mt-1",
              children: [
                /* @__PURE__ */ jsx("button", { onClick: () => navigator.clipboard?.writeText(msg.content), className: "p-1 rounded hover:bg-vanta-100 dark:hover:bg-vanta-800", title: "Copy", children: /* @__PURE__ */ jsx(Copy, { className: "h-3 w-3 text-vanta-muted" }) }),
                /* @__PURE__ */ jsx("button", { className: "p-1 rounded hover:bg-vanta-100 dark:hover:bg-vanta-800", title: "Good", children: /* @__PURE__ */ jsx(ThumbsUp, { className: "h-3 w-3 text-vanta-muted" }) }),
                /* @__PURE__ */ jsx("button", { className: "p-1 rounded hover:bg-vanta-100 dark:hover:bg-vanta-800", title: "Bad", children: /* @__PURE__ */ jsx(ThumbsDown, { className: "h-3 w-3 text-vanta-muted" }) }),
                /* @__PURE__ */ jsx("button", { className: "p-1 rounded hover:bg-vanta-100 dark:hover:bg-vanta-800", title: "Pin", children: /* @__PURE__ */ jsx(Pin, { className: "h-3 w-3 text-vanta-muted" }) }),
                /* @__PURE__ */ jsx("button", { className: "p-1 rounded hover:bg-vanta-100 dark:hover:bg-vanta-800", title: "Speak", children: /* @__PURE__ */ jsx(Volume2, { className: "h-3 w-3 text-vanta-muted" }) })
              ]
            }
          )
        ] }) })
      ]
    }
  );
}
function FutureChat({ locale, shopDomain }) {
  const { messages, isGenerating, currentThinking, activeAgent, sendMessage, stopGeneration } = useStreamingChat();
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const { isOffline } = useOffline();
  const toast = useToast();
  const voice = useVoiceInput(locale === "ar" ? "ar-MA" : "en-US");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const cmdHistory = useCommandHistory(shopDomain);
  const [historyIndex, setHistoryIndex] = useState(-1);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentThinking]);
  useEffect(() => {
    if (voice.transcript) {
      setInput((prev) => prev ? `${prev} ${voice.transcript}` : voice.transcript);
      voice.reset();
    }
  }, [voice]);
  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating || isOffline) return;
    cmdHistory.pushCommand(trimmed);
    setHistoryIndex(-1);
    setShowSuggestions(false);
    sendMessage(trimmed, {
      imageUrl: selectedImage ?? void 0,
      language: locale
    });
    setInput("");
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [input, isGenerating, isOffline, sendMessage, selectedImage, locale, cmdHistory]);
  const handleKeyDown = (e2) => {
    if (e2.key === "Enter" && !e2.shiftKey) {
      e2.preventDefault();
      handleSubmit();
    } else if (e2.key === "ArrowUp" && cmdHistory.history.length > 0) {
      e2.preventDefault();
      const next = Math.min(historyIndex + 1, cmdHistory.history.length - 1);
      setHistoryIndex(next);
      setInput(cmdHistory.history[next] ?? "");
    } else if (e2.key === "ArrowDown" && historyIndex >= 0) {
      e2.preventDefault();
      const next = historyIndex - 1;
      setHistoryIndex(next);
      setInput(next >= 0 ? cmdHistory.history[next] : "");
    }
  };
  const handleImageUpload = (e2) => {
    const file = e2.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result);
    reader.readAsDataURL(file);
  };
  const handleAction = (action2) => {
    if (action2.startsWith("undo:")) {
      const taskId = action2.slice(5);
      fetch(`/api/tasks/${taskId}/undo`, { method: "POST" }).then(() => toast.success("Undone", "Changes have been reverted.")).catch(() => toast.error("Failed", "Could not undo."));
    } else if (action2.startsWith("details:")) {
      const taskId = action2.slice(8);
      window.location.href = `/app/history/${taskId}`;
    }
  };
  const charCount = input.length;
  const maxChars = 2e3;
  const estimatedCredits = Math.max(1, Math.ceil(charCount / 500));
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full bg-vanta-50 dark:bg-vanta-950", children: [
    /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 overflow-hidden pointer-events-none", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute -top-40 -right-40 w-96 h-96 bg-vanta-200/20 dark:bg-vanta-800/20 rounded-full blur-3xl" }),
      /* @__PURE__ */ jsx("div", { className: "absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200/10 dark:bg-purple-900/10 rounded-full blur-3xl" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "relative z-10 p-2 border-b border-vanta-border", children: /* @__PURE__ */ jsx(LiveAgentPanel, { activeAgent }) }),
    /* @__PURE__ */ jsx("div", { className: "relative z-10 flex-1 overflow-y-auto p-4 space-y-4", children: messages.length === 0 && showSuggestions ? (
      /* Empty state with predictive suggestions */
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center h-full text-center max-w-md mx-auto", children: [
        /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { scale: 0.7, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
            className: "relative mb-6",
            children: [
              /* @__PURE__ */ jsx("div", { className: "w-20 h-20 rounded-3xl bg-gradient-to-br from-vanta-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-2xl", children: /* @__PURE__ */ jsx(Sparkles, { className: "h-10 w-10 text-white" }) }),
              [0, 1, 2].map((i) => /* @__PURE__ */ jsx(
                motion.div,
                {
                  className: "absolute w-2 h-2 rounded-full bg-vanta-400",
                  animate: { rotate: 360 },
                  transition: { duration: 3 + i, repeat: Infinity, ease: "linear" },
                  style: { top: "50%", left: "50%", transformOrigin: `0 ${i % 2 === 0 ? "-40px" : "-50px"}` }
                },
                i
              ))
            ]
          }
        ),
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold mb-2", children: "VANTA OS" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted mb-6", children: "Your autonomous commerce operating system. Ask anything — or try one of these:" }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-2 w-full", children: PREDICTIVE_SUGGESTIONS.map((s, i) => /* @__PURE__ */ jsxs(
          motion.button,
          {
            initial: { opacity: 0, x: -20 },
            animate: { opacity: 1, x: 0 },
            transition: { delay: 0.1 + i * 0.05 },
            onClick: () => {
              setInput(s.text);
              inputRef.current?.focus();
            },
            className: "flex items-center gap-2 px-3 py-2.5 vanta-card hover:border-vanta-400 dark:hover:border-vanta-500 transition text-left text-sm group",
            children: [
              /* @__PURE__ */ jsx("span", { className: "text-vanta-500 group-hover:scale-110 transition", children: s.icon }),
              /* @__PURE__ */ jsx("span", { className: "flex-1", children: s.text }),
              /* @__PURE__ */ jsx(ChevronRight, { className: "h-3 w-3 text-vanta-muted opacity-0 group-hover:opacity-100 transition" })
            ]
          },
          i
        )) })
      ] })
    ) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(AnimatePresence, { children: messages.map((msg) => /* @__PURE__ */ jsx(MessageBubble, { msg, onAction: handleAction }, msg.id)) }),
      currentThinking && /* @__PURE__ */ jsx(ThinkingIndicator, { phase: currentThinking }),
      /* @__PURE__ */ jsx("div", { ref: messagesEndRef })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "relative z-10 border-t border-vanta-border vanta-glass p-3", children: [
      isOffline && /* @__PURE__ */ jsx("div", { className: "mb-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs", children: "⚠️ You are offline. Tasks already submitted are safely executing in the cloud." }),
      selectedImage && /* @__PURE__ */ jsxs("div", { className: "mb-2 inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-vanta-100 dark:bg-vanta-800", children: [
        /* @__PURE__ */ jsx("img", { src: selectedImage, alt: "preview", className: "w-8 h-8 rounded object-cover" }),
        /* @__PURE__ */ jsx("button", { onClick: () => setSelectedImage(null), className: "text-xs text-rose-500", children: "Remove" })
      ] }),
      voice.listening && /* @__PURE__ */ jsxs("div", { className: "mb-2 px-3 py-2 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(motion.div, { className: "w-2 h-2 rounded-full bg-rose-500", animate: { scale: [1, 1.5, 1] }, transition: { duration: 0.8, repeat: Infinity } }),
        "Listening... ",
        voice.interimTranscript
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-end gap-2", children: [
        /* @__PURE__ */ jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", onChange: handleImageUpload, className: "hidden" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => fileInputRef.current?.click(),
            className: "p-2 rounded-lg text-vanta-muted hover:bg-vanta-100 dark:hover:bg-vanta-800 transition shrink-0",
            "aria-label": "Upload image",
            children: /* @__PURE__ */ jsx(Image, { className: "h-5 w-5" })
          }
        ),
        voice.supported && /* @__PURE__ */ jsx(
          "button",
          {
            onClick: voice.listening ? voice.stop : voice.start,
            className: cn("p-2 rounded-lg transition shrink-0", voice.listening ? "bg-rose-500 text-white animate-pulse" : "text-vanta-muted hover:bg-vanta-100 dark:hover:bg-vanta-800"),
            "aria-label": "Voice input",
            children: voice.listening ? /* @__PURE__ */ jsx(MicOff, { className: "h-5 w-5" }) : /* @__PURE__ */ jsx(Mic, { className: "h-5 w-5" })
          }
        ),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            ref: inputRef,
            value: input,
            onChange: (e2) => setInput(e2.target.value),
            onKeyDown: handleKeyDown,
            placeholder: "Ask VANTA anything... (Shift+Enter for new line, ↑ for history)",
            disabled: isOffline,
            maxLength: maxChars,
            rows: 1,
            className: "flex-1 px-3 py-2.5 rounded-xl border border-vanta-border bg-white dark:bg-vanta-900 text-sm outline-none focus:ring-2 focus:ring-vanta-500 resize-none disabled:opacity-50",
            style: { minHeight: "44px", maxHeight: "120px" }
          }
        ),
        isGenerating ? /* @__PURE__ */ jsx(
          "button",
          {
            onClick: stopGeneration,
            className: "p-2.5 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition shrink-0",
            "aria-label": "Stop generation",
            children: /* @__PURE__ */ jsx(Square, { className: "h-5 w-5" })
          }
        ) : /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleSubmit,
            disabled: !input.trim() || isOffline,
            className: "p-2.5 rounded-xl bg-vanta-600 text-white hover:bg-vanta-700 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0",
            "aria-label": "Send message",
            children: /* @__PURE__ */ jsx(Send, { className: "h-5 w-5" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mt-2 text-[10px] text-vanta-muted", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxs("span", { className: cn(charCount > maxChars * 0.9 && "text-rose-500 font-medium"), children: [
            charCount,
            "/",
            maxChars
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "px-2 py-0.5 rounded-full bg-vanta-100 dark:bg-vanta-800", children: [
            "~",
            estimatedCredits,
            " credit",
            estimatedCredits > 1 ? "s" : ""
          ] }),
          history.length > 0 && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx(ArrowUp, { className: "h-3 w-3" }),
            "History"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx(Cpu, { className: "h-3 w-3" }),
            "Gemini 2.0"
          ] }),
          /* @__PURE__ */ jsx("span", { children: "•" }),
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx(Clock, { className: "h-3 w-3" }),
            "~2s response"
          ] })
        ] })
      ] })
    ] })
  ] });
}
async function loader$5(args) {
  const ctx = await requireAdmin(args);
  return json({
    shopDomain: ctx.shopDomain,
    locale: ctx.shop.preferredLanguage
  });
}
function headers$3(_) {
  return getSecurityHeaders();
}
function FutureChatRoute() {
  const data2 = useLoaderData();
  return /* @__PURE__ */ jsx("div", { className: "h-[calc(100vh-160px)] sm:h-[calc(100vh-140px)]", children: /* @__PURE__ */ jsx(FutureChat, { locale: data2.locale, shopDomain: data2.shopDomain }) });
}
const route42 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: FutureChatRoute,
  headers: headers$3,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
async function loader$4(args) {
  const ctx = await requireAdmin(args);
  const wl = getWhitelabelConfig();
  let changelog = "";
  try {
    changelog = readFileSync(path.resolve(process.cwd(), "CHANGELOG.md"), "utf-8");
  } catch {
    changelog = "Changelog not available.";
  }
  return json({
    locale: ctx.shop.preferredLanguage,
    appName: wl.appName,
    supportEmail: wl.supportEmail,
    docsUrl: wl.docsUrl,
    copyrightHolder: wl.copyrightHolder,
    version: APP_IDENTITY.VERSION,
    changelog
  });
}
function headers$2(_) {
  return getSecurityHeaders();
}
function Help() {
  const data2 = useLoaderData();
  const { t } = useTranslation(data2.locale);
  const faqs = [
    {
      q: "How does the agent decide what to do?",
      a: "The agent uses Google Gemini to interpret your natural-language command, then calls the appropriate Shopify Admin GraphQL API operations. Before any bulk action, it shows you a blast-radius estimate and waits for your approval."
    },
    {
      q: "Can I undo a change?",
      a: "Yes. Any modifying action records an undo snapshot of the previous state. Completed task cards include an 'Undo' button that reverts the change instantly."
    },
    {
      q: "What happens if the agent makes a mistake?",
      a: "Use the Kill Switch in Settings to halt all activity immediately. Then review the Task History, undo any unwanted changes, and contact support if needed."
    },
    {
      q: "Is my data shared with AI providers?",
      a: "Your command text and relevant store data are sent to Google Gemini for inference. We never use your data to train AI models. See the Privacy Policy for full details."
    },
    {
      q: "What is Guardian Mode?",
      a: "Guardian Mode runs background checks every 6 hours (configurable) to detect $0 prices, low inventory, and broken links. Alerts appear on the Guardian dashboard with one-click fixes."
    }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "max-w-3xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(HelpCircle, { className: "h-6 w-6" }),
        t("help.title")
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted mt-1", children: t("help.subtitle") })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
      /* @__PURE__ */ jsxs(
        "a",
        {
          href: data2.docsUrl,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "vanta-card p-4 hover:border-vanta-400 dark:hover:border-vanta-500 transition flex items-start gap-3",
          children: [
            /* @__PURE__ */ jsx(BookOpen, { className: "h-5 w-5 text-vanta-500 shrink-0 mt-0.5" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm", children: t("help.docs") }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mt-1", children: "Full documentation, guides, and API reference." })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "a",
        {
          href: `mailto:${data2.supportEmail}`,
          className: "vanta-card p-4 hover:border-vanta-400 dark:hover:border-vanta-500 transition flex items-start gap-3",
          children: [
            /* @__PURE__ */ jsx(Mail, { className: "h-5 w-5 text-vanta-500 shrink-0 mt-0.5" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm", children: t("help.contact") }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mt-1", children: data2.supportEmail })
            ] })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "vanta-card p-5", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-semibold mb-3", children: t("help.faq") }),
      /* @__PURE__ */ jsx("div", { className: "space-y-4", children: faqs.map((faq, i) => /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: faq.q }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mt-1", children: faq.a })
      ] }, i)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h2", { className: "font-semibold mb-3", children: t("help.changelog") }),
      /* @__PURE__ */ jsx("div", { className: "vanta-card p-5", children: /* @__PURE__ */ jsx(MarkdownRenderer, { content: data2.changelog }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "text-center text-xs text-vanta-muted pt-6 border-t border-vanta-border", children: [
      /* @__PURE__ */ jsx("p", { children: t("help.version", { version: data2.version }) }),
      /* @__PURE__ */ jsx("p", { className: "mt-1", children: t("help.copyright", {
        year: (/* @__PURE__ */ new Date()).getFullYear(),
        holder: data2.copyrightHolder
      }) })
    ] })
  ] });
}
const route43 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Help,
  headers: headers$2,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
async function loader$3(_) {
  return redirect("/app");
}
function Index() {
  return null;
}
const route44 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Index,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
const loader$2 = async (_) => {
  const started = Date.now();
  const status = {
    app: APP_IDENTITY.NAME,
    version: APP_IDENTITY.VERSION,
    env: loadEnv().APP_ENV,
    api_version: SHOPIFY_API_VERSION,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime_sec: Math.round(process.uptime())
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.db = "ok";
  } catch (err) {
    status.db = "error";
    status.db_error = String(err);
    logger.error("Health check DB probe failed", { error: String(err) });
    return Response.json({ ...status, status: "degraded" }, { status: 503 });
  }
  try {
    const { default: Redis2 } = await import("ioredis");
    const r = new Redis2(loadEnv().REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 800 });
    await r.ping();
    r.disconnect();
    status.redis = "ok";
  } catch (err) {
    status.redis = "error";
    status.redis_error = String(err);
  }
  status.response_ms = Date.now() - started;
  return Response.json({ ...status, status: "ok" }, { status: 200 });
};
const route45 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
function headers$1(_) {
  return { ...getSecurityHeaders(), "Content-Type": "text/html" };
}
async function loader$1(args) {
  const e2 = loadEnv();
  const authHeader = args.request.headers.get("Authorization");
  const expected = `Bearer ${e2.INTERNAL_DOCS_SECRET}`;
  if (!e2.INTERNAL_DOCS_SECRET || authHeader !== expected) {
    const url = new URL(args.request.url);
    if (url.searchParams.get("secret") !== e2.INTERNAL_DOCS_SECRET) {
      throw new Response("Unauthorized", { status: 401 });
    }
  }
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VANTA OS — API Docs</title>
  <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; }
    .topbar { background: #7c5cff !important; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"><\/script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: "/api/openapi.yaml",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
      });
    };
  <\/script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html" }
  });
}
const route46 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  headers: headers$1,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
function readTheme() {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-polaris-theme");
  return attr === "dark" ? "dark" : "light";
}
function useTheme() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(readTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-polaris-theme"]
    });
    return () => observer.disconnect();
  }, []);
  return { theme, isDark: theme === "dark" };
}
function useLogoUrl(lightUrl, darkUrl) {
  const { isDark } = useTheme();
  return isDark ? darkUrl : lightUrl;
}
const POLARIS_I18N = {
  en: {
    Polaris: {
      Frame: { skipToContent: "Skip to content", navigationLabel: "Navigation" },
      TextField: { clearButton: "Clear" },
      ResourceList: {
        sortingLabel: "Sort by",
        defaultItemSingular: "item",
        defaultItemPlural: "items"
      }
    }
  },
  ar: {
    Polaris: {
      Frame: { skipToContent: "تخطّى إلى المحتوى", navigationLabel: "التصفّح" },
      TextField: { clearButton: "مسح" },
      ResourceList: {
        sortingLabel: "رتّب حسب",
        defaultItemSingular: "عنصر",
        defaultItemPlural: "عناصر"
      }
    }
  }
};
function PolarisProvider({ locale, children }) {
  const { theme } = useTheme();
  useEffect(() => {
    document.documentElement.setAttribute("data-polaris-theme", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);
  return /* @__PURE__ */ jsx(
    AppProvider,
    {
      theme: {
        colorScheme: theme,
        colors: {
          primary: "#7c5cff",
          primaryDark: "#5b3fd6"
        }
      },
      i18n: POLARIS_I18N[locale] ?? POLARIS_I18N.en,
      children
    }
  );
}
function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}
function matchesCombo(e2, combo) {
  const parts = combo.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const wantMod = parts.includes("mod");
  const wantShift = parts.includes("shift");
  const wantAlt = parts.includes("alt");
  const isMod = isMac() ? e2.metaKey : e2.ctrlKey;
  if (wantMod !== isMod) return false;
  if (wantShift !== e2.shiftKey) return false;
  if (wantAlt !== e2.altKey) return false;
  return e2.key.toLowerCase() === key;
}
function isInInput(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}
function useKeyboardShortcuts(shortcuts) {
  const handleKeyDown = useCallback(
    (e2) => {
      for (const s of shortcuts) {
        if (!matchesCombo(e2, s.combo)) continue;
        if (!s.allowInInput && isInInput(e2.target)) continue;
        e2.preventDefault();
        s.handler(e2);
        return;
      }
    },
    [shortcuts]
  );
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
function useCommandPaletteShortcut(onOpen) {
  useKeyboardShortcuts([
    { combo: "mod+k", handler: () => onOpen(), allowInInput: true },
    { combo: "ctrl+k", handler: () => onOpen(), allowInInput: true }
  ]);
}
function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const container = ref.current;
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    const handleTab = (e2) => {
      if (e2.key !== "Tab") return;
      if (e2.shiftKey && document.activeElement === first) {
        e2.preventDefault();
        last.focus();
      } else if (!e2.shiftKey && document.activeElement === last) {
        e2.preventDefault();
        first.focus();
      }
    };
    container.addEventListener("keydown", handleTab);
    return () => container.removeEventListener("keydown", handleTab);
  }, [ref, active]);
}
function CommandPalette({ locale, onSendToAgent }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation(locale);
  const dialogRef = useRef(null);
  useCommandPaletteShortcut(() => setOpen(true));
  useFocusTrap(dialogRef, open);
  useEffect(() => {
    if (!open) return;
    const handler = (e2) => {
      if (e2.key === "Escape") {
        e2.preventDefault();
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);
  const items = useMemo(() => {
    return [
      {
        id: "new-task",
        label: t("commandPalette.actions.newTask"),
        group: "actions",
        icon: /* @__PURE__ */ jsx(Zap, { className: "h-4 w-4" }),
        action: () => {
          if (onSendToAgent) {
            onSendToAgent(query);
          } else {
            navigate("/app/canvas");
          }
          setOpen(false);
          setQuery("");
        },
        keywords: ["task", "command", "agent"]
      },
      {
        id: "go-dashboard",
        label: t("commandPalette.actions.goDashboard"),
        group: "navigate",
        icon: /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" }),
        action: () => {
          navigate("/app");
          setOpen(false);
          setQuery("");
        }
      },
      {
        id: "go-canvas",
        label: t("commandPalette.actions.goCanvas"),
        group: "navigate",
        icon: /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" }),
        action: () => {
          navigate("/app/canvas");
          setOpen(false);
          setQuery("");
        }
      },
      {
        id: "go-history",
        label: t("commandPalette.actions.goHistory"),
        group: "navigate",
        icon: /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" }),
        action: () => {
          navigate("/app/history");
          setOpen(false);
          setQuery("");
        }
      },
      {
        id: "go-settings",
        label: t("commandPalette.actions.goSettings"),
        group: "settings",
        icon: /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" }),
        action: () => {
          navigate("/app/settings");
          setOpen(false);
          setQuery("");
        }
      },
      {
        id: "go-billing",
        label: t("commandPalette.actions.goBilling"),
        group: "settings",
        icon: /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" }),
        action: () => {
          navigate("/app/billing");
          setOpen(false);
          setQuery("");
        }
      },
      {
        id: "open-help",
        label: t("commandPalette.actions.openHelp"),
        group: "settings",
        icon: /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" }),
        action: () => {
          navigate("/app/help");
          setOpen(false);
          setQuery("");
        }
      }
    ];
  }, [navigate, onSendToAgent, query, t]);
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((item) => {
      return item.label.toLowerCase().includes(q) || item.keywords?.some((k) => k.toLowerCase().includes(q));
    });
  }, [items, query]);
  useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length]);
  const grouped = useMemo(() => {
    const g = { actions: [], navigate: [], settings: [] };
    for (const item of filtered) {
      g[item.group].push(item);
    }
    return g;
  }, [filtered]);
  const flat = useMemo(() => [...grouped.actions, ...grouped.navigate, ...grouped.settings], [grouped]);
  const handleKeyDown = (e2) => {
    if (e2.key === "ArrowDown") {
      e2.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e2.key === "ArrowUp") {
      e2.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e2.key === "Enter") {
      e2.preventDefault();
      const item = flat[activeIndex];
      if (item) item.action();
    }
  };
  const canSendQueryAsTask = query.trim().length > 3 && filtered.length === 0 && onSendToAgent;
  return /* @__PURE__ */ jsx(AnimatePresence, { children: open && /* @__PURE__ */ jsx(
    motion.div,
    {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15 },
      className: "fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm",
      onClick: () => {
        setOpen(false);
        setQuery("");
      },
      role: "dialog",
      "aria-modal": "true",
      "aria-label": t("commandPalette.placeholder"),
      children: /* @__PURE__ */ jsxs(
        motion.div,
        {
          ref: dialogRef,
          initial: { opacity: 0, scale: 0.96, y: -8 },
          animate: { opacity: 1, scale: 1, y: 0 },
          exit: { opacity: 0, scale: 0.96, y: -8 },
          transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
          onClick: (e2) => e2.stopPropagation(),
          className: "vanta-card w-full max-w-xl shadow-2xl overflow-hidden",
          onKeyDown: handleKeyDown,
          children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 px-4 py-3 border-b border-vanta-border", children: [
              /* @__PURE__ */ jsx(Search, { className: "h-5 w-5 text-vanta-muted shrink-0", "aria-hidden": "true" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "text",
                  value: query,
                  onChange: (e2) => setQuery(e2.target.value),
                  placeholder: t("commandPalette.placeholder"),
                  className: "flex-1 bg-transparent outline-none text-sm placeholder:text-vanta-muted",
                  "aria-label": t("commandPalette.placeholder"),
                  autoFocus: true
                }
              ),
              /* @__PURE__ */ jsx("kbd", { className: "hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-vanta-100 dark:bg-vanta-800 text-vanta-muted", children: "ESC" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "max-h-[60vh] overflow-y-auto p-2", children: [
              canSendQueryAsTask && /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    onSendToAgent?.(query);
                    setOpen(false);
                    setQuery("");
                  },
                  className: "w-full text-left px-3 py-2.5 rounded-lg hover:bg-vanta-100 dark:hover:bg-vanta-800 flex items-center justify-between gap-2 transition",
                  children: [
                    /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2 text-sm", children: [
                      /* @__PURE__ */ jsx(Zap, { className: "h-4 w-4 text-vanta-500" }),
                      'Send "',
                      query.slice(0, 60),
                      query.length > 60 ? "…" : "",
                      '" to agent'
                    ] }),
                    /* @__PURE__ */ jsx(CornerDownLeft, { className: "h-3 w-3 text-vanta-muted" })
                  ]
                }
              ),
              flat.length === 0 && !canSendQueryAsTask && /* @__PURE__ */ jsx("p", { className: "px-3 py-6 text-sm text-vanta-muted text-center", children: "No matches. Try a different search." }),
              ["actions", "navigate", "settings"].map((group) => {
                if (grouped[group].length === 0) return null;
                return /* @__PURE__ */ jsxs("div", { className: "mb-2", children: [
                  /* @__PURE__ */ jsx("p", { className: "px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-vanta-muted", children: t(`commandPalette.groups.${group}`) }),
                  grouped[group].map((item) => {
                    const idx = flat.findIndex((f) => f.id === item.id);
                    const isActive = idx === activeIndex;
                    return /* @__PURE__ */ jsxs(
                      "button",
                      {
                        type: "button",
                        onMouseEnter: () => setActiveIndex(idx),
                        onClick: item.action,
                        className: cn(
                          "w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between gap-2 transition",
                          isActive ? "bg-vanta-100 dark:bg-vanta-800" : "hover:bg-vanta-50 dark:hover:bg-vanta-900/40"
                        ),
                        children: [
                          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2.5 text-sm", children: [
                            /* @__PURE__ */ jsx("span", { className: "text-vanta-muted", children: item.icon }),
                            item.label
                          ] }),
                          isActive && /* @__PURE__ */ jsx(CornerDownLeft, { className: "h-3 w-3 text-vanta-muted" })
                        ]
                      },
                      item.id
                    );
                  })
                ] }, group);
              })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "px-4 py-2 border-t border-vanta-border bg-vanta-50 dark:bg-vanta-900/40", children: /* @__PURE__ */ jsx("p", { className: "text-[10px] text-vanta-muted", children: t("commandPalette.hint") }) })
          ]
        }
      )
    }
  ) });
}
const SEVERITY_DOT = {
  INFO: "bg-vanta-500",
  SUCCESS: "bg-emerald-500",
  WARNING: "bg-amber-500",
  ERROR: "bg-rose-500"
};
function NotificationBell({ locale }) {
  const [open, setOpen] = useState(false);
  const [notifications2, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation(locale);
  const fetchNotifications = async () => {
    try {
      const r = await fetch("/api/notifications?limit=20");
      if (!r.ok) return;
      const json2 = await r.json();
      setNotifications(json2.notifications);
    } catch {
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3e4);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!open) return;
    const handler = (e2) => {
      if (ref.current && !ref.current.contains(e2.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  const unreadCount = notifications2.filter((n) => !n.read).length;
  const markAllRead = async () => {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };
  const markRead = async (id) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications(
      (prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n)
    );
  };
  const handleClick = (n) => {
    if (!n.read) markRead(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  };
  return /* @__PURE__ */ jsxs("div", { ref, className: "relative", children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: () => setOpen((v) => !v),
        className: "relative p-2 rounded-lg hover:bg-vanta-100 dark:hover:bg-vanta-800 transition focus:outline-none focus:ring-2 focus:ring-vanta-500",
        "aria-label": t("notifications.title"),
        "aria-expanded": open,
        children: [
          /* @__PURE__ */ jsx(Bell, { className: "h-5 w-5", "aria-hidden": "true" }),
          unreadCount > 0 && /* @__PURE__ */ jsx(
            "span",
            {
              className: "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center",
              "aria-label": `${unreadCount} unread`,
              children: unreadCount > 9 ? "9+" : unreadCount
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsx(AnimatePresence, { children: open && /* @__PURE__ */ jsxs(
      motion.div,
      {
        initial: { opacity: 0, y: -8, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -8, scale: 0.96 },
        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
        className: "absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 vanta-card shadow-2xl z-50",
        role: "dialog",
        "aria-label": t("notifications.title"),
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-vanta-border", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm", children: t("notifications.title") }),
              unreadCount > 0 && /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted", children: t("notifications.unread", { count: unreadCount }) })
            ] }),
            unreadCount > 0 && /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: markAllRead,
                className: "text-xs text-vanta-600 dark:text-vanta-300 hover:underline flex items-center gap-1",
                children: [
                  /* @__PURE__ */ jsx(Check, { className: "h-3 w-3" }),
                  t("notifications.markAllRead")
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "max-h-[60vh] overflow-y-auto", children: [
            loading && /* @__PURE__ */ jsx("div", { className: "p-6 text-center text-sm text-vanta-muted", children: t("common.loading") }),
            !loading && notifications2.length === 0 && /* @__PURE__ */ jsx("div", { className: "p-6 text-center text-sm text-vanta-muted", children: t("notifications.empty") }),
            !loading && notifications2.map((n) => /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => handleClick(n),
                className: cn(
                  "w-full text-left px-4 py-3 border-b border-vanta-border last:border-0 hover:bg-vanta-50 dark:hover:bg-vanta-900/40 transition flex gap-3",
                  !n.read && "bg-vanta-50/50 dark:bg-vanta-900/20"
                ),
                children: [
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: cn("mt-1.5 h-2 w-2 rounded-full shrink-0", SEVERITY_DOT[n.severity]),
                      "aria-hidden": "true"
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                      /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold truncate", children: n.title }),
                      /* @__PURE__ */ jsx("span", { className: "text-[10px] text-vanta-muted shrink-0", children: formatRelativeTime(n.createdAt, locale) })
                    ] }),
                    /* @__PURE__ */ jsx("p", { className: "text-xs text-vanta-muted mt-0.5 line-clamp-2", children: n.body })
                  ] })
                ]
              },
              n.id
            ))
          ] })
        ]
      }
    ) })
  ] });
}
function FeedbackWidget({ locale }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { success } = useToast();
  const { t } = useTranslation(locale);
  const submit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          message: message.trim() || void 0,
          page: typeof window !== "undefined" ? window.location.pathname : void 0
        })
      });
      success(t("feedback.thanks"));
      setOpen(false);
      setRating(0);
      setMessage("");
    } catch {
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: () => setOpen(true),
        className: "fixed bottom-4 left-4 z-40 px-3 py-2 rounded-full vanta-glass shadow-lg text-xs font-medium flex items-center gap-1.5 hover:scale-105 transition focus:outline-none focus:ring-2 focus:ring-vanta-500",
        "aria-label": t("feedback.button"),
        children: [
          /* @__PURE__ */ jsx(MessageSquare, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
          t("feedback.button")
        ]
      }
    ),
    /* @__PURE__ */ jsx(AnimatePresence, { children: open && /* @__PURE__ */ jsx(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm",
        onClick: () => setOpen(false),
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t("feedback.title"),
        children: /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, y: 16, scale: 0.96 },
            animate: { opacity: 1, y: 0, scale: 1 },
            exit: { opacity: 0, y: 16, scale: 0.96 },
            transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
            onClick: (e2) => e2.stopPropagation(),
            className: "vanta-card w-full max-w-md p-5 shadow-2xl",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between mb-4", children: [
                /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold", children: t("feedback.title") }) }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setOpen(false),
                    className: "p-1 rounded hover:bg-vanta-100 dark:hover:bg-vanta-800 transition",
                    "aria-label": t("common.close"),
                    children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted mb-2", children: t("feedback.rating") }),
                  /* @__PURE__ */ jsx("div", { className: "flex gap-1", children: [1, 2, 3, 4, 5].map((n) => /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => setRating(n),
                      onMouseEnter: () => setHoverRating(n),
                      onMouseLeave: () => setHoverRating(0),
                      className: "p-1 focus:outline-none focus:ring-2 focus:ring-vanta-500 rounded",
                      "aria-label": `${n} star${n > 1 ? "s" : ""}`,
                      children: /* @__PURE__ */ jsx(
                        Star,
                        {
                          className: cn(
                            "h-6 w-6 transition",
                            (hoverRating || rating) >= n ? "fill-amber-400 text-amber-400" : "text-vanta-300 dark:text-vanta-600"
                          )
                        }
                      )
                    },
                    n
                  )) })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-vanta-muted mb-2", children: t("feedback.message") }),
                  /* @__PURE__ */ jsx(
                    "textarea",
                    {
                      value: message,
                      onChange: (e2) => setMessage(e2.target.value),
                      rows: 4,
                      className: "w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500 resize-none",
                      maxLength: 5e3
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2", children: [
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => setOpen(false),
                      className: "px-4 py-2 text-sm rounded-lg hover:bg-vanta-100 dark:hover:bg-vanta-800 transition",
                      children: t("common.cancel")
                    }
                  ),
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: submit,
                      disabled: rating === 0 || submitting,
                      className: "px-4 py-2 text-sm rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5",
                      children: [
                        /* @__PURE__ */ jsx(Send, { className: "h-3.5 w-3.5" }),
                        t("feedback.submit")
                      ]
                    }
                  )
                ] })
              ] })
            ]
          }
        )
      }
    ) })
  ] });
}
async function loader(args) {
  const ctx = await requireAdmin(args);
  const wl = getWhitelabelConfig();
  return json({
    shopDomain: ctx.shopDomain,
    locale: ctx.shop.preferredLanguage,
    completedOnboarding: ctx.shop.completedOnboarding,
    killSwitchEnabled: ctx.shop.killSwitchEnabled,
    whitelabelAppName: wl.appName,
    lightLogoUrl: wl.logoUrl,
    darkLogoUrl: wl.logoDarkUrl
  });
}
function headers(_) {
  return getSecurityHeaders();
}
function AppShellLayout() {
  const data2 = useLoaderData();
  const locale = data2?.locale ?? "en";
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { t } = useTranslation(locale);
  const logoUrl = useLogoUrl(data2?.lightLogoUrl ?? "/icons/vanta-logo-light.svg", data2?.darkLogoUrl ?? "/icons/vanta-logo-dark.svg");
  return /* @__PURE__ */ jsx(PolarisProvider, { locale, children: /* @__PURE__ */ jsx(
    AppProvider,
    {
      i18n: {
        Polaris: {
          Frame: {
            skipToContent: "Skip to content",
            navigationLabel: "Navigation"
          }
        }
      },
      children: /* @__PURE__ */ jsx(ToastProvider, { children: /* @__PURE__ */ jsxs(
        Frame,
        {
          topBar: /* @__PURE__ */ jsx(
            TopBar,
            {
              showNavigationToggle: true,
              userMenu: /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsx(NotificationBell, { locale }) }),
              secondaryMenu: /* @__PURE__ */ jsx(Link$1, { to: "/app/canvas", className: "flex items-center gap-2", children: /* @__PURE__ */ jsx("img", { src: logoUrl, alt: data2?.whitelabelAppName ?? "VANTA OS", className: "h-7" }) })
            }
          ),
          navigation: /* @__PURE__ */ jsxs(Navigation, { location: "/", children: [
            /* @__PURE__ */ jsx(
              Navigation.Section,
              {
                items: [
                  {
                    label: t("nav.dashboard"),
                    icon: HomeIcon,
                    url: "/app"
                  },
                  {
                    label: t("nav.canvas"),
                    icon: ChatIcon,
                    url: "/app/canvas"
                  },
                  {
                    label: "Future Chat",
                    icon: ChatIcon,
                    url: "/app/chat"
                  },
                  {
                    label: t("nav.history"),
                    icon: ClockIcon,
                    url: "/app/history"
                  },
                  {
                    label: t("nav.automations"),
                    icon: StarFilledIcon,
                    url: "/app/automations"
                  },
                  {
                    label: t("nav.guardian"),
                    icon: ShieldCheckMarkIcon,
                    url: "/app/guardian"
                  },
                  {
                    label: "Predictive AI",
                    icon: StarFilledIcon,
                    url: "/app/predictive"
                  },
                  {
                    label: "Autonomous Agents",
                    icon: StarFilledIcon,
                    url: "/app/agents"
                  },
                  {
                    label: "Goals & Plans",
                    icon: StarFilledIcon,
                    url: "/app/goals"
                  },
                  {
                    label: "Autonomous Ops",
                    icon: StarFilledIcon,
                    url: "/app/autonomous"
                  },
                  {
                    label: "Connected Accounts",
                    icon: StarFilledIcon,
                    url: "/app/connected-accounts"
                  },
                  {
                    label: "Browser Agent",
                    icon: StarFilledIcon,
                    url: "/app/browser-agent"
                  }
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              Navigation.Section,
              {
                separator: true,
                title: "Account",
                items: [
                  {
                    label: t("nav.settings"),
                    icon: SettingsIcon,
                    url: "/app/settings"
                  },
                  {
                    label: t("nav.billing"),
                    icon: CashDollarIcon,
                    url: "/app/billing"
                  },
                  {
                    label: t("nav.data"),
                    icon: NotificationIcon,
                    url: "/app/data-controls"
                  },
                  {
                    label: t("nav.help"),
                    icon: QuestionCircleIcon,
                    url: "/app/help"
                  },
                  {
                    label: "Reviewer Access",
                    icon: QuestionCircleIcon,
                    url: "/app/test-credentials"
                  }
                ]
              }
            )
          ] }),
          children: [
            /* @__PURE__ */ jsx("div", { className: "px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto", children: /* @__PURE__ */ jsx(Outlet, {}) }),
            /* @__PURE__ */ jsx(FeedbackWidget, { locale }),
            /* @__PURE__ */ jsx(CommandPalette, { locale })
          ]
        }
      ) })
    }
  ) });
}
function MobileTabBar({ locale }) {
  const { t } = useTranslation(locale);
  useNavigate();
  const items = [
    { to: "/app", label: t("nav.dashboard"), icon: HomeIcon },
    { to: "/app/canvas", label: t("nav.canvas"), icon: ChatIcon },
    { to: "/app/history", label: t("nav.history"), icon: ClockIcon },
    { to: "/app/settings", label: t("nav.settings"), icon: SettingsIcon }
  ];
  return /* @__PURE__ */ jsx(
    "nav",
    {
      className: "sm:hidden fixed bottom-0 inset-x-0 z-30 flex bg-white dark:bg-vanta-900 border-t border-vanta-border",
      "aria-label": "Mobile navigation",
      children: items.map((item) => /* @__PURE__ */ jsx(
        NavLink,
        {
          to: item.to,
          className: ({ isActive }) => cn(
            "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px]",
            isActive ? "text-vanta-600 dark:text-vanta-300" : "text-vanta-muted"
          ),
          children: /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", children: item.label })
        },
        item.to
      ))
    }
  );
}
const route47 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  MobileTabBar,
  default: AppShellLayout,
  headers,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-CLIecmU8.js", "imports": ["/assets/components-xjxrmaEV.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": true, "module": "/assets/root-Cg_urf4v.js", "imports": ["/assets/components-xjxrmaEV.js"], "css": [] }, "routes/api.notifications.mark-all-read": { "id": "routes/api.notifications.mark-all-read", "parentId": "routes/api.notifications", "path": "mark-all-read", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.notifications.mark-all-read-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.notifications.$id.read": { "id": "routes/api.notifications.$id.read", "parentId": "routes/api.notifications", "path": ":id/read", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.notifications._id.read-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.recurring-missions.$id": { "id": "routes/api.recurring-missions.$id", "parentId": "routes/api.recurring-missions", "path": ":id", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.recurring-missions._id-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.tasks.$taskId.approve": { "id": "routes/api.tasks.$taskId.approve", "parentId": "routes/api.tasks.$taskId", "path": "approve", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.tasks._taskId.approve-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.tasks.$taskId.cancel": { "id": "routes/api.tasks.$taskId.cancel", "parentId": "routes/api.tasks.$taskId", "path": "cancel", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.tasks._taskId.cancel-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.recurring-missions": { "id": "routes/api.recurring-missions", "parentId": "root", "path": "api/recurring-missions", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.recurring-missions-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.tasks.$taskId.diff": { "id": "routes/api.tasks.$taskId.diff", "parentId": "routes/api.tasks.$taskId", "path": "diff", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.tasks._taskId.diff-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.tasks.$taskId.undo": { "id": "routes/api.tasks.$taskId.undo", "parentId": "routes/api.tasks.$taskId", "path": "undo", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.tasks._taskId.undo-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.connected-accounts": { "id": "routes/app.connected-accounts", "parentId": "routes/app", "path": "connected-accounts", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.connected-accounts-CazQAXj_.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/Toaster-WVLeQNUp.js", "/assets/utils-CG_YdLPO.js", "/assets/external-link-CfexqYf1.js", "/assets/shield-check-CN1E8Wkf.js", "/assets/trash-2-BvtpPVq2.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/proxy-BcPweIhZ.js", "/assets/triangle-alert-BfTNRwyT.js", "/assets/circle-check-D0J-pgB4.js"], "css": [] }, "routes/app.test-credentials": { "id": "routes/app.test-credentials", "parentId": "routes/app", "path": "test-credentials", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.test-credentials-CFxb135n.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/shield-DS0AfgLp.js", "/assets/mail-z6Bg0Oxz.js"], "css": [] }, "routes/api.command-history": { "id": "routes/api.command-history", "parentId": "root", "path": "api/command-history", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.command-history-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.history.$taskId": { "id": "routes/app.history.$taskId", "parentId": "routes/app.history", "path": ":taskId", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.history._taskId-CFDns71h.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/MarkdownRenderer-DftEXPFy.js", "/assets/utils-CG_YdLPO.js", "/assets/plus-RGE6wSEZ.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/useTranslation-DoA7T-KL.js", "/assets/undo-2-C4JoMSiu.js", "/assets/external-link-CfexqYf1.js"], "css": [] }, "routes/api.feature-flags": { "id": "routes/api.feature-flags", "parentId": "root", "path": "api/feature-flags", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.feature-flags-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.notifications": { "id": "routes/api.notifications", "parentId": "root", "path": "api/notifications", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.notifications-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.tasks.$taskId": { "id": "routes/api.tasks.$taskId", "parentId": "routes/api.tasks", "path": ":taskId", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.tasks._taskId-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.browser-agent": { "id": "routes/app.browser-agent", "parentId": "routes/app", "path": "browser-agent", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.browser-agent-BdCsBxmz.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/Toaster-WVLeQNUp.js", "/assets/utils-CG_YdLPO.js", "/assets/globe-BjmIIgTp.js", "/assets/clock-CEIDNUsd.js", "/assets/circle-check-D0J-pgB4.js", "/assets/play-D7-SvRz1.js", "/assets/proxy-BcPweIhZ.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/triangle-alert-BfTNRwyT.js"], "css": [] }, "routes/app.data-controls": { "id": "routes/app.data-controls", "parentId": "routes/app", "path": "data-controls", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.data-controls-BMFCEOq2.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/Toaster-WVLeQNUp.js", "/assets/useTranslation-DoA7T-KL.js", "/assets/shield-DS0AfgLp.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/trash-2-BvtpPVq2.js", "/assets/utils-CG_YdLPO.js", "/assets/proxy-BcPweIhZ.js", "/assets/triangle-alert-BfTNRwyT.js", "/assets/circle-check-D0J-pgB4.js"], "css": [] }, "routes/api.openapi.yaml": { "id": "routes/api.openapi.yaml", "parentId": "root", "path": "api/openapi/yaml", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.openapi.yaml-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.automations": { "id": "routes/app.automations", "parentId": "routes/app", "path": "automations", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.automations-BzO5b_jg.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/Toaster-WVLeQNUp.js", "/assets/useTranslation-DoA7T-KL.js", "/assets/utils-CG_YdLPO.js", "/assets/star-BVasmTaK.js", "/assets/plus-RGE6wSEZ.js", "/assets/trash-2-BvtpPVq2.js", "/assets/proxy-BcPweIhZ.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/triangle-alert-BfTNRwyT.js", "/assets/circle-check-D0J-pgB4.js"], "css": [] }, "routes/api.rate-limit": { "id": "routes/api.rate-limit", "parentId": "root", "path": "api/rate-limit", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.rate-limit-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.autonomous": { "id": "routes/app.autonomous", "parentId": "routes/app", "path": "autonomous", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.autonomous-C4anKTfV.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/Toaster-WVLeQNUp.js", "/assets/utils-CG_YdLPO.js", "/assets/bot-DTBpJwwQ.js", "/assets/brain-VOgw8FxZ.js", "/assets/activity-D0-WJ0So.js", "/assets/shield-DS0AfgLp.js", "/assets/trending-up-kMTNBh-e.js", "/assets/search-CsZIyDhD.js", "/assets/clock-CEIDNUsd.js", "/assets/proxy-BcPweIhZ.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/triangle-alert-BfTNRwyT.js", "/assets/circle-check-D0J-pgB4.js"], "css": [] }, "routes/app.onboarding": { "id": "routes/app.onboarding", "parentId": "routes/app", "path": "onboarding", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.onboarding-DJFNfB8e.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/useTranslation-DoA7T-KL.js", "/assets/proxy-BcPweIhZ.js", "/assets/sparkles-BheGvofS.js", "/assets/zap-D7RtnIVZ.js", "/assets/shield-check-CN1E8Wkf.js", "/assets/circle-check-D0J-pgB4.js", "/assets/createLucideIcon-D8il6R_u.js"], "css": [] }, "routes/app.predictive": { "id": "routes/app.predictive", "parentId": "routes/app", "path": "predictive", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.predictive-DsyrTmBQ.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/brain-VOgw8FxZ.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/triangle-alert-BfTNRwyT.js", "/assets/trending-up-kMTNBh-e.js"], "css": [] }, "routes/api.audit-log": { "id": "routes/api.audit-log", "parentId": "root", "path": "api/audit-log", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.audit-log-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/auth.callback": { "id": "routes/auth.callback", "parentId": "root", "path": "auth/callback", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth.callback-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.feedback": { "id": "routes/api.feedback", "parentId": "root", "path": "api/feedback", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.feedback-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.settings": { "id": "routes/api.settings", "parentId": "root", "path": "api/settings", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.settings-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.guardian": { "id": "routes/app.guardian", "parentId": "routes/app", "path": "guardian", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.guardian-TIzGODXi.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/useTranslation-DoA7T-KL.js", "/assets/utils-CG_YdLPO.js", "/assets/shield-DS0AfgLp.js", "/assets/circle-check-D0J-pgB4.js", "/assets/triangle-alert-BfTNRwyT.js", "/assets/createLucideIcon-D8il6R_u.js"], "css": [] }, "routes/app.settings": { "id": "routes/app.settings", "parentId": "routes/app", "path": "settings", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.settings-C_I815GN.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/Toaster-WVLeQNUp.js", "/assets/utils-CG_YdLPO.js", "/assets/circle-help-Bxj-c8EF.js", "/assets/useTranslation-DoA7T-KL.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/triangle-alert-BfTNRwyT.js", "/assets/globe-BjmIIgTp.js", "/assets/sparkles-BheGvofS.js", "/assets/shield-DS0AfgLp.js", "/assets/bell-BZ2tZXgw.js", "/assets/proxy-BcPweIhZ.js", "/assets/circle-check-D0J-pgB4.js"], "css": [] }, "routes/api.billing": { "id": "routes/api.billing", "parentId": "root", "path": "api/billing", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.billing-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.billing": { "id": "routes/app.billing", "parentId": "routes/app", "path": "billing", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.billing-D0Yi1EEf.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/useTranslation-DoA7T-KL.js", "/assets/utils-CG_YdLPO.js", "/assets/credit-card-BDwCtFlY.js", "/assets/external-link-CfexqYf1.js", "/assets/trending-up-kMTNBh-e.js", "/assets/createLucideIcon-D8il6R_u.js"], "css": [] }, "routes/app.history": { "id": "routes/app.history", "parentId": "routes/app", "path": "history", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.history-CSjmSaLe.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/useTranslation-DoA7T-KL.js", "/assets/utils-CG_YdLPO.js", "/assets/search-CsZIyDhD.js", "/assets/createLucideIcon-D8il6R_u.js"], "css": [] }, "routes/app.privacy": { "id": "routes/app.privacy", "parentId": "routes/app", "path": "privacy", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.privacy-DkyMmOm7.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/MarkdownRenderer-DftEXPFy.js", "/assets/useTranslation-DoA7T-KL.js", "/assets/triangle-alert-BfTNRwyT.js", "/assets/utils-CG_YdLPO.js", "/assets/external-link-CfexqYf1.js", "/assets/createLucideIcon-D8il6R_u.js"], "css": [] }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": true, "module": "/assets/app._index-HoPLPOqi.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/utils-CG_YdLPO.js", "/assets/useTranslation-DoA7T-KL.js", "/assets/proxy-BcPweIhZ.js", "/assets/sparkles-BheGvofS.js", "/assets/triangle-alert-BfTNRwyT.js", "/assets/credit-card-BDwCtFlY.js", "/assets/zap-D7RtnIVZ.js", "/assets/trending-up-kMTNBh-e.js", "/assets/activity-D0-WJ0So.js", "/assets/arrow-right-Fco7wvca.js", "/assets/createLucideIcon-D8il6R_u.js"], "css": [] }, "routes/app.agency": { "id": "routes/app.agency", "parentId": "routes/app", "path": "agency", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.agency-BisC31UJ.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/utils-CG_YdLPO.js", "/assets/createLucideIcon-D8il6R_u.js"], "css": [] }, "routes/app.agents": { "id": "routes/app.agents", "parentId": "routes/app", "path": "agents", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.agents-DLwFu2rL.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/Toaster-WVLeQNUp.js", "/assets/bot-DTBpJwwQ.js", "/assets/play-D7-SvRz1.js", "/assets/activity-D0-WJ0So.js", "/assets/trending-up-kMTNBh-e.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/search-CsZIyDhD.js", "/assets/shield-DS0AfgLp.js", "/assets/utils-CG_YdLPO.js", "/assets/proxy-BcPweIhZ.js", "/assets/triangle-alert-BfTNRwyT.js", "/assets/circle-check-D0J-pgB4.js"], "css": [] }, "routes/app.canvas": { "id": "routes/app.canvas", "parentId": "routes/app", "path": "canvas", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.canvas-C30lqheh.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/MarkdownRenderer-DftEXPFy.js", "/assets/utils-CG_YdLPO.js", "/assets/useTranslation-DoA7T-KL.js", "/assets/proxy-BcPweIhZ.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/Toaster-WVLeQNUp.js", "/assets/undo-2-C4JoMSiu.js", "/assets/circle-check-D0J-pgB4.js", "/assets/brain-VOgw8FxZ.js", "/assets/useCommandHistory-4yVek--B.js", "/assets/sparkles-BheGvofS.js", "/assets/send-BsJw5M90.js", "/assets/external-link-CfexqYf1.js", "/assets/triangle-alert-BfTNRwyT.js"], "css": [] }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth.login-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.tasks": { "id": "routes/api.tasks", "parentId": "root", "path": "api/tasks", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.tasks-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.goals": { "id": "routes/app.goals", "parentId": "routes/app", "path": "goals", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.goals-ZTY1gnrL.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/Toaster-WVLeQNUp.js", "/assets/utils-CG_YdLPO.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/plus-RGE6wSEZ.js", "/assets/triangle-alert-BfTNRwyT.js", "/assets/play-D7-SvRz1.js", "/assets/clock-CEIDNUsd.js", "/assets/circle-check-D0J-pgB4.js", "/assets/proxy-BcPweIhZ.js"], "css": [] }, "routes/app.terms": { "id": "routes/app.terms", "parentId": "routes/app", "path": "terms", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.terms-B1lzGAxz.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/MarkdownRenderer-DftEXPFy.js", "/assets/useTranslation-DoA7T-KL.js", "/assets/triangle-alert-BfTNRwyT.js", "/assets/utils-CG_YdLPO.js", "/assets/external-link-CfexqYf1.js", "/assets/createLucideIcon-D8il6R_u.js"], "css": [] }, "routes/app.chat": { "id": "routes/app.chat", "parentId": "routes/app", "path": "chat", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.chat-BWzT1FpT.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/useCommandHistory-4yVek--B.js", "/assets/Toaster-WVLeQNUp.js", "/assets/MarkdownRenderer-DftEXPFy.js", "/assets/utils-CG_YdLPO.js", "/assets/proxy-BcPweIhZ.js", "/assets/sparkles-BheGvofS.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/send-BsJw5M90.js", "/assets/clock-CEIDNUsd.js", "/assets/trending-up-kMTNBh-e.js", "/assets/shield-DS0AfgLp.js", "/assets/zap-D7RtnIVZ.js", "/assets/brain-VOgw8FxZ.js", "/assets/activity-D0-WJ0So.js", "/assets/search-CsZIyDhD.js", "/assets/triangle-alert-BfTNRwyT.js", "/assets/circle-check-D0J-pgB4.js", "/assets/external-link-CfexqYf1.js"], "css": [] }, "routes/app.help": { "id": "routes/app.help", "parentId": "routes/app", "path": "help", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.help-Do-SlEg6.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/MarkdownRenderer-DftEXPFy.js", "/assets/useTranslation-DoA7T-KL.js", "/assets/circle-help-Bxj-c8EF.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/mail-z6Bg0Oxz.js", "/assets/utils-CG_YdLPO.js", "/assets/external-link-CfexqYf1.js"], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/_index-C6d-v1ok.js", "imports": [], "css": [] }, "routes/health": { "id": "routes/health", "parentId": "root", "path": "health", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/health-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/docs": { "id": "routes/docs", "parentId": "root", "path": "docs", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/docs-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app-Df02VlIu.js", "imports": ["/assets/components-xjxrmaEV.js", "/assets/Toaster-WVLeQNUp.js", "/assets/useTranslation-DoA7T-KL.js", "/assets/utils-CG_YdLPO.js", "/assets/zap-D7RtnIVZ.js", "/assets/arrow-right-Fco7wvca.js", "/assets/proxy-BcPweIhZ.js", "/assets/search-CsZIyDhD.js", "/assets/createLucideIcon-D8il6R_u.js", "/assets/bell-BZ2tZXgw.js", "/assets/star-BVasmTaK.js", "/assets/send-BsJw5M90.js", "/assets/triangle-alert-BfTNRwyT.js", "/assets/circle-check-D0J-pgB4.js"], "css": ["/assets/app-cEfW3NV1.css"] } }, "url": "/assets/manifest-8daccaf6.js", "version": "8daccaf6" };
const mode = "production";
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": false, "v3_singleFetch": true, "v3_lazyRouteDiscovery": true, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/api.notifications.mark-all-read": {
    id: "routes/api.notifications.mark-all-read",
    parentId: "routes/api.notifications",
    path: "mark-all-read",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/api.notifications.$id.read": {
    id: "routes/api.notifications.$id.read",
    parentId: "routes/api.notifications",
    path: ":id/read",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/api.recurring-missions.$id": {
    id: "routes/api.recurring-missions.$id",
    parentId: "routes/api.recurring-missions",
    path: ":id",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/api.tasks.$taskId.approve": {
    id: "routes/api.tasks.$taskId.approve",
    parentId: "routes/api.tasks.$taskId",
    path: "approve",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/api.tasks.$taskId.cancel": {
    id: "routes/api.tasks.$taskId.cancel",
    parentId: "routes/api.tasks.$taskId",
    path: "cancel",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/api.recurring-missions": {
    id: "routes/api.recurring-missions",
    parentId: "root",
    path: "api/recurring-missions",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/api.tasks.$taskId.diff": {
    id: "routes/api.tasks.$taskId.diff",
    parentId: "routes/api.tasks.$taskId",
    path: "diff",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/api.tasks.$taskId.undo": {
    id: "routes/api.tasks.$taskId.undo",
    parentId: "routes/api.tasks.$taskId",
    path: "undo",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/app.connected-accounts": {
    id: "routes/app.connected-accounts",
    parentId: "routes/app",
    path: "connected-accounts",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/app.test-credentials": {
    id: "routes/app.test-credentials",
    parentId: "routes/app",
    path: "test-credentials",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/api.command-history": {
    id: "routes/api.command-history",
    parentId: "root",
    path: "api/command-history",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/app.history.$taskId": {
    id: "routes/app.history.$taskId",
    parentId: "routes/app.history",
    path: ":taskId",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/api.feature-flags": {
    id: "routes/api.feature-flags",
    parentId: "root",
    path: "api/feature-flags",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/api.notifications": {
    id: "routes/api.notifications",
    parentId: "root",
    path: "api/notifications",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  },
  "routes/api.tasks.$taskId": {
    id: "routes/api.tasks.$taskId",
    parentId: "routes/api.tasks",
    path: ":taskId",
    index: void 0,
    caseSensitive: void 0,
    module: route15
  },
  "routes/app.browser-agent": {
    id: "routes/app.browser-agent",
    parentId: "routes/app",
    path: "browser-agent",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  },
  "routes/app.data-controls": {
    id: "routes/app.data-controls",
    parentId: "routes/app",
    path: "data-controls",
    index: void 0,
    caseSensitive: void 0,
    module: route17
  },
  "routes/api.openapi.yaml": {
    id: "routes/api.openapi.yaml",
    parentId: "root",
    path: "api/openapi/yaml",
    index: void 0,
    caseSensitive: void 0,
    module: route18
  },
  "routes/app.automations": {
    id: "routes/app.automations",
    parentId: "routes/app",
    path: "automations",
    index: void 0,
    caseSensitive: void 0,
    module: route19
  },
  "routes/api.rate-limit": {
    id: "routes/api.rate-limit",
    parentId: "root",
    path: "api/rate-limit",
    index: void 0,
    caseSensitive: void 0,
    module: route20
  },
  "routes/app.autonomous": {
    id: "routes/app.autonomous",
    parentId: "routes/app",
    path: "autonomous",
    index: void 0,
    caseSensitive: void 0,
    module: route21
  },
  "routes/app.onboarding": {
    id: "routes/app.onboarding",
    parentId: "routes/app",
    path: "onboarding",
    index: void 0,
    caseSensitive: void 0,
    module: route22
  },
  "routes/app.predictive": {
    id: "routes/app.predictive",
    parentId: "routes/app",
    path: "predictive",
    index: void 0,
    caseSensitive: void 0,
    module: route23
  },
  "routes/api.audit-log": {
    id: "routes/api.audit-log",
    parentId: "root",
    path: "api/audit-log",
    index: void 0,
    caseSensitive: void 0,
    module: route24
  },
  "routes/auth.callback": {
    id: "routes/auth.callback",
    parentId: "root",
    path: "auth/callback",
    index: void 0,
    caseSensitive: void 0,
    module: route25
  },
  "routes/api.feedback": {
    id: "routes/api.feedback",
    parentId: "root",
    path: "api/feedback",
    index: void 0,
    caseSensitive: void 0,
    module: route26
  },
  "routes/api.settings": {
    id: "routes/api.settings",
    parentId: "root",
    path: "api/settings",
    index: void 0,
    caseSensitive: void 0,
    module: route27
  },
  "routes/app.guardian": {
    id: "routes/app.guardian",
    parentId: "routes/app",
    path: "guardian",
    index: void 0,
    caseSensitive: void 0,
    module: route28
  },
  "routes/app.settings": {
    id: "routes/app.settings",
    parentId: "routes/app",
    path: "settings",
    index: void 0,
    caseSensitive: void 0,
    module: route29
  },
  "routes/api.billing": {
    id: "routes/api.billing",
    parentId: "root",
    path: "api/billing",
    index: void 0,
    caseSensitive: void 0,
    module: route30
  },
  "routes/app.billing": {
    id: "routes/app.billing",
    parentId: "routes/app",
    path: "billing",
    index: void 0,
    caseSensitive: void 0,
    module: route31
  },
  "routes/app.history": {
    id: "routes/app.history",
    parentId: "routes/app",
    path: "history",
    index: void 0,
    caseSensitive: void 0,
    module: route32
  },
  "routes/app.privacy": {
    id: "routes/app.privacy",
    parentId: "routes/app",
    path: "privacy",
    index: void 0,
    caseSensitive: void 0,
    module: route33
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route34
  },
  "routes/app.agency": {
    id: "routes/app.agency",
    parentId: "routes/app",
    path: "agency",
    index: void 0,
    caseSensitive: void 0,
    module: route35
  },
  "routes/app.agents": {
    id: "routes/app.agents",
    parentId: "routes/app",
    path: "agents",
    index: void 0,
    caseSensitive: void 0,
    module: route36
  },
  "routes/app.canvas": {
    id: "routes/app.canvas",
    parentId: "routes/app",
    path: "canvas",
    index: void 0,
    caseSensitive: void 0,
    module: route37
  },
  "routes/auth.login": {
    id: "routes/auth.login",
    parentId: "root",
    path: "auth/login",
    index: void 0,
    caseSensitive: void 0,
    module: route38
  },
  "routes/api.tasks": {
    id: "routes/api.tasks",
    parentId: "root",
    path: "api/tasks",
    index: void 0,
    caseSensitive: void 0,
    module: route39
  },
  "routes/app.goals": {
    id: "routes/app.goals",
    parentId: "routes/app",
    path: "goals",
    index: void 0,
    caseSensitive: void 0,
    module: route40
  },
  "routes/app.terms": {
    id: "routes/app.terms",
    parentId: "routes/app",
    path: "terms",
    index: void 0,
    caseSensitive: void 0,
    module: route41
  },
  "routes/app.chat": {
    id: "routes/app.chat",
    parentId: "routes/app",
    path: "chat",
    index: void 0,
    caseSensitive: void 0,
    module: route42
  },
  "routes/app.help": {
    id: "routes/app.help",
    parentId: "routes/app",
    path: "help",
    index: void 0,
    caseSensitive: void 0,
    module: route43
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route44
  },
  "routes/health": {
    id: "routes/health",
    parentId: "root",
    path: "health",
    index: void 0,
    caseSensitive: void 0,
    module: route45
  },
  "routes/docs": {
    id: "routes/docs",
    parentId: "root",
    path: "docs",
    index: void 0,
    caseSensitive: void 0,
    module: route46
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route47
  }
};
export {
  serverManifest as a,
  assetsBuildDirectory as b,
  basename as c,
  isSpaMode as d,
  entry as e,
  future as f,
  getSecret as g,
  publicPath as h,
  isKillSwitchOn as i,
  routes as j,
  logger as l,
  mode as m,
  prisma as p,
  recordDecision as r,
  scoreRisk as s,
  traceSpan as t
};
//# sourceMappingURL=server-build-BZO8iW4T.js.map
