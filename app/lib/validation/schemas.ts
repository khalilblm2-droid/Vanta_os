// =============================================================================
// VANTA OS — Zod Validation Layer (Section 66)
// Every piece of data entering the backend — task commands, webhook payloads,
// API request bodies, CSV uploads — MUST pass through a Zod schema before
// touching business logic or database queries.
// On failure: structured 400 with field-level human-readable explanations.
// =============================================================================

import { z } from "zod";

// --- Generic helpers ---------------------------------------------------------

/** Formats Zod errors into a human-readable field-level object. */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    out[path] = out[path] ? `${out[path]}; ${issue.message}` : issue.message;
  }
  return out;
}

/** Wraps schema parsing and throws a ValidationError with structured details. */
export function validate<T>(schema: z.ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const err = new Error("Validation failed");
    err.name = "ValidationError";
    (err as ValidationError).fields = formatZodErrors(result.error);
    throw err;
  }
  return result.data;
}

export interface ValidationError extends Error {
  fields: Record<string, string>;
}

export function isValidationError(e: unknown): e is ValidationError {
  return e instanceof Error && e.name === "ValidationError" && "fields" in e;
}

// --- Task creation schema (Section 9, Section 65) ---------------------------

export const TaskPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const CreateTaskSchema = z.object({
  command: z
    .string()
    .trim()
    .min(3, "Command must be at least 3 characters")
    .max(2000, "Command must be 2000 characters or fewer"), // Section 65
  language: z.enum(["en", "ar", "fr"]).default("en"), // Section 57
  priority: TaskPrioritySchema.default("NORMAL"), // Section 54
  threadParentId: z.string().cuid().optional(), // Section 29
  csvAttachmentUrl: z.string().url().optional(), // Section 36
  isRecurring: z.boolean().default(false), // Section 33
  recurringCron: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[0-9*/,\- ]+$/.test(v),
      "Cron expression contains invalid characters",
    ),
  estimatedCredits: z.number().int().min(1).max(100).default(1),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

// --- Approval schema (Section 10) -------------------------------------------

export const ApproveTaskSchema = z.object({
  taskId: z.string().cuid(),
  approved: z.boolean(),
  modifications: z.string().max(2000).optional(),
});

// --- Undo schema (Section 22) -----------------------------------------------

export const UndoTaskSchema = z.object({
  taskId: z.string().cuid(),
  resourceIds: z.array(z.string()).optional(),
});

// --- Feedback schema (Section 82) -------------------------------------------

export const FeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().max(5000).optional(),
  page: z.string().max(200).optional(),
  screenshotUrl: z.string().url().optional(),
});

// --- Settings schemas (Section 9.5) -----------------------------------------

export const UpdateSettingsSchema = z.object({
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
  bulkThreshold: z.number().int().min(1).max(10000).optional(),
  notifyOnTaskComplete: z.boolean().optional(),
  notifyOnGuardianAlert: z.boolean().optional(),
  notifyOnError: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  guardianModeEnabled: z.boolean().optional(),
  guardianIntervalHours: z.number().int().min(1).max(72).optional(),
  killSwitchEnabled: z.boolean().optional(),
  killSwitchReason: z.string().max(500).optional(),
  completedOnboarding: z.boolean().optional(),
});

// --- Webhook payload schemas (Section 5.2) ----------------------------------

export const CustomerRedactPayloadSchema = z.object({
  shop_id: z.number(),
  shop_domain: z.string(),
  customer: z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }),
  orders_to_redact: z.array(z.string()).default([]),
});

export const CustomerDataRequestPayloadSchema = z.object({
  shop_id: z.number(),
  shop_domain: z.string(),
  customer: z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }),
  orders_requested: z.array(z.string()).default([]),
});

export const ShopRedactPayloadSchema = z.object({
  shop_id: z.number(),
  shop_domain: z.string(),
});

export const AppUninstalledPayloadSchema = z.object({
  shop_id: z.number(),
  shop_domain: z.string(),
  name: z.string().optional(),
  domain: z.string().optional(),
});

// --- Recurring Mission (Section 33, Section 84) -----------------------------

export const RecurringMissionSchema = z.object({
  prompt: z.string().trim().min(3).max(2000),
  cron: z.string().min(1).max(120),
  timezone: z.string().min(1).max(60).default("UTC"),
});

// --- Command history lookup (Section 50) ------------------------------------

export const CommandHistoryQuerySchema = z.object({
  limit: z.number().int().min(1).max(20).default(20),
  cursor: z.string().optional(),
});

// --- Feature flag toggle (Section 70) ---------------------------------------

export const FeatureFlagToggleSchema = z.object({
  key: z.string().min(1).max(80),
  enabled: z.boolean(),
});
