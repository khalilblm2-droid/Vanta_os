// =============================================================================
// VANTA OS — Undo Handler (Section 22)
// Reverts a previously-completed task by replaying UndoSnapshots.
// =============================================================================

import type { AdminApiContextWithRest } from "@shopify/shopify-app-remix/server";
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { adminGraphQL } from "~/lib/shopify/admin.client";
import { createNotification } from "~/lib/notifications";

export interface UndoResult {
  success: boolean;
  revertedCount: number;
  failedCount: number;
  firstError?: string;
}

/**
 * Revert all UndoSnapshots recorded for a task.
 * Returns the count of successfully reverted items.
 */
export async function undoTask(
  admin: AdminApiContextWithRest,
  taskId: string,
  shopDomain: string,
): Promise<UndoResult> {
  const snapshots = await prisma.undoSnapshot.findMany({
    where: { taskId, revertedAt: null },
  });

  if (snapshots.length === 0) {
    return { success: true, revertedCount: 0, failedCount: 0 };
  }

  let reverted = 0;
  let failed = 0;
  let firstError: string | undefined;

  for (const snap of snapshots) {
    try {
      const previous = snap.previousState as Record<string, unknown>;

      if (snap.resourceType === "VARIANT") {
        // Restore variant price
        const variantId = snap.resourceId;
        const price = previous.price as string;
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
          { shopDomain, taskId, scopeUsed: "write_products", operation: "undo:variantPrice" },
        );
      } else if (snap.resourceType === "PRODUCT") {
        // Restore product tags
        const productId = snap.resourceId;
        const tags = (previous.tags as string[]) ?? [];
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
          { shopDomain, taskId, scopeUsed: "write_products", operation: "undo:productTags" },
        );
      } else if (snap.resourceType === "METAFIELD") {
        // Restore metafield (or delete if it didn't exist before)
        const [productId, nsKey] = snap.resourceId.split(":");
        const [namespace, key] = nsKey.split(".");
        const value = previous.value as string | null;
        if (value === null) {
          // The metafield didn't exist before — delete it
          const existing = await adminGraphQL<{
            product: { metafield: { id: string } | null };
          }>(
            admin,
            `#graphql
              query GetMetafield($productId: ID!, $namespace: String!, $key: String!) {
                product(id: $productId) {
                  metafield(namespace: $namespace, key: $key) { id }
                }
              }`,
            { productId, namespace, key },
            { shopDomain, taskId, scopeUsed: "read_metafields" },
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
              { shopDomain, taskId, scopeUsed: "write_metafields", operation: "undo:metafieldDelete" },
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
                  type: "single_line_text_field",
                },
              ],
            },
            { shopDomain, taskId, scopeUsed: "write_metafields", operation: "undo:metafieldSet" },
          );
        }
      }

      // Mark snapshot as reverted
      await prisma.undoSnapshot.update({
        where: { id: snap.id },
        data: { revertedAt: new Date() },
      });
      reverted++;
    } catch (err) {
      failed++;
      if (!firstError) firstError = err instanceof Error ? err.message : String(err);
      logger.error("Undo snapshot failed", {
        snapshotId: snap.id,
        resourceType: snap.resourceType,
        error: String(err),
      });
    }
  }

  // Mark the task as REVERTED
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "REVERTED" },
  });

  await createNotification(shopDomain, {
    type: "TASK_REVERTED",
    severity: reverted > 0 ? "SUCCESS" : "ERROR",
    title: "Task reverted",
    body: `Reverted ${reverted}/${snapshots.length} changes${failed > 0 ? ` (${failed} failed)` : ""}.`,
    link: `/app/history/${taskId}`,
  });

  return {
    success: failed === 0,
    revertedCount: reverted,
    failedCount: failed,
    firstError,
  };
}
