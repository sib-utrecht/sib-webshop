import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

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
        })
      ),
      totalAmount: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("completed"),
        v.literal("cancelled")
      ),
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
        })
      ),
      totalAmount: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("completed"),
        v.literal("cancelled")
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .first();
    return order || null;
  },
});
