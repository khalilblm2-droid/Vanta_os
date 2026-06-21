// =============================================================================
// VANTA OS — Shopify Bulk Operations API (Section 71)
// For any read/write above BULK_OPERATION_THRESHOLD (250) records, the worker
// MUST use the official bulk API. We never paginate manually through 10k items.
//
// Flow:
//   1. Call bulkOperationRunQuery / bulkOperationRunMutation
//   2. Poll bulkOperation every 5s until status=COMPLETED
//   3. Stream the JSONL result file via fetch + line-by-line parser
//   4. Yield each record back to the caller (async iterator)
// =============================================================================

import type { AdminApiContextWithRest } from "@shopify/shopify-app-remix/server";
import { logger } from "~/lib/logger.server";
import { adminGraphQL, shopifyResourceUrl } from "~/lib/shopify/admin.client";

export type BulkOperationStatus = "CREATED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELED";

export interface BulkOperationResult {
  id: string;
  status: BulkOperationStatus;
  url?: string;
  partialDataUrl?: string;
  objectCount: string;
  errorCode?: string;
}

const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes max

/**
 * Kick off a bulk query operation (read path).
 * Pass a valid GraphQL query string that uses @bulkOperationResolve/@defer-friendly
 * bulk selectors (see Shopify docs).
 */
export async function runBulkQuery(
  admin: AdminApiContextWithRest,
  query: string,
  shopDomain: string,
): Promise<string> {
  const mutation = `#graphql
    mutation bulkOperationRunQuery($query: String!) {
      bulkOperationRunQuery(query: $query) {
        bulkOperation { id status }
        userErrors { field message }
      }
    }`;
  const resp = await adminGraphQL<{
    bulkOperationRunQuery: {
      bulkOperation: { id: string; status: BulkOperationStatus };
      userErrors: Array<{ field: string; message: string }>;
    };
  }>(admin, mutation, { query }, { shopDomain, scopeUsed: "read_products", operation: "bulkOperationRunQuery" });

  if (resp.data?.bulkOperationRunQuery.userErrors.length) {
    throw new Error(
      `Bulk query user errors: ${resp.data.bulkOperationRunQuery.userErrors
        .map((e) => e.message)
        .join("; ")}`,
    );
  }
  return resp.data!.bulkOperationRunQuery.bulkOperation.id;
}

/**
 * Kick off a bulk mutation (write path) via staged upload.
 * Pass a list of staged uploads + JSONL payload URL.
 */
export async function runBulkMutation(
  admin: AdminApiContextWithRest,
  mutationName: string,
  stagedUploadPath: string,
  shopDomain: string,
): Promise<string> {
  const mutation = `#graphql
    mutation bulkOperationRunMutation($mutation: BulkMutationMutationName!, $stagedUploadPath: String!) {
      bulkOperationRunMutation(mutation: $mutation, stagedUploadPath: $stagedUploadPath) {
        bulkOperation { id status }
        userErrors { field message }
      }
    }`;
  const resp = await adminGraphQL<{
    bulkOperationRunMutation: {
      bulkOperation: { id: string; status: BulkOperationStatus };
      userErrors: Array<{ field: string; message: string }>;
    };
  }>(
    admin,
    mutation,
    { mutation: mutationName, stagedUploadPath },
    { shopDomain, scopeUsed: "write_products", operation: "bulkOperationRunMutation" },
  );

  if (resp.data?.bulkOperationRunMutation.userErrors.length) {
    throw new Error(
      `Bulk mutation user errors: ${resp.data.bulkOperationRunMutation.userErrors
        .map((e) => e.message)
        .join("; ")}`,
    );
  }
  return resp.data!.bulkOperationRunMutation.bulkOperation.id;
}

/**
 * Poll a bulk operation until it reaches a terminal state.
 * Returns the final result with the download URL.
 */
export async function pollBulkOperation(
  admin: AdminApiContextWithRest,
  operationId: string,
  shopDomain: string,
): Promise<BulkOperationResult> {
  const query = `#graphql
    query GetBulkOperation($id: ID!) {
      node(id: $id) {
        ... on BulkOperation {
          id
          status
          url
          partialDataUrl
          objectCount
          errorCode
        }
      }
    }`;
  const start = Date.now();
  while (true) {
    if (Date.now() - start > POLL_TIMEOUT_MS) {
      throw new Error(`Bulk operation ${operationId} timed out after 30 minutes`);
    }
    const resp = await adminGraphQL<{
      node: BulkOperationResult | null;
    }>(admin, query, { id: operationId }, { shopDomain, operation: "node(bulkOperation)" });

    const op = resp.data?.node;
    if (!op) throw new Error(`Bulk operation ${operationId} not found`);
    if (op.status === "COMPLETED") {
      return op;
    }
    if (op.status === "FAILED" || op.status === "CANCELED") {
      throw new Error(`Bulk operation ${operationId} ${op.status}: ${op.errorCode ?? "unknown"}`);
    }
    logger.debug("Bulk poll", { id: operationId, status: op.status });
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

/**
 * Stream the JSONL result file from a completed bulk operation,
 * yielding each line parsed as JSON. Use this to process large datasets
 * without buffering the whole file in memory.
 */
export async function* streamBulkResults(
  operation: BulkOperationResult,
): AsyncGenerator<Record<string, unknown>> {
  if (!operation.url) throw new Error("Bulk operation has no download URL");
  const resp = await fetch(operation.url);
  if (!resp.ok || !resp.body) throw new Error(`Failed to download bulk results: ${resp.status}`);

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        yield JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        // Skip unparseable lines (often the JSONL final marker)
      }
    }
  }
  if (buffer.trim()) {
    try {
      yield JSON.parse(buffer) as Record<string, unknown>;
    } catch {
      /* ignore trailing partial line */
    }
  }
}

/**
 * Convenience helper: run a bulk query, poll to completion, stream results.
 * Returns an async iterable of records.
 */
export async function* bulkQueryAndStream(
  admin: AdminApiContextWithRest,
  query: string,
  shopDomain: string,
): AsyncGenerator<Record<string, unknown>> {
  const opId = await runBulkQuery(admin, query, shopDomain);
  const op = await pollBulkOperation(admin, opId, shopDomain);
  yield* streamBulkResults(op);
}

/** Re-exported deep-link helper so callers don't need two imports. */
export { shopifyResourceUrl };
