import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getStock = query({
  args: { productId: v.id("products"), variantId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("stock"),
      _creationTime: v.number(),
      productId: v.id("products"),
      variantId: v.string(),
      quantity: v.number(),
      reserved: v.number(),
      available: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const stock = await ctx.db
      .query("stock")
      .withIndex("by_product_variant", (q) =>
        q.eq("productId", args.productId).eq("variantId", args.variantId)
      )
      .first();

    if (!stock) return null;

    return {
      ...stock,
      available: stock.quantity - stock.reserved,
    };
  },
});

export const getAllStock = query({
  args: { productId: v.id("products") },
  returns: v.array(
    v.object({
      _id: v.id("stock"),
      _creationTime: v.number(),
      productId: v.id("products"),
      variantId: v.string(),
      quantity: v.number(),
      reserved: v.number(),
      available: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const stocks = await ctx.db
      .query("stock")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    return stocks.map((stock) => ({
      ...stock,
      available: stock.quantity - stock.reserved,
    }));
  },
});

export const updateStock = mutation({
  args: {
    productId: v.id("products"),
    variantId: v.string(),
    quantity: v.number(),
  },
  returns: v.id("stock"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stock")
      .withIndex("by_product_variant", (q) =>
        q.eq("productId", args.productId).eq("variantId", args.variantId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { quantity: args.quantity });
      return existing._id;
    } else {
      return await ctx.db.insert("stock", {
        productId: args.productId,
        variantId: args.variantId,
        quantity: args.quantity,
        reserved: 0,
      });
    }
  },
});

export const reserveStock = mutation({
  args: {
    productId: v.id("products"),
    variantId: v.string(),
    quantity: v.number(),
  },
  returns: v.union(
    v.object({ success: v.boolean(), message: v.string() }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const stock = await ctx.db
      .query("stock")
      .withIndex("by_product_variant", (q) =>
        q.eq("productId", args.productId).eq("variantId", args.variantId)
      )
      .first();

    if (!stock) {
      return { success: false, message: "Stock not found" };
    }

    const available = stock.quantity - stock.reserved;
    if (available < args.quantity) {
      return {
        success: false,
        message: `Only ${available} items available`,
      };
    }

    await ctx.db.patch(stock._id, {
      reserved: stock.reserved + args.quantity,
    });

    return { success: true, message: "Stock reserved" };
  },
});

export const releaseStock = mutation({
  args: {
    productId: v.id("products"),
    variantId: v.string(),
    quantity: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const stock = await ctx.db
      .query("stock")
      .withIndex("by_product_variant", (q) =>
        q.eq("productId", args.productId).eq("variantId", args.variantId)
      )
      .first();

    if (!stock) return null;

    await ctx.db.patch(stock._id, {
      reserved: Math.max(0, stock.reserved - args.quantity),
    });

    return null;
  },
});

export const confirmPurchase = internalMutation({
  args: {
    productId: v.id("products"),
    variantId: v.string(),
    quantity: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const stock = await ctx.db
      .query("stock")
      .withIndex("by_product_variant", (q) =>
        q.eq("productId", args.productId).eq("variantId", args.variantId)
      )
      .first();

    if (!stock) return null;

    await ctx.db.patch(stock._id, {
      quantity: stock.quantity - args.quantity,
      reserved: Math.max(0, stock.reserved - args.quantity),
    });

    return null;
  },
});
