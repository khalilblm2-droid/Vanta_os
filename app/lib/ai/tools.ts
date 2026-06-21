// =============================================================================
// VANTA OS — AI Tools Registry (Section 8, Section 22, Section 60)
// Maps Gemini's function-calling interface to Shopify Admin API operations.
//
// Each tool:
//   1. Checks the kill switch (Section 43)
//   2. Checks the merchant's permission guardrails (Section 8)
//   3. Records an UndoSnapshot of previous state (Section 22)
//   4. Executes the Shopify mutation
//   5. Records a TaskDiff before/after (Section 60)
//   6. Returns a structured result the agent can render in markdown
//
// Never-allowed actions (Section 8) have NO tool here:
//   - Payment gateway / payout settings  -> handled via deep-link only
//   - Refunds outside the original processor
//   - Browser automation against third-party platforms
// =============================================================================

import type { AdminApiContextWithRest } from "@shopify/shopify-app-remix/server";
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { adminGraphQL, GraphQLError } from "~/lib/shopify/admin.client";
import { shouldUseBulkOperations } from "~/lib/shopify/admin.client";
import { bulkQueryAndStream } from "~/lib/shopify/bulk-operations";
import { isKillSwitchOn } from "~/lib/shopify/multi-tenant";

// --- Tool definitions --------------------------------------------------------

export interface ToolContext {
  admin: AdminApiContextWithRest;
  shopDomain: string;
  shopId: string;
  taskId: string;
  staffId?: string;
  permissions: {
    canWriteProducts: boolean;
    canWriteCollections: boolean;
    canWriteInventory: boolean;
    canWriteMetafields: boolean;
    canWriteThemes: boolean;
    canReadOrders: boolean;
    canReadCustomers: boolean;
  };
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
  deepLinks?: Array<{ label: string; url: string }>;
  /** Diff entries to render in the Task Card (Section 60). */
  diffs?: Array<{
    resourceType: string;
    resourceId: string;
    resourceTitle?: string;
    field: string;
    before?: string;
    after?: string;
  }>;
  /** Undo snapshots recorded (Section 22). */
  undoable: boolean;
  error?: string;
}

export type ToolHandler = (
  ctx: ToolContext,
  args: Record<string, unknown>,
) => Promise<ToolResult>;

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Permission required to use this tool (Section 8). */
  requiredPermission: keyof ToolContext["permissions"];
  /** Whether this tool modifies data (requires undo snapshot). */
  modifies: boolean;
  handler: ToolHandler;
}

// --- Tool implementations ----------------------------------------------------

const listProducts: ToolHandler = async (ctx, args) => {
  const limit = Math.min(Number(args.limit ?? 50), 250);
  const query = args.query as string | undefined;

  // Section 71 — switch to bulk for large reads
  if (shouldUseBulkOperations(limit)) {
    const records: Record<string, unknown>[] = [];
    for await (const r of bulkQueryAndStream(
      ctx.admin,
      `query { products { edges { node { id title handle status variants(first:10){edges{node{id price sku inventoryQuantity}}} } } } }`,
      ctx.shopDomain,
    )) {
      records.push(r);
    }
    return {
      success: true,
      message: `Bulk-listed ${records.length} products`,
      data: records,
      undoable: false,
    };
  }

  const gql = `#graphql
    query ListProducts($first: Int!, $query: String) {
      products(first: $first, query: $query) {
        edges {
          node {
            id
            title
            handle
            status
            productType
            vendor
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  sku
                  inventoryQuantity
                }
              }
            }
          }
        }
      }
    }`;

  const resp = await adminGraphQL<{
    products: { edges: Array<{ node: Record<string, unknown> }> };
  }>(ctx.admin, gql, { first: limit, query: query ?? null }, {
    shopDomain: ctx.shopDomain,
    taskId: ctx.taskId,
    scopeUsed: "read_products",
    operation: "products/list",
  });

  const products = resp.data?.products.edges.map((e) => e.node) ?? [];
  return {
    success: true,
    message: `Found ${products.length} products`,
    data: products,
    deepLinks: products.slice(0, 20).map((p) => ({
      label: `View ${p.title as string}`,
      url: `https://${ctx.shopDomain}/admin/products/${String(p.id).split("/").pop()}`,
    })),
    undoable: false,
  };
};

