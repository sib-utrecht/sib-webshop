import { mutation, internalMutation } from "./_generated/server";
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
    checkoutUrl: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Validate quantities are positive integers
    for (const item of args.items) {
      const quantity = Math.floor(Math.abs(item.quantity));
      if (quantity <= 0 || quantity !== item.quantity) {
        return {
          success: false,
          message: `Invalid quantity. Quantity must be a positive integer.`,
        };
      }
    }

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
    const orderDbId = await ctx.db.insert("orders", {
      orderId,
      email: args.email,
      name: args.name,
      comments: args.comments,
      items: orderItems,
      totalAmount,
      status: "pending",
      paymentStatus: "open",
    });

    return {
      success: true,
      message: "Order created successfully",
      orderId,
    };
  },
});

/**
 * Update order with payment information (called from action)
 */
export const updateOrderPayment = internalMutation({
  args: {
    orderId: v.string(),
    paymentId: v.string(),
    checkoutUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .first();

    if (order) {
      await ctx.db.patch(order._id, {
        molliePaymentId: args.paymentId,
        mollieCheckoutUrl: args.checkoutUrl,
      });
    }

    return null;
  },
});

/**
 * Complete order payment (called from webhook)
 */
export const completeOrderPayment = internalMutation({
  args: {
    paymentId: v.string(),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find order by Mollie payment ID
    const order = await ctx.db
      .query("orders")
      .withIndex("by_mollie_payment_id", (q) => q.eq("molliePaymentId", args.paymentId))
      .first();

    if (!order) {
      console.error(`Order not found for payment ID: ${args.paymentId}`);
      return null;
    }

    // Update payment status
    await ctx.db.patch(order._id, {
      paymentStatus: args.status as any,
      status: args.status === "paid" ? "paid" : order.status,
    });

    // If payment is successful, decrement stock
    if (args.status === "paid") {
      for (const item of order.items) {
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
    }

    return null;
  },
});
