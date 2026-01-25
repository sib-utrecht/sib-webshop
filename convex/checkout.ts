import { mutation, internalMutation, action, internalAction, internalQuery } from "./_generated/server";
import { Infer, v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { getAvailableStock } from "./stockHelpers";

/**
 * Create an order (internal use - called by processCheckout action)
 */
const createOrderReturnValidator = v.object({
  success: v.boolean(),
  message: v.string(),
  orderId: v.optional(v.string()),
  orderDbId: v.optional(v.id("orders")),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  totalAmount: v.optional(v.number()),
  items: v.optional(v.array(
    v.object({
      productId: v.id("products"),
      productName: v.string(),
      variantId: v.string(),
      variantName: v.string(),
      quantity: v.number(),
      price: v.number(),
      customFieldResponses: v.optional(v.record(v.string(), v.string())),
    })
  )),
});

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
  returns: createOrderReturnValidator,
  handler: async (ctx, args): Promise<Infer<typeof createOrderReturnValidator>> => {
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
      const variant = await ctx.db
        .query("variants")
        .withIndex("by_product_variant", (q) =>
          q.eq("productId", item.productId).eq("variantId", item.variantId)
        )
        .first();

      if (!variant) {
        return {
          success: false,
          message: `Variant not found for item`,
        };
      }

      const available = await getAvailableStock(variant, (id) => ctx.db.get(id));

      if (available < item.quantity) {
        const product = await ctx.db.get(item.productId);
        return {
          success: false,
          message: `Insufficient stock for ${product?.name || "item"}. Only ${available} available.`,
        };
      }
    }

    // Reserve stock for all items before creating the order
    const reservedItems: Array<{ productId: Doc<"products">["_id"]; variantId: string; quantity: number }> = [];
    for (const item of args.items) {
      const reserveResult: { success: boolean; message: string } | null = await ctx.runMutation(internal.stock.reserveStock, {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      });

      if (!reserveResult || !reserveResult.success) {
        // Rollback: release all previously reserved stock
        for (const reserved of reservedItems) {
          await ctx.runMutation(internal.stock.releaseStock, {
            productId: reserved.productId,
            variantId: reserved.variantId,
            quantity: reserved.quantity,
          });
        }
        return {
          success: false,
          message: reserveResult?.message || "Failed to reserve stock",
        };
      }

      reservedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      });
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
      items: orderItems,
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

    // Step 3: Schedule new order notification email to webshop maintainer
    // Using scheduler ensures the email will be sent even if this action completes quickly
    await ctx.scheduler.runAfter(0, internal.checkout.sendNewOrderNotification, {
      orderDbId: orderResult.orderDbId,
    });

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

    // Check if status has already been updated to prevent duplicate stock operations
    // Note: This is safe from race conditions because Convex mutations run in transactions,
    // ensuring that concurrent webhook calls will be serialized and only the first will pass this check.
    const previousPaymentStatus = order.paymentStatus;
    if (previousPaymentStatus === args.status) {
      console.log(`Order ${args.orderId} already has payment status ${args.status}, skipping duplicate processing`);
      return null;
    }

    // Update payment status
    await ctx.db.patch(order._id, {
      paymentStatus: args.status as any,
      status: args.status === "paid" ? "paid" : order.status,
    });

    // Handle stock based on payment status (only if status changed)
    if (args.status === "paid") {
      // Payment successful: confirm purchase (decrement quantity and release reservation)
      for (const item of order.items) {
        await ctx.runMutation(internal.stock.confirmPurchase, {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        });
      }

      // Send payment confirmation emails (customer + maintainer)
      // Note: We schedule these to run asynchronously
      await ctx.scheduler.runAfter(0, internal.checkout.sendPaymentConfirmationEmails, {
        orderDbId: order._id,
      });
    } else if (args.status === "expired" || args.status === "failed" || args.status === "canceled") {
      // Payment failed/expired/canceled: release reserved stock
      for (const item of order.items) {
        await ctx.runMutation(internal.stock.releaseStock, {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        });
      }
    }

    return null;
  },
});

/**
 * Get full order details for email notifications (internal query)
 */
export const getFullOrderDetails = internalQuery({
  args: {
    orderDbId: v.id("orders"),
  },
  returns: v.union(
    v.object({
      orderId: v.string(),
      name: v.string(),
      email: v.string(),
      comments: v.optional(v.string()),
      items: v.array(
        v.object({
          productName: v.string(),
          variantName: v.string(),
          quantity: v.number(),
          price: v.number(),
          customFieldResponses: v.optional(v.record(v.string(), v.string())),
        })
      ),
      totalAmount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderDbId);

    if (!order) {
      return null;
    }

    return {
      orderId: order.orderId,
      name: order.name,
      email: order.email,
      comments: order.comments,
      items: order.items.map(item => ({
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        price: item.price,
        customFieldResponses: item.customFieldResponses,
      })),
      totalAmount: order.totalAmount,
    };
  },
});

/**
 * Send new order notification email (internal action wrapper)
 */
export const sendNewOrderNotification = internalAction({
  args: {
    orderDbId: v.id("orders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Fetch full order details
    const order = await ctx.runQuery(internal.checkout.getFullOrderDetails, {
      orderDbId: args.orderDbId,
    });

    if (!order) {
      console.error("Order not found for email notification:", args.orderDbId);
      return null;
    }

    // Send email
    const result = await ctx.runAction(internal.email.sendNewOrderEmail, {
      orderId: order.orderId,
      name: order.name,
      email: order.email,
      items: order.items,
      totalAmount: order.totalAmount,
      comments: order.comments,
    });

    if (!result.success) {
      console.error("Failed to send new order email:", result.error);
    }

    return null;
  },
});

/**
 * Send payment confirmation emails (internal action wrapper)
 */
export const sendPaymentConfirmationEmails = internalAction({
  args: {
    orderDbId: v.id("orders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Fetch full order details
    const order = await ctx.runQuery(internal.checkout.getFullOrderDetails, {
      orderDbId: args.orderDbId,
    });

    if (!order) {
      console.error("Order not found for email notification:", args.orderDbId);
      return null;
    }

    const emailData = {
      orderId: order.orderId,
      name: order.name,
      email: order.email,
      items: order.items,
      totalAmount: order.totalAmount,
      comments: order.comments,
    };

    // Send to customer
    const customerResult = await ctx.runAction(internal.email.sendPaymentConfirmationToCustomer, emailData);
    if (!customerResult.success) {
      console.error("Failed to send payment confirmation to customer:", customerResult.error);
    }

    // Send to maintainer
    const maintainerResult = await ctx.runAction(internal.email.sendPaymentConfirmationToMaintainer, emailData);
    if (!maintainerResult.success) {
      console.error("Failed to send payment confirmation to maintainer:", maintainerResult.error);
    }

    return null;
  },
});
