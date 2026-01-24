import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
import { getAvailableStock } from "./stockHelpers";

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

    const available = await getAvailableStock(variant, (id) => ctx.db.get(id));

    return {
      _id: variant._id,
      _creationTime: variant._creationTime,
      productId: variant.productId,
      variantId: variant.variantId,
      quantity: variant.quantity,
      reserved: variant.reserved,
      available,
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
    await requireAdmin(ctx);

    const variants = await ctx.db
      .query("variants")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .collect();

    const result = [];
    for (const variant of variants) {
      const available = await getAvailableStock(variant, (id) => ctx.db.get(id));

      result.push({
        _id: variant._id,
        _creationTime: variant._creationTime,
        productId: variant.productId,
        variantId: variant.variantId,
        quantity: variant.quantity,
        reserved: variant.reserved,
        available,
      });
    }

    return result;
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

export const reserveStock = internalMutation({
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

    const available = await getAvailableStock(variant, (id) => ctx.db.get(id));

    if (available < args.quantity) {
      return {
        success: false,
        message: `Only ${available} items available`,
      };
    }

    await ctx.db.patch(variant._id, {
      reserved: variant.reserved + args.quantity,
    });

    // Also reserve secondary stock if it exists
    if (variant.secondaryStock) {
      const secondaryVariant = await ctx.db.get(variant.secondaryStock);
      if (secondaryVariant) {
        const factor = variant.secondaryStockFactor ?? 1;
        await ctx.db.patch(secondaryVariant._id, {
          reserved: secondaryVariant.reserved + (args.quantity * factor),
        });
      }
    }

    return { success: true, message: "Stock reserved" };
  },
});

export const releaseStock = internalMutation({
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

    // Also release secondary stock if it exists
    if (variant.secondaryStock) {
      const secondaryVariant = await ctx.db.get(variant.secondaryStock);
      if (secondaryVariant) {
        const factor = variant.secondaryStockFactor ?? 1;
        await ctx.db.patch(secondaryVariant._id, {
          reserved: Math.max(0, secondaryVariant.reserved - (args.quantity * factor)),
        });
      }
    }

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

    // Also decrement secondary stock if it exists
    if (variant.secondaryStock) {
      const secondaryVariant = await ctx.db.get(variant.secondaryStock);
      if (secondaryVariant) {
        const factor = variant.secondaryStockFactor ?? 1;
        await ctx.db.patch(secondaryVariant._id, {
          quantity: secondaryVariant.quantity - (args.quantity * factor),
          reserved: Math.max(0, secondaryVariant.reserved - (args.quantity * factor)),
        });
      }
    }

    return null;
  },
});
