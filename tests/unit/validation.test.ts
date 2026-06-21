// =============================================================================
// VANTA OS — Validation Schemas Tests (Section 41, Section 66)
// =============================================================================

import { describe, expect, it } from "vitest";
import {
  CreateTaskSchema,
  validate,
  isValidationError,
  TaskPrioritySchema,
} from "~/lib/validation/schemas";

describe("CreateTaskSchema", () => {
  it("accepts a valid task with defaults", () => {
    const r = validate(CreateTaskSchema, { command: "Update prices to $20" });
    expect(r.command).toBe("Update prices to $20");
    expect(r.priority).toBe("NORMAL");
    expect(r.language).toBe("en");
    expect(r.estimatedCredits).toBe(1);
  });

  it("rejects commands under 3 chars", () => {
    expect(() => validate(CreateTaskSchema, { command: "ab" })).toThrow();
  });

  it("rejects commands over 2000 chars (Section 65)", () => {
    expect(() => validate(CreateTaskSchema, { command: "a".repeat(2001) })).toThrow();
  });

  it("accepts valid priorities (Section 54)", () => {
    for (const p of ["LOW", "NORMAL", "HIGH", "URGENT"] as const) {
      expect(validate(CreateTaskSchema, { command: "test", priority: p }).priority).toBe(p);
    }
  });

  it("rejects unknown priority values", () => {
    expect(() => TaskPrioritySchema.parse("CRITICAL")).toThrow();
  });

  it("accepts valid recurring cron (Section 33)", () => {
    const r = validate(CreateTaskSchema, {
      command: "Find out-of-stock products",
      isRecurring: true,
      recurringCron: "0 0 * * 5", // every Friday midnight
    });
    expect(r.isRecurring).toBe(true);
    expect(r.recurringCron).toBe("0 0 * * 5");
  });

  it("rejects cron with invalid characters", () => {
    expect(() =>
      validate(CreateTaskSchema, {
        command: "test",
        recurringCron: "rm -rf /",
      }),
    ).toThrow();
  });
});

describe("validate helper", () => {
  it("throws a ValidationError with structured fields", () => {
    try {
      validate(CreateTaskSchema, { command: "" });
      expect.fail("Should have thrown");
    } catch (e) {
      expect(isValidationError(e)).toBe(true);
      if (isValidationError(e)) {
        expect(e.fields).toHaveProperty("command");
      }
    }
  });
});
