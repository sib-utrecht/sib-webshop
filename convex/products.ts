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

const productWithStockValidator = v.object({
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
  stock: v.optional(
    v.array(
      v.object({
        _id: v.id("stock"),
        variantId: v.string(),
        quantity: v.number(),
        reserved: v.number(),
        available: v.number(),
      })
    )
  ),
});

export const list = query({
  args: {},
  returns: v.array(productWithStockValidator),
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    // Fetch stock for all products
    const productsWithStock = await Promise.all(
      products.map(async (product) => {
        const stocks = await ctx.db
          .query("stock")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .collect();

        return {
          ...product,
          stock: stocks.map((stock) => ({
            _id: stock._id,
            variantId: stock.variantId,
            quantity: stock.quantity,
            reserved: stock.reserved,
            available: stock.quantity - stock.reserved,
          })),
        };
      })
    );

    return productsWithStock;
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