const updateProductPrice: ToolHandler = async (ctx, args) => {
  const productId = String(args.productId);
  const variantId = String(args.variantId);
  const newPrice = String(args.price);

  // Fetch previous state for undo (Section 22)
  const beforeResp = await adminGraphQL<{
    productVariant: { id: string; price: string; product: { id: string; title: string } };
  }>(
    ctx.admin,
    `#graphql
      query GetVariant($id: ID!) {
        productVariant(id: $id) {
          id
          price
          product { id title }
        }
      }`,
    { id: variantId },
    { shopDomain: ctx.shopDomain, taskId: ctx.taskId, scopeUsed: "read_products" },
  );

  const before = beforeResp.data?.productVariant;
  if (!before) {
    return { success: false, message: "Variant not found", undoable: false };
  }

  // Record undo snapshot (Section 22)
  await prisma.undoSnapshot.create({
    data: {
      taskId: ctx.taskId,
      shopId: ctx.shopId,
      shopDomain: ctx.shopDomain,
      resourceType: "VARIANT",
      resourceId: variantId,
      previousState: { price: before.price, productId },
    },
  });

  // Execute mutation
  const mutation = `#graphql
    mutation productVariantUpdate($input: ProductVariantInput!) {
      productVariantUpdate(input: $input) {
        productVariant { id price }
        userErrors { field message }
      }
    }`;
  const resp = await adminGraphQL<{
    productVariantUpdate: {
      productVariant: { id: string; price: string };
      userErrors: Array<{ field: string; message: string }>;
    };
  }>(ctx.admin, mutation, { input: { id: variantId, price: newPrice } }, {
    shopDomain: ctx.shopDomain,
    taskId: ctx.taskId,
    scopeUsed: "write_products",
    operation: "productVariantUpdate",
  });

  const result = resp.data?.productVariantUpdate;
  if (result?.userErrors.length) {
    return {
      success: false,
      message: result.userErrors.map((e) => e.message).join("; "),
      undoable: false,
      error: JSON.stringify(result.userErrors),
    };
  }

  return {
    success: true,
    message: `Updated price for "${before.product.title}" from $${before.price} to $${newPrice}`,
    data: { variantId, before: before.price, after: newPrice },
    deepLinks: [
      {
        label: `View ${before.product.title}`,
        url: `https://${ctx.shopDomain}/admin/products/${before.product.id.split("/").pop()}`,
      },
    ],
    diffs: [
      {
        resourceType: "PRODUCT",
        resourceId: before.product.id,
        resourceTitle: before.product.title,
        field: "price",
        before: `$${before.price}`,
        after: `$${newPrice}`,
      },
    ],
    undoable: true,
  };
};

const bulkUpdateProductTags: ToolHandler = async (ctx, args) => {
  const productIds = (args.productIds as string[]) ?? [];
  const tagsToAdd = (args.addTags as string[]) ?? [];
  const tagsToRemove = (args.removeTags as string[]) ?? [];

  if (productIds.length === 0) {
    return { success: false, message: "No product IDs provided", undoable: false };
  }

  // Fetch current tags for undo (Section 22)
  const beforeResp = await adminGraphQL<{
    nodes: Array<{ id: string; title: string; tags: string[] } | null>;
  }>(
    ctx.admin,
    `#graphql
      query GetProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            tags
          }
        }
      }`,
    { ids: productIds },
    { shopDomain: ctx.shopDomain, taskId: ctx.taskId, scopeUsed: "read_products" },
  );

  const beforeProducts = (beforeResp.data?.nodes ?? []).filter(
    (n): n is { id: string; title: string; tags: string[] } => n !== null,
  );

  if (beforeProducts.length === 0) {
    return { success: false, message: "No matching products found", undoable: false };
  }

  // Record undo snapshots for every product (Section 22)
  await Promise.all(
    beforeProducts.map((p) =>
      prisma.undoSnapshot.create({
        data: {
          taskId: ctx.taskId,
          shopId: ctx.shopId,
          shopDomain: ctx.shopDomain,
          resourceType: "PRODUCT",
          resourceId: p.id,
          previousState: { tags: p.tags },
        },
      }),
    ),
  );

  // Build mutation input — compute new tag list per product
  const inputs = beforeProducts.map((p) => {
    const set = new Set(p.tags);
    for (const t of tagsToAdd) set.add(t);
    for (const t of tagsToRemove) set.delete(t);
    return { id: p.id, tags: Array.from(set) };
  });

  const mutation = `#graphql
    mutation productUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id tags }
        userErrors { field message }
      }
    }`;

  const diffs: NonNullable<ToolResult["diffs"]> = [];
  let errorCount = 0;
  let firstError = "";

  for (const input of inputs) {
    try {
      const r = await adminGraphQL<{
        productUpdate: {
          product: { id: string; tags: string[] };
          userErrors: Array<{ field: string; message: string }>;
        };
      }>(ctx.admin, mutation, { input }, {
        shopDomain: ctx.shopDomain,
        taskId: ctx.taskId,
        scopeUsed: "write_products",
        operation: "productUpdate(tags)",
      });

      const result = r.data?.productUpdate;
      if (result?.userErrors.length) {
        errorCount++;
        if (!firstError) firstError = result.userErrors.map((e) => e.message).join("; ");
        continue;
      }

      const before = beforeProducts.find((p) => p.id === input.id);
      if (before && result) {
        diffs.push({
          resourceType: "PRODUCT",
          resourceId: input.id,
          resourceTitle: before.title,
          field: "tags",
          before: before.tags.join(", "),
          after: result.product.tags.join(", "),
        });
      }
    } catch (err) {
      errorCount++;
      if (!firstError) firstError = String(err);
    }
  }

  if (errorCount === inputs.length) {
    return {
      success: false,
      message: `All ${errorCount} updates failed: ${firstError}`,
      undoable: false,
      error: firstError,
    };
  }

  return {
    success: true,
    message: `Updated tags on ${inputs.length - errorCount}/${inputs.length} products${
      errorCount > 0 ? ` (${errorCount} failed)` : ""
    }`,
    data: { updated: inputs.length - errorCount, failed: errorCount },
    diffs,
    undoable: true,
  };
};

