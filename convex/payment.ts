"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { createMollieClient } from "@mollie/api-client";
import { PaymentLine } from "@mollie/api-client/dist/types/data/payments/data";

/**
 * Create a Mollie payment for an order
 */
export const generatePaymentUrl = internalAction({
  args: {
    orderId: v.string(),
    orderDbId: v.id("orders"),
    name: v.string(),
    email: v.string(),
    totalAmount: v.number(),
    items: v.optional(v.array(v.object({
      productName: v.string(),
      variantName: v.string(),
      quantity: v.number(),
      price: v.number(),
    }))),
  },
  returns: v.object({
    success: v.boolean(),
    checkoutUrl: v.optional(v.string()),
    paymentId: v.optional(v.string()),
    message: v.string(),
  }),
  handler: async (_ctx, args): Promise<{ success: boolean; checkoutUrl?: string; paymentId?: string; message: string }> => {
    // Check if this should be a test payment (name contains "TEST")
    const isTestPayment = args.name.includes("TEST");

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
      const baseUrl = process.env.VITE_APP_URL || "https://shop.sib-utrecht.nl";
      const webhookUrl = process.env.CONVEX_SITE_URL 
        ? `${process.env.CONVEX_SITE_URL}/payment-webhook?orderId=${encodeURIComponent(args.orderId)}`
        : undefined;

      console.log("OrderId: ", args.orderId);
      console.log("OrderDbId: ", args.orderDbId);
      console.log("Creating Mollie payment with webhook URL:", webhookUrl);
      console.log("Base url:", baseUrl);

      // Build order lines from items
      const lines = args.items?.map<PaymentLine>(item => ({
        description: `${item.productName} - ${item.variantName}`,
        quantity: item.quantity,
        sku: `${item.productName}_${item.variantName}`,
        unitPrice: {
          currency: "EUR" as const,
          value: item.price.toFixed(2),
        },
        totalAmount: {
          currency: "EUR" as const,
          value: (item.price * item.quantity).toFixed(2),
        },
      }));

      // Create payment with Mollie
      const payment = await mollieClient.payments.create({
        amount: {
          currency: "EUR",
          value: args.totalAmount.toFixed(2),
        },
        description: `Order ${args.orderId} - SIB Webshop${isTestPayment ? " (TEST)" : ""}`,
        redirectUrl: `${baseUrl}/checkout/success?orderId=${args.orderId}&id=${args.orderDbId}`,
        webhookUrl,
        lines: lines?.length ? lines : undefined,
        metadata: {
          orderId: args.orderId,
        },
      });

      console.log("Mollie payment created:", payment.id);
      const checkoutUrl = payment._links.checkout?.href;
      console.log("Mollie checkout URL:", checkoutUrl);

      return {
        success: true,
        checkoutUrl: payment._links.checkout?.href,
        paymentId: payment.id,
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
 * Fetch payment status from Mollie (purely functional - no mutations)
 */
export const fetchMolliePayment = internalAction({
  args: {
    paymentId: v.string(),
    orderId: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    paymentId: v.string(),
    orderId: v.optional(v.string()),
    status: v.string(),
    message: v.optional(v.string()),
  }),
  handler: async (_ctx, args): Promise<{ success: boolean; paymentId: string; orderId?: string; status: string; message?: string }> => {
    // Determine if this is a test payment based on orderId suffix
    const isTestPayment = args.orderId?.endsWith("_TEST") ?? false;
    
    // Use appropriate API key
    const apiKey = isTestPayment
      ? (process.env.MOLLIE_TEST_API_KEY || process.env.MOLLIE_API_KEY)
      : process.env.MOLLIE_API_KEY;
    
    if (!apiKey) {
      console.error("Mollie API key not configured");
      return {
        success: false,
        paymentId: args.paymentId,
        orderId: args.orderId,
        status: "failed",
        message: "Mollie API key not configured",
      };
    }

    console.log(`Fetching payment ${args.paymentId} (${isTestPayment ? "TEST" : "LIVE"} mode)`);

    try {
      // Fetch payment status from Mollie
      const mollieClient = createMollieClient({ apiKey });
      const payment = await mollieClient.payments.get(args.paymentId);

      // Extract orderId from payment metadata (fallback to URL parameter)
      const metadata = payment.metadata as { orderId?: string } | undefined;
      const orderIdFromMetadata = metadata?.orderId;
      const orderId = orderIdFromMetadata || args.orderId;

      return {
        success: true,
        paymentId: payment.id,
        orderId,
        status: payment.status,
      };
    } catch (error) {
      console.error("Mollie API error:", error);
      return {
        success: false,
        paymentId: args.paymentId,
        orderId: args.orderId,
        status: "failed",
        message: error instanceof Error ? error.message : "Failed to fetch payment",
      };
    }
  },
});
