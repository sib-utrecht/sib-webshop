import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

export const getStock = query({
  args: { productId: v.id("products"), variantId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("variants"),
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
    const variant = await ctx.db
      .query("variants")
      .withIndex("by_product_variant", (q) =>
        q.eq("productId", args.productId).eq("variantId", args.variantId)
      )
      .first();

    if (!variant) return null;

    return {
      _id: variant._id,
      _creationTime: variant._creationTime,
      productId: variant.productId,
      variantId: variant.variantId,
      quantity: variant.quantity,
      reserved: variant.reserved,
      available: variant.quantity - variant.reserved,
    };
  },
});

export const getAllStock = query({
  args: { productId: v.id("products") },
  returns: v.array(
    v.object({
      _id: v.id("variants"),
      _creationTime: v.number(),
      productId: v.id("products"),
      variantId: v.string(),
      quantity: v.number(),
      reserved: v.number(),
      available: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const variants = await ctx.db
      .query("variants")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .collect();

    return variants.map((variant) => ({
      _id: variant._id,
      _creationTime: variant._creationTime,
      productId: variant.productId,
      variantId: variant.variantId,
      quantity: variant.quantity,
      reserved: variant.reserved,
      available: variant.quantity - variant.reserved,
    }));
  },
});

export const updateStock = mutation({
  args: {
    productId: v.id("products"),
    variantId: v.string(),
    quantity: v.number(),
  },
  returns: v.id("variants"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const existing = await ctx.db
      .query("variants")
      .withIndex("by_product_variant", (q) =>
        q.eq("productId", args.productId).eq("variantId", args.variantId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { quantity: args.quantity });
      return existing._id;
    } else {
      throw new Error("Variant not found");
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
    const variant = await ctx.db
      .query("variants")
      .withIndex("by_product_variant", (q) =>
        q.eq("productId", args.productId).eq("variantId", args.variantId)
      )
      .first();

    if (!variant) {
      return { success: false, message: "Variant not found" };
    }

    const available = variant.quantity - variant.reserved;
    if (available < args.quantity) {
      return {
        success: false,
        message: `Only ${available} items available`,
      };
    }

    await ctx.db.patch(variant._id, {
      reserved: variant.reserved + args.quantity,
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
    const variant = await ctx.db
      .query("variants")
      .withIndex("by_product_variant", (q) =>
        q.eq("productId", args.productId).eq("variantId", args.variantId)
      )
      .first();

    if (!variant) return null;

    await ctx.db.patch(variant._id, {
      reserved: Math.max(0, variant.reserved - args.quantity),
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
    const variant = await ctx.db
      .query("variants")
      .withIndex("by_product_variant", (q) =>
        q.eq("productId", args.productId).eq("variantId", args.variantId)
      )
      .first();

    if (!variant) return null;

    await ctx.db.patch(variant._id, {
      quantity: variant.quantity - args.quantity,
      reserved: Math.max(0, variant.reserved - args.quantity),
    });

    return null;
  },
});