const findZeroInventoryProducts: ToolHandler = async (ctx, _args) => {
  const gql = `#graphql
    query ZeroInventoryProducts {
      products(first: 100, query: "inventory_total:<1") {
        edges {
          node {
            id
            title
            handle
            status
            variants(first: 5) {
              edges {
                node { id sku inventoryQuantity }
              }
            }
          }
        }
      }
    }`;
  const resp = await adminGraphQL<{
    products: { edges: Array<{ node: Record<string, unknown> }> };
  }>(ctx.admin, gql, {}, {
    shopDomain: ctx.shopDomain,
    taskId: ctx.taskId,
    scopeUsed: "read_products",
    operation: "products/zero-inventory",
  });

  const products = resp.data?.products.edges.map((e) => e.node) ?? [];
  return {
    success: true,
    message: `Found ${products.length} products with zero inventory`,
    data: products,
    deepLinks: products.slice(0, 50).map((p) => ({
      label: `View ${p.title as string}`,
      url: `https://${ctx.shopDomain}/admin/products/${String(p.id).split("/").pop()}`,
    })),
    undoable: false,
  };
};

const generateSeoDescription: ToolHandler = async (ctx, args) => {
  // This tool DOESN'T mutate — it just drafts text. Merchant must approve
  // before it gets written via updateProductMetafield.
  const productId = String(args.productId);
  const language = String(args.language ?? "en");
  const keywords = (args.keywords as string[]) ?? [];

  const fetchResp = await adminGraphQL<{
    product: { id: string; title: string; description: string; productType: string };
  }>(
    ctx.admin,
    `#graphql
      query GetProduct($id: ID!) {
        product(id: $id) {
          id
          title
          description
          productType
        }
      }`,
    { id: productId },
    { shopDomain: ctx.shopDomain, taskId: ctx.taskId, scopeUsed: "read_products" },
  );

  const product = fetchResp.data?.product;
  if (!product) {
    return { success: false, message: "Product not found", undoable: false };
  }

  // Defer to the agent to actually write the SEO copy — return the context.
  return {
    success: true,
    message: `Fetched context for "${product.title}" — agent will draft ${language.toUpperCase()} SEO description`,
    data: {
      productId,
      title: product.title,
      existingDescription: product.description,
      productType: product.productType,
      keywords,
    },
    undoable: false,
  };
};

