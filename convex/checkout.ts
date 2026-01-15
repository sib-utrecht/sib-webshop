import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const processCheckout = mutation({
  args: {
    items: v.array(
      v.object({
        productId: v.id("products"),
        variantId: v.string(),
        quantity: v.number(),
      })
    ),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    orderId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Validate stock availability for all items
    for (const item of args.items) {
      const stock = await ctx.db
        .query("stock")
        .withIndex("by_product_variant", (q) =>
          q.eq("productId", item.productId).eq("variantId", item.variantId)
        )
        .first();

      if (!stock) {
        return {
          success: false,
          message: `Stock record not found for item`,
        };
      }

      const available = stock.quantity - stock.reserved;
      if (available < item.quantity) {
        const product = await ctx.db.get(item.productId);
        return {
          success: false,
          message: `Insufficient stock for ${product?.name || "item"}. Only ${available} available.`,
        };
      }
    }

    // Decrement stock for all items
    for (const item of args.items) {
      const stock = await ctx.db
        .query("stock")
        .withIndex("by_product_variant", (q) =>
          q.eq("productId", item.productId).eq("variantId", item.variantId)
        )
        .first();

      if (stock) {
        await ctx.db.patch(stock._id, {
          quantity: stock.quantity - item.quantity,
        });
      }
    }

    // Generate order ID
    const orderId = `SIB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    return {
      success: true,
      message: "Order processed successfully",
      orderId,
    };
  },
});
