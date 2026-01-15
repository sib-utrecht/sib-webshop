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
    email: v.string(),
    name: v.string(),
    comments: v.optional(v.string()),
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

    // Generate order ID with year and month (e.g., SIB-2026-01-ABC123)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = `SIB-${year}-${month}-${randomId}`;

    // Prepare order items with full details
    const orderItems = [];
    let totalAmount = 0;

    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) {
        return {
          success: false,
          message: `Product not found`,
        };
      }

      const variant = product.variants.find((v) => v.variantId === item.variantId);
      if (!variant) {
        return {
          success: false,
          message: `Variant not found`,
        };
      }

      const itemTotal = variant.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: item.productId,
        productName: product.name,
        variantId: item.variantId,
        variantName: variant.name,
        quantity: item.quantity,
        price: variant.price,
      });
    }

    // Create order record
    await ctx.db.insert("orders", {
      orderId,
      email: args.email,
      name: args.name,
      comments: args.comments,
      items: orderItems,
      totalAmount,
      status: "completed",
    });

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

    return {
      success: true,
      message: "Order processed successfully",
      orderId,
    };
  },
});