const updateProductMetafield: ToolHandler = async (ctx, args) => {
  const productId = String(args.productId);
  const namespace = String(args.namespace ?? "vanta");
  const key = String(args.key);
  const value = String(args.value);
  const valueType = String(args.valueType ?? "single_line_text_field");

  // Fetch previous metafield for undo (Section 22)
  const beforeResp = await adminGraphQL<{
    product: { metafield: { id: string; value: string } | null; title: string };
  }>(
    ctx.admin,
    `#graphql
      query GetMetafield($productId: ID!, $namespace: String!, $key: String!) {
        product(id: $productId) {
          title
          metafield(namespace: $namespace, key: $key) { id value }
        }
      }`,
    { productId, namespace, key },
    { shopDomain: ctx.shopDomain, taskId: ctx.taskId, scopeUsed: "read_metafields" },
  );

  const before = beforeResp.data?.product;
  if (!before) return { success: false, message: "Product not found", undoable: false };

  await prisma.undoSnapshot.create({
    data: {
      taskId: ctx.taskId,
      shopId: ctx.shopId,
      shopDomain: ctx.shopDomain,
      resourceType: "METAFIELD",
      resourceId: `${productId}:${namespace}.${key}`,
      previousState: { value: before.metafield?.value ?? null },
    },
  });

  const mutation = `#graphql
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id value }
        userErrors { field message }
      }
    }`;
  const resp = await adminGraphQL<{
    metafieldsSet: {
      metafields: Array<{ id: string; value: string }>;
      userErrors: Array<{ field: string; message: string }>;
    };
  }>(ctx.admin, mutation, {
    metafields: [
      {
        ownerId: productId,
        namespace,
        key,
        value,
        type: valueType,
      },
    ],
  }, {
    shopDomain: ctx.shopDomain,
    taskId: ctx.taskId,
    scopeUsed: "write_metafields",
    operation: "metafieldsSet",
  });

  const result = resp.data?.metafieldsSet;
  if (result?.userErrors.length) {
    return {
      success: false,
      message: result.userErrors.map((e) => e.message).join("; "),
      undoable: false,
      error: JSON.stringify(result.userErrors),
    };
  }

  return {
    success: true,
    message: `Set metafield ${namespace}.${key} on "${before.title}"`,
    data: { productId, namespace, key, value, valueType },
    diffs: [
      {
        resourceType: "METAFIELD",
        resourceId: `${productId}:${namespace}.${key}`,
        resourceTitle: before.title,
        field: `${namespace}.${key}`,
        before: before.metafield?.value ?? "(empty)",
        after: value,
      },
    ],
    undoable: true,
  };
};

const listOrders: ToolHandler = async (ctx, args) => {
  const limit = Math.min(Number(args.limit ?? 20), 250);
  const gql = `#graphql
    query ListOrders($first: Int!) {
      orders(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            displayFulfillmentStatus
            displayFinancialStatus
            totalPriceSet { shopMoney { amount currencyCode } }
            createdAt
            customer { id email displayName }
          }
        }
      }
    }`;
  const resp = await adminGraphQL<{
    orders: { edges: Array<{ node: Record<string, unknown> }> };
  }>(ctx.admin, gql, { first: limit }, {
    shopDomain: ctx.shopDomain,
    taskId: ctx.taskId,
    scopeUsed: "read_orders",
    operation: "orders/list",
  });

  const orders = resp.data?.orders.edges.map((e) => e.node) ?? [];
  return {
    success: true,
    message: `Found ${orders.length} recent orders`,
    data: orders,
    deepLinks: orders.slice(0, 20).map((o) => ({
      label: `View ${o.name as string}`,
      url: `https://${ctx.shopDomain}/admin/orders/${String(o.id).split("/").pop()}`,
    })),
    undoable: false,
  };
};

// --- Registry ---------------------------------------------------------------

