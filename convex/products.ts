import { query } from "./_generated/server";
import { v } from "convex/values";

const variantValidator = v.object({
  variantId: v.string(),
  name: v.string(),
  price: v.number(),
  maxQuantity: v.optional(v.number()),
  requiredAgreements: v.optional(v.array(v.string())),
});

const productValidator = v.object({
  _id: v.id("products"),
  _creationTime: v.number(),
  productId: v.string(),
  name: v.string(),
  description: v.union(v.string(), v.null()),
  shortDescription: v.optional(v.string()),
  imageUrl: v.string(),
  gallery: v.array(v.string()),
  isVirtual: v.boolean(),
  variants: v.array(variantValidator),
});

export const list = query({
  args: {},
  returns: v.array(productValidator),
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

export const getById = query({
  args: { id: v.id("products") },
  returns: v.union(productValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByProductId = query({
  args: { productId: v.string() },
  returns: v.union(productValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();
  },
});
