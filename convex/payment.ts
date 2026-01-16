"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { createMollieClient } from "@mollie/api-client";
import { internal, api } from "./_generated/api";

/**
 * Create a Mollie payment for an order
 */
export const createPaymentForOrder = action({
  args: {
    orderId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    checkoutUrl: v.optional(v.string()),
    message: v.string(),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; checkoutUrl?: string; message: string }> => {
    // Get order details
    const order: { _id: string; orderId: string; name: string; email: string; totalAmount: number } | null = await ctx.runQuery(internal.orders.findOrder, {
      orderId: args.orderId,
    });

    if (!order) {
      return {
        success: false,
        message: "Order not found",
      };
    }

    // Check if this should be a test payment (name contains "TEST")
    const isTestPayment = order.name.toUpperCase().includes("TEST");

    // Use appropriate API key based on test mode
    const apiKey = isTestPayment 
      ? (process.env.MOLLIE_TEST_API_KEY || process.env.MOLLIE_API_KEY)
      : process.env.MOLLIE_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        message: "Mollie API key not configured",
      };
    }

    try {
      const mollieClient = createMollieClient({ apiKey });

      // Get the base URL from environment or use default
      const baseUrl = process.env.VITE_APP_URL || "http://localhost:5173";
      const webhookUrl = process.env.CONVEX_SITE_URL 
        ? `${process.env.CONVEX_SITE_URL}/payment-webhook`
        : undefined;

      // Create payment with Mollie
      const payment = await mollieClient.payments.create({
        amount: {
          currency: "EUR",
          value: order.totalAmount.toFixed(2),
        },
        description: `Order ${args.orderId} - SIB Webshop${isTestPayment ? " (TEST)" : ""}`,
        redirectUrl: `${baseUrl}/checkout/success?orderId=${args.orderId}&id=${order._id}`,
        webhookUrl,
        metadata: {
          orderId: args.orderId,
        },
      });

      // Update order with payment info
      await ctx.runMutation(internal.checkout.updateOrderPayment, {
        orderId: args.orderId,
        paymentId: payment.id,
        checkoutUrl: payment._links.checkout?.href || "",
      });

      return {
        success: true,
        checkoutUrl: payment._links.checkout?.href,
        message: "Payment created successfully",
      };
    } catch (error) {
      console.error("Mollie payment creation error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create payment",
      };
    }
  },
});

/**
 * Process Mollie webhook callback (called from HTTP endpoint)
 */
export const processWebhook = internalAction({
  args: {
    paymentId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const apiKey = process.env.MOLLIE_API_KEY;
    if (!apiKey) {
      console.error("Mollie API key not configured");
      throw new Error("Mollie API key not configured");
    }

    try {
      // Fetch payment status from Mollie
      const mollieClient = createMollieClient({ apiKey });
      const payment = await mollieClient.payments.get(args.paymentId);

      // Update order with payment status
      await ctx.runMutation(internal.checkout.completeOrderPayment, {
        paymentId: payment.id,
        status: payment.status,
      });

      return null;
    } catch (error) {
      console.error("Webhook processing error:", error);
      throw error;
    }
  },
});
