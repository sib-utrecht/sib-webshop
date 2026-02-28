import { query, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
import { internal } from "./_generated/api";

/**
 * Internal action to create payment for an order (called by processCheckout)
 * Security: Queries order from database to verify data integrity
 */
export const createPaymentForOrder = internalAction({
  args: {
    orderDbId: v.id("orders"),
  },
  returns: v.object({
    success: v.boolean(),
    checkoutUrl: v.optional(v.string()),
    message: v.string(),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; checkoutUrl?: string; message: string }> => {
    // Query order from database to get authoritative data
    const order = await ctx.runQuery(internal.orders.getOrderById, {
      orderDbId: args.orderDbId,
    });

    if (!order) {
      return {
        success: false,
        message: "Order not found",
      };
    }

    // Call internal action to create Mollie payment with verified data
    const paymentResult = await ctx.runAction(internal.payment.generatePaymentUrl, {
      orderId: order.orderId,
      orderDbId: args.orderDbId,
      name: order.name,
      email: order.email,
      totalAmount: order.totalAmount,
      items: order.items,
    });

    if (!paymentResult.success || !paymentResult.paymentId || !paymentResult.checkoutUrl) {
      return paymentResult;
    }

    // Update order with payment info via mutation
    await ctx.runMutation(internal.checkout.updateOrderPayment, {
      orderDbId: args.orderDbId,
      paymentId: paymentResult.paymentId,
      checkoutUrl: paymentResult.checkoutUrl,
    });

    return {
      success: true,
      checkoutUrl: paymentResult.checkoutUrl,
      message: "Payment created successfully",
    };
  },
});


/**
 * Internal query to get order by database ID
 */
export const getOrderById = internalQuery({
  args: {
    orderDbId: v.id("orders"),
  },
  returns: v.union(
    v.object({
      _id: v.id("orders"),
      orderId: v.string(),
      name: v.string(),
      email: v.string(),
      totalAmount: v.number(),
      items: v.array(v.object({
        productName: v.string(),
        variantName: v.string(),
        quantity: v.number(),
        price: v.number(),
      })),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderDbId);

    if (!order) {
      return null;
    }

    return {
      _id: order._id,
      orderId: order.orderId,
      name: order.name,
      email: order.email,
      totalAmount: order.totalAmount,
      items: order.items.map(item => ({
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        price: item.price,
      })),
    };
  },
});

/**
 * Internal query to find an order by orderId
 */
export const findOrder = internalQuery({
  args: {
    orderId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("orders"),
      orderId: v.string(),
      name: v.string(),
      email: v.string(),
      totalAmount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .first();

    if (!order) {
      return null;
    }

    return {
      _id: order._id,
      orderId: order.orderId,
      name: order.name,
      email: order.email,
      totalAmount: order.totalAmount,
    };
  },
});

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("orders"),
      _creationTime: v.number(),
      orderId: v.string(),
      email: v.string(),
      name: v.string(),
      comments: v.optional(v.string()),
      items: v.array(
        v.object({
          productId: v.id("products"),
          productName: v.string(),
          variantId: v.string(),
          variantName: v.string(),
          quantity: v.number(),
          price: v.number(),
          customFieldResponses: v.optional(v.record(v.string(), v.string())),
          agreements: v.optional(v.array(v.string())),
        })
      ),
      totalAmount: v.number(),
      status: v.union(
        v.literal("completed"),
        v.literal("pending"),
        v.literal("paid"),
        v.literal("canceled"),
        v.literal("expired"),
        v.literal("failed")
      ),
      molliePaymentId: v.optional(v.string()),
      mollieCheckoutUrl: v.optional(v.string()),
      mollieWebhookUrl: v.optional(v.string()),
      paymentStatus: v.optional(v.union(
        v.literal("open"),
        v.literal("pending"),
        v.literal("paid"),
        v.literal("expired"),
        v.literal("failed"),
        v.literal("canceled")
      )),
    })
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    const orders = await ctx.db.query("orders").order("desc").collect();
    return orders;
  },
});

export const getByOrderId = query({
  args: { orderId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("orders"),
      _creationTime: v.number(),
      orderId: v.string(),
      email: v.string(),
      name: v.string(),
      comments: v.optional(v.string()),
      items: v.array(
        v.object({
          productId: v.id("products"),
          productName: v.string(),
          variantId: v.string(),
          variantName: v.string(),
          quantity: v.number(),
          price: v.number(),
          customFieldResponses: v.optional(v.record(v.string(), v.string())),
          agreements: v.optional(v.array(v.string())),
        })
      ),
      totalAmount: v.number(),
      status: v.union(
        v.literal("completed"),
        v.literal("pending"),
        v.literal("paid"),
        v.literal("canceled"),
        v.literal("expired"),
        v.literal("failed")
      ),
      molliePaymentId: v.optional(v.string()),
      mollieCheckoutUrl: v.optional(v.string()),
      mollieWebhookUrl: v.optional(v.string()),
      paymentStatus: v.optional(v.union(
        v.literal("open"),
        v.literal("pending"),
        v.literal("paid"),
        v.literal("expired"),
        v.literal("failed"),
        v.literal("canceled")
      )),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .first();
    return order || null;
  },
});

/**
 * Get order by ID and orderId (secure for non-admin users)
 * Requires both the Convex _id and orderId to prevent enumeration attacks
 */
export const getOrderSecure = query({
  args: { 
    id: v.id("orders"),
    orderId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("orders"),
      _creationTime: v.number(),
      orderId: v.string(),
      email: v.string(),
      name: v.string(),
      comments: v.optional(v.string()),
      items: v.array(
        v.object({
          productId: v.id("products"),
          productName: v.string(),
          variantId: v.string(),
          variantName: v.string(),
          quantity: v.number(),
          price: v.number(),
          customFieldResponses: v.optional(v.record(v.string(), v.string())),
          agreements: v.optional(v.array(v.string())),
        })
      ),
      totalAmount: v.number(),
      status: v.union(
        v.literal("completed"),
        v.literal("pending"),
        v.literal("paid"),
        v.literal("canceled"),
        v.literal("expired"),
        v.literal("failed")
      ),
      molliePaymentId: v.optional(v.string()),
      mollieCheckoutUrl: v.optional(v.string()),
      mollieWebhookUrl: v.optional(v.string()),
      paymentStatus: v.optional(v.union(
        v.literal("open"),
        v.literal("pending"),
        v.literal("paid"),
        v.literal("expired"),
        v.literal("failed"),
        v.literal("canceled")
      )),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    
    // Verify orderId matches to prevent unauthorized access
    if (!order || order.orderId !== args.orderId) {
      return null;
    }
    
    return order;
  },
});
