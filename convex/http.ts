import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Hello world test route
http.route({
  path: "/helloworld",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    return new Response("Hello, world!", { status: 200 });
  }),
})

/**
 * Webhook endpoint for Mollie payment updates
 */
http.route({
  path: "/payment-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      console.log("Received Mollie webhook");
      const formData = await req.text();
      const params = new URLSearchParams(formData);
      const paymentId = params.get("id");

      if (!paymentId) {
        console.error("No payment ID in webhook");
        return new Response("No payment ID", { status: 400 });
      }

      // Extract orderId from URL query parameter
      const url = new URL(req.url);
      const orderId = url.searchParams.get("orderId") || undefined;

      console.log("Processing webhook for payment ID:", paymentId, "orderId:", orderId);

      // Fetch payment status from Mollie
      const paymentResult = await ctx.runAction(internal.payment.fetchMolliePayment, {
        paymentId,
        orderId,
      });

      if (!paymentResult.success) {
        console.error("Failed to fetch payment:", paymentResult.message);
        return new Response("Error fetching payment", { status: 500 });
      }

      // Get orderId from payment metadata (primary) or URL (fallback)
      const finalOrderId = paymentResult.orderId || orderId;
      
      if (!finalOrderId) {
        console.error("No orderId in payment metadata or webhook URL");
        return new Response("No orderId available", { status: 400 });
      }

      // Validate orderId matches if both are present (security check)
      if (orderId && paymentResult.orderId && orderId !== paymentResult.orderId) {
        console.error(`OrderId mismatch: URL has ${orderId}, payment metadata has ${paymentResult.orderId}`);
        return new Response("OrderId mismatch", { status: 400 });
      }

      // Update order with payment status
      await ctx.runMutation(internal.checkout.updateOrderStatus, {
        orderId: finalOrderId,
        status: paymentResult.status,
      });

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  }),
});

export default http;
