import { mutation, internalMutation, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Create an order (internal use - called by processCheckout action)
 */
export const createOrder = internalMutation({
  args: {
    items: v.array(
      v.object({
        productId: v.id("products"),
        variantId: v.string(),
        quantity: v.number(),
        customFieldResponses: v.optional(v.record(v.string(), v.string())),
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
    orderDbId: v.optional(v.id("orders")),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    totalAmount: v.optional(v.number()),
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
    // Add _TEST suffix if this is a test order (name contains "TEST")
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const isTestOrder = args.name.toUpperCase().includes("TEST");
    const orderId = `SIB-${year}-${month}-${randomId}${isTestOrder ? "_TEST" : ""}`;

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

      // Fetch variant from variants table
      const variant = await ctx.db
        .query("variants")
        .withIndex("by_product_variant", (q) => 
          q.eq("productId", item.productId).eq("variantId", item.variantId)
        )
        .first();
      
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
        customFieldResponses: item.customFieldResponses,
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
      orderDbId,
      name: args.name,
      email: args.email,
      totalAmount,
    };
  },
});

/**
 * Process checkout: create order and initiate payment
 * Single endpoint for the client to call
 */
export const processCheckout = action({
  args: {
    items: v.array(
      v.object({
        productId: v.id("products"),
        variantId: v.string(),
        quantity: v.number(),
        customFieldResponses: v.optional(v.record(v.string(), v.string())),
      })
    ),
    email: v.string(),
    name: v.string(),
    comments: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    checkoutUrl: v.optional(v.string()),
    message: v.string(),
    orderId: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; checkoutUrl?: string; message: string; orderId?: string }> => {
    // Step 1: Create order
    const orderResult = await ctx.runMutation(internal.checkout.createOrder, {
      items: args.items,
      email: args.email,
      name: args.name,
      comments: args.comments,
    });

    if (!orderResult.success || !orderResult.orderDbId) {
      return {
        success: false,
        message: orderResult.message,
      };
    }

    // Step 2: Create payment
    const paymentResult = await ctx.runAction(internal.orders.createPaymentForOrder, {
      orderDbId: orderResult.orderDbId,
    });

    if (!paymentResult.success || !paymentResult.checkoutUrl) {
      return {
        success: false,
        message: paymentResult.message,
        orderId: orderResult.orderId,
      };
    }

    return {
      success: true,
      checkoutUrl: paymentResult.checkoutUrl,
      message: "Checkout processed successfully",
      orderId: orderResult.orderId,
    };
  },
});

/**
 * Update order with payment information (called from action)
 */
export const updateOrderPayment = internalMutation({
  args: {
    orderDbId: v.id("orders"),
    paymentId: v.string(),
    checkoutUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderDbId, {
      molliePaymentId: args.paymentId,
      mollieCheckoutUrl: args.checkoutUrl,
    });

    return null;
  },
});

/**
 * Complete order payment (called from webhook)
 */
export const updateOrderStatus = internalMutation({
  args: {
    orderId: v.string(),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find order by orderId
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .first();

    if (!order) {
      console.error(`Order not found for orderId: ${args.orderId}`);
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
