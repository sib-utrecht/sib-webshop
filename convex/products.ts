import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("products"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      price: v.number(),
      imageUrl: v.string(),
      category: v.string(),
      stock: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

export const getById = query({
  args: { id: v.id("products") },
  returns: v.union(
    v.object({
      _id: v.id("products"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      price: v.number(),
      imageUrl: v.string(),
      category: v.string(),
      stock: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByCategory = query({
  args: { category: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("products"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      price: v.number(),
      imageUrl: v.string(),
      category: v.string(),
      stock: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});
