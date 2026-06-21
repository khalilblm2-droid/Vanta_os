// =============================================================================
// VANTA OS — Structured logger (Section 40)
// JSON output with timestamp, shop_domain, log_level, task_id, message
// Sentry integration is wired lazily to avoid hard runtime dependency.
// =============================================================================

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  shopDomain?: string;
  taskId?: string;
  staffId?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, ctx: LogContext = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    log_level: level.toUpperCase(),
    message,
    ...ctx,
  };
  const line = JSON.stringify(entry);

  if (level === "error") {
    process.stderr.write(line + "\n");
    // Forward to Sentry if DSN is set
    if (process.env.SENTRY_DSN) {
      // Lazy import to keep the worker light if Sentry isn't configured
      import("@sentry/node")
        .then((Sentry) => Sentry.captureException(new Error(message)))
        .catch(() => {});
    }
  } else if (level === "warn") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => emit("debug", msg, ctx),
  info: (msg: string, ctx?: LogContext) => emit("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => emit("warn", msg, ctx),
  error: (msg: string, ctx?: LogContext) => emit("error", msg, ctx),
};
