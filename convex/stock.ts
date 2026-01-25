import { query, mutation, internalMutation } from "./_generated/server";
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

/**
 * Release stock reservations for expired orders
 * Orders are considered expired if:
 * - They are older than 30 minutes
 * - Payment status is still "open" (not paid, expired, failed, or canceled)
 */
export const releaseExpiredReservations = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

    // Find orders that are older than 30 minutes and still have "open" payment status
    const expiredOrders = await ctx.db
      .query("orders")
      .filter((q) => 
        q.and(
          q.lt(q.field("_creationTime"), thirtyMinutesAgo),
          q.eq(q.field("paymentStatus"), "open")
        )
      )
      .collect();

    console.log(`Found ${expiredOrders.length} expired orders to process`);

    for (const order of expiredOrders) {
      console.log(`Releasing stock for expired order: ${order.orderId}`);

      // Release stock for all items in the order
      for (const item of order.items) {
        const variant = await ctx.db
          .query("variants")
          .withIndex("by_product_variant", (q) =>
            q.eq("productId", item.productId).eq("variantId", item.variantId)
          )
          .first();

        if (variant) {
          // Log if we detect inconsistent reserved stock
          if (variant.reserved < item.quantity) {
            console.warn(
              `Stock inconsistency detected for order ${order.orderId}: ` +
              `variant ${variant._id} has reserved=${variant.reserved} but order item quantity=${item.quantity}. ` +
              `This may indicate a race condition or double-processing.`
            );
          }

          await ctx.db.patch(variant._id, {
            reserved: Math.max(0, variant.reserved - item.quantity),
          });

          // Also release secondary stock if it exists
          if (variant.secondaryStock) {
            const secondaryVariant = await ctx.db.get(variant.secondaryStock);
            if (secondaryVariant) {
              const factor = variant.secondaryStockFactor ?? 1;
              const secondaryQuantity = item.quantity * factor;

              // Log if we detect inconsistent reserved stock for secondary
              if (secondaryVariant.reserved < secondaryQuantity) {
                console.warn(
                  `Secondary stock inconsistency detected for order ${order.orderId}: ` +
                  `secondary variant ${secondaryVariant._id} has reserved=${secondaryVariant.reserved} ` +
                  `but needs to release ${secondaryQuantity}. This may indicate a race condition or double-processing.`
                );
              }

              await ctx.db.patch(secondaryVariant._id, {
                reserved: Math.max(0, secondaryVariant.reserved - secondaryQuantity),
              });
            }
          }
        }
      }

      // Mark order as expired
      await ctx.db.patch(order._id, {
        status: "expired",
        paymentStatus: "expired",
      });
    }

    return null;
  },
});