export const TOOLS: Record<string, ToolDefinition> = {
  list_products: {
    name: "list_products",
    description:
      "List products from the shop. Optionally filter by query string (e.g. 'inventory_total:<1' for zero-inventory products).",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of products (max 250)", default: 50 },
        query: { type: "string", description: "Shopify product query syntax filter" },
      },
    },
    requiredPermission: "canWriteProducts", // read_products implied
    modifies: false,
    handler: listProducts,
  },
  find_zero_inventory_products: {
    name: "find_zero_inventory_products",
    description: "Find all products with zero inventory. Useful for restocking alerts.",
    parameters: { type: "object", properties: {} },
    requiredPermission: "canWriteProducts",
    modifies: false,
    handler: findZeroInventoryProducts,
  },
  update_product_price: {
    name: "update_product_price",
    description:
      "Update the price of a specific product variant. Records an undo snapshot automatically.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Shopify product GID" },
        variantId: { type: "string", description: "Shopify variant GID" },
        price: { type: "string", description: "New price as a string (e.g. '19.99')" },
      },
      required: ["variantId", "price"],
    },
    requiredPermission: "canWriteProducts",
    modifies: true,
    handler: updateProductPrice,
  },
  bulk_update_product_tags: {
    name: "bulk_update_product_tags",
    description:
      "Add or remove tags across multiple products. Records undo snapshots for every product.",
    parameters: {
      type: "object",
      properties: {
        productIds: { type: "array", items: { type: "string" } },
        addTags: { type: "array", items: { type: "string" } },
        removeTags: { type: "array", items: { type: "string" } },
      },
      required: ["productIds"],
    },
    requiredPermission: "canWriteProducts",
    modifies: true,
    handler: bulkUpdateProductTags,
  },
  generate_seo_description: {
    name: "generate_seo_description",
    description:
      "Fetch product context so the agent can draft a localized SEO description. Does NOT mutate; merchant must approve the draft before update_product_metafield is called.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string" },
        language: { type: "string", enum: ["en", "ar", "fr"] },
        keywords: { type: "array", items: { type: "string" } },
      },
      required: ["productId"],
    },
    requiredPermission: "canWriteProducts",
    modifies: false,
    handler: generateSeoDescription,
  },
  update_product_metafield: {
    name: "update_product_metafield",
    description:
      "Set a metafield on a product (e.g. SEO description). Records undo snapshot.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string" },
        namespace: { type: "string", default: "vanta" },
        key: { type: "string" },
        value: { type: "string" },
        valueType: {
          type: "string",
          default: "single_line_text_field",
        },
      },
      required: ["productId", "key", "value"],
    },
    requiredPermission: "canWriteMetafields",
    modifies: true,
    handler: updateProductMetafield,
  },
  list_orders: {
    name: "list_orders",
    description: "List recent orders with fulfillment + financial status. Requires read_orders scope.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", default: 20 },
      },
    },
    requiredPermission: "canReadOrders",
    modifies: false,
    handler: listOrders,
  },
};

/**
 * Execute a tool call from Gemini, with all safety checks.
 * Returns a structured result the agent can render.
 */
export async function executeTool(
  ctx: ToolContext,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const tool = TOOLS[toolName];
  if (!tool) {
    return {
      success: false,
      message: `Unknown tool: ${toolName}`,
      undoable: false,
    };
  }

  // Section 43 — kill switch
  if (await isKillSwitchOn(ctx.shopDomain)) {
    logger.warn("Tool blocked by kill switch", {
      shopDomain: ctx.shopDomain,
      tool: toolName,
      taskId: ctx.taskId,
    });
    return {
      success: false,
      message: "Agent is globally disabled by the merchant. Enable it in Settings to continue.",
      undoable: false,
    };
  }

  // Section 8 — permission guardrails
  if (!ctx.permissions[tool.requiredPermission]) {
    logger.warn("Tool blocked by permission guardrail", {
      shopDomain: ctx.shopDomain,
      tool: toolName,
      requiredPermission: tool.requiredPermission,
      taskId: ctx.taskId,
    });
    return {
      success: false,
      message: `This action requires the "${tool.requiredPermission}" permission. Enable it in Settings → Agent Permissions.`,
      undoable: false,
    };
  }

  try {
    const result = await tool.handler(ctx, args);

    // Persist diffs to Postgres (Section 60)
    if (result.diffs && result.diffs.length > 0) {
      await prisma.taskDiff.createMany({
        data: result.diffs.map((d) => ({
          taskId: ctx.taskId,
          shopDomain: ctx.shopDomain,
          resourceType: d.resourceType,
          resourceId: d.resourceId,
          resourceTitle: d.resourceTitle,
          field: d.field,
          before: d.before,
          after: d.after,
        })),
      });
    }

    return result;
  } catch (err) {
    if (err instanceof GraphQLError) {
      return {
        success: false,
        message: err.message,
        undoable: false,
        error: JSON.stringify(err.extensions),
      };
    }
    logger.error("Tool execution failed", {
      tool: toolName,
      shopDomain: ctx.shopDomain,
      taskId: ctx.taskId,
      error: String(err),
    });
    return {
      success: false,
      message: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`,
      undoable: false,
      error: String(err),
    };
  }
}

/**
 * Convert the tool registry into Gemini's function-declaration format.
 */
export function geminiToolDeclarations() {
  const declarations = Object.values(TOOLS).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
  return { functionDeclarations: declarations };
}
