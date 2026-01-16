import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Webhook endpoint for Mollie payment updates
 */
http.route({
  path: "/payment-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const formData = await req.text();
      const params = new URLSearchParams(formData);
      const paymentId = params.get("id");

      if (!paymentId) {
        console.error("No payment ID in webhook");
        return new Response("No payment ID", { status: 400 });
      }

      // Process payment webhook via action
      await ctx.runAction(internal.payment.processWebhook, {
        paymentId,
      });

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  }),
});

export default http;
