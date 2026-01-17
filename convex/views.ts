import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Validator for view filters
const viewFiltersValidator = v.optional(v.object({
  productIds: v.optional(v.array(v.id("products"))),
  variantIds: v.optional(v.array(v.string())),
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
      description: args.description,
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
      description: args.description,
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
});

/**
 * Execute a view and return flattened order items (admin only)
 */
export const execute = query({
  args: { viewId: v.id("views") },
  returns: v.array(orderItemRowValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
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
      order.items.map(item => ({
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
      }))
    );
    
    // Apply product/variant filters
    let filteredRows = rows;
    if (view.filters?.productIds && view.filters.productIds.length > 0) {
      filteredRows = filteredRows.filter(row => 
        view.filters?.productIds?.includes(row.productId)
      );
    }
    if (view.filters?.variantIds && view.filters.variantIds.length > 0) {
      filteredRows = filteredRows.filter(row => 
        view.filters?.variantIds?.includes(row.variantId)
      );
    }
    
    // Apply sorting
    if (view.sortBy) {
      const sortOrder = view.sortOrder || "asc";
      filteredRows.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        // Get values based on sort column
        switch (view.sortBy) {
          case "orderId":
            aValue = a.orderId;
            bValue = b.orderId;
            break;
          case "orderCreationTime":
            aValue = a.orderCreationTime;
            bValue = b.orderCreationTime;
            break;
          case "email":
            aValue = a.email;
            bValue = b.email;
            break;
          case "name":
            aValue = a.name;
            bValue = b.name;
            break;
          case "productName":
            aValue = a.productName;
            bValue = b.productName;
            break;
          case "variantName":
            aValue = a.variantName;
            bValue = b.variantName;
            break;
          case "quantity":
            aValue = a.quantity;
            bValue = b.quantity;
            break;
          case "price":
            aValue = a.price;
            bValue = b.price;
            break;
          case "itemTotal":
            aValue = a.itemTotal;
            bValue = b.itemTotal;
            break;
          default:
            // Check if it's a custom field
            if (view.sortBy.startsWith("customField_")) {
              const fieldId = view.sortBy.substring("customField_".length);
              aValue = a.customFieldResponses?.[fieldId] || "";
              bValue = b.customFieldResponses?.[fieldId] || "";
            } else {
              aValue = "";
              bValue = "";
            }
        }
        
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
