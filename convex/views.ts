import { query, mutation, internalQuery } from "./_generated/server";
import { Infer, v } from "convex/values";
import { requireAdmin } from "./auth";
import { internal } from "./_generated/api";

// Generate a secure random token for sharing
function getRandomToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// Validator for view filters
const viewFiltersValidator = v.optional(v.object({
  variantIds: v.optional(v.array(v.id("variants"))),
  statuses: v.optional(v.array(v.string())),
}));

// Validator for complete view object
const viewValidator = v.object({
  _id: v.id("views"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  columns: v.array(v.string()),
  filters: viewFiltersValidator,
  sortBy: v.optional(v.string()),
  sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  shareToken: v.optional(v.string()),
});

/**
 * List all views (admin only)
 */
export const list = query({
  args: {},
  returns: v.array(viewValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const views = await ctx.db.query("views").order("desc").collect();
    return views;
  },
});

/**
 * Get a specific view by ID (admin only)
 */
export const get = query({
  args: { viewId: v.id("views") },
  returns: v.union(viewValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const view = await ctx.db.get(args.viewId);
    return view || null;
  },
});

/**
 * Create a new view (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    columns: v.array(v.string()),
    filters: viewFiltersValidator,
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  returns: v.id("views"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const viewId = await ctx.db.insert("views", {
      name: args.name,
      columns: args.columns,
      filters: args.filters,
      sortBy: args.sortBy,
      sortOrder: args.sortOrder,
    });
    
    return viewId;
  },
});

/**
 * Update an existing view (admin only)
 */
export const update = mutation({
  args: {
    viewId: v.id("views"),
    name: v.string(),
    description: v.optional(v.string()),
    columns: v.array(v.string()),
    filters: viewFiltersValidator,
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    await ctx.db.patch(args.viewId, {
      name: args.name,
      columns: args.columns,
      filters: args.filters,
      sortBy: args.sortBy,
      sortOrder: args.sortOrder,
    });
    
    return null;
  },
});

/**
 * Delete a view (admin only)
 */
export const remove = mutation({
  args: { viewId: v.id("views") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.viewId);
    return null;
  },
});

// Type for flattened order item row
const orderItemRowValidator = v.object({
  orderId: v.string(),
  orderDbId: v.id("orders"),
  orderCreationTime: v.number(),
  email: v.string(),
  name: v.string(),
  orderStatus: v.string(),
  productId: v.id("products"),
  productName: v.string(),
  variantId: v.string(),
  variantName: v.string(),
  quantity: v.number(),
  price: v.number(),
  itemTotal: v.number(),
  customFieldResponses: v.optional(v.record(v.string(), v.string())),
  itemIndex: v.number(),
});

/**
 * Internal query to execute a view given a view object
 * This is the shared logic used by both execute and executeByShareToken
 */
export const executeViewInternal = internalQuery({
  args: { 
    viewId: v.id("views"),
  },
  returns: v.array(orderItemRowValidator),
  handler: async (ctx, args) => {
    const view = await ctx.db.get(args.viewId);
    if (!view) {
      throw new Error("View not found");
    }
    
    // Get all orders
    let orders = await ctx.db.query("orders").order("desc").collect();
    
    // Apply status filter if specified
    if (view.filters?.statuses && view.filters.statuses.length > 0) {
      orders = orders.filter(order => 
        view.filters?.statuses?.includes(order.status)
      );
    }
    
    // Flatten orders into rows (one per cart item)
    const rows = orders.flatMap(order => 
      order.items.map((item, itemIndex) => ({
        orderId: order.orderId,
        orderDbId: order._id,
        orderCreationTime: order._creationTime,
        email: order.email,
        name: order.name,
        orderStatus: order.status,
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantName: item.variantName,
        quantity: item.quantity,
        price: item.price,
        itemTotal: item.price * item.quantity,
        customFieldResponses: item.customFieldResponses,
        itemIndex, // Add index to ensure unique keys when rendering
      }))
    );
    
    // Apply variant filter using variant database IDs
    let filteredRows = rows;
    if (view.filters?.variantIds && view.filters.variantIds.length > 0) {
      // Create a map of variant IDs to their productId-variantId for quick lookup
      const variantIdSet = new Set(view.filters.variantIds);
      const variantMap = new Map<string, boolean>();
      
      // Load all the filtered variants to get their productId and variantId
      for (const variantDbId of view.filters.variantIds) {
        const variant = await ctx.db.get(variantDbId);
        if (variant) {
          const key = `${variant.productId}-${variant.variantId}`;
          variantMap.set(key, true);
        }
      }
      
      filteredRows = filteredRows.filter(row => {
        const compositeKey = `${row.productId}-${row.variantId}`;
        return variantMap.has(compositeKey);
      });
    }
    
    // Apply sorting
    if (view.sortBy) {
      const sortOrder = view.sortOrder || "asc";
      
      // Helper function to get field value by name
      const getFieldValue = (row: typeof filteredRows[0], fieldName: string): string | number => {
        // Check if it's a custom field
        if (fieldName.startsWith("customField_")) {
          const label = fieldName.substring("customField_".length);
          return row.customFieldResponses?.[label] || "";
        }
        
        // Access the field directly by name
        const value = row[fieldName as keyof typeof row];
        
        // Convert value to string or number
        if (value === undefined || value === null) {
          return "";
        }
        if (typeof value === "string" || typeof value === "number") {
          return value;
        }
        // Convert other types (Id, Record) to string
        return String(value);
      };
      
      filteredRows.sort((a, b) => {
        const aValue = getFieldValue(a, view.sortBy!);
        const bValue = getFieldValue(b, view.sortBy!);
        
        // Compare values
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
        } else {
          const comparison = String(aValue).localeCompare(String(bValue));
          return sortOrder === "asc" ? comparison : -comparison;
        }
      });
    }
    
    return filteredRows;
  },
});

/**
 * Execute a view and return flattened order items (admin only)
 */
export const execute = query({
  args: { viewId: v.id("views") },
  returns: v.array(orderItemRowValidator),
  handler: async (ctx, args): Promise<Array<Infer<typeof orderItemRowValidator>>> => {
    await requireAdmin(ctx);
    
    const view = await ctx.db.get(args.viewId);
    if (!view) {
      throw new Error("View not found");
    }
    
    return await ctx.runQuery(internal.views.executeViewInternal, { viewId: args.viewId });
  },
});

/**
 * Generate or regenerate a share token for a view (admin only)
 */
export const generateShareToken = mutation({
  args: { viewId: v.id("views") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const view = await ctx.db.get(args.viewId);
    if (!view) {
      throw new Error("View not found");
    }
    
    const shareToken = getRandomToken();
    await ctx.db.patch(args.viewId, { shareToken });
    
    return shareToken;
  },
});

/**
 * Disable sharing for a view by removing the share token (admin only)
 */
export const disableSharing = mutation({
  args: { viewId: v.id("views") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const view = await ctx.db.get(args.viewId);
    if (!view) {
      throw new Error("View not found");
    }
    
    await ctx.db.patch(args.viewId, { shareToken: undefined });
    
    return null;
  },
});

/**
 * Get a view by share token (public, no authentication required)
 */
export const getByShareToken = query({
  args: { shareToken: v.string() },
  returns: v.union(viewValidator, v.null()),
  handler: async (ctx, args) => {
    // No authentication required - this is a public endpoint
    const view = await ctx.db
      .query("views")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .first();
    
    return view || null;
  },
});

/**
 * Execute a view by share token (public, no authentication required)
 */
export const executeByShareToken = query({
  args: { shareToken: v.string() },
  returns: v.array(orderItemRowValidator),
  handler: async (ctx, args): Promise<Array<Infer<typeof orderItemRowValidator>>> => {
    // No authentication required - this is a public endpoint
    const view = await ctx.db
      .query("views")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .first();
    
    if (!view) {
      throw new Error("View not found or sharing is disabled");
    }
    
    return await ctx.runQuery(internal.views.executeViewInternal, { viewId: view._id });
  },
});
