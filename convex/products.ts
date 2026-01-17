import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

const variantValidator = v.object({
  variantId: v.string(),
  name: v.string(),
  price: v.number(),
  maxQuantity: v.optional(v.number()),
  requiredAgreements: v.optional(v.array(v.string())),
  customFields: v.optional(v.array(
    v.object({
      fieldId: v.string(),
      label: v.string(),
      type: v.union(v.literal("text"), v.literal("email"), v.literal("tel"), v.literal("textarea")),
      required: v.boolean(),
      placeholder: v.optional(v.string()),
    })
  )),
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
  isVisible: v.optional(v.boolean()),
  sortOrder: v.optional(v.number()),
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
  isVisible: v.optional(v.boolean()),
  sortOrder: v.optional(v.number()),
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

    // Filter to only visible products for public users
    const visibleProducts = products.filter(p => p.isVisible !== false);

    // Sort by sortOrder (ascending), with undefined sortOrder at the end
    visibleProducts.sort((a, b) => {
      const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

    // Fetch stock for all products
    const productsWithStock = await Promise.all(
      visibleProducts.map(async (product) => {
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
    const product = await ctx.db
      .query("products")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();
    
    // Filter out hidden products for public users
    if (product && product.isVisible === false) {
      return null;
    }
    
    return product;
  },
});

export const create = mutation({
  args: {
    productId: v.string(),
    name: v.string(),
    description: v.union(v.string(), v.null()),
    shortDescription: v.optional(v.string()),
    imageUrl: v.string(),
    gallery: v.array(v.string()),
    isVirtual: v.boolean(),
    isVisible: v.optional(v.boolean()),
    variants: v.array(
      v.object({
        variantId: v.string(),
        name: v.string(),
        price: v.number(),
        maxQuantity: v.optional(v.number()),
        requiredAgreements: v.optional(v.array(v.string())),
        customFields: v.optional(v.array(
          v.object({
            fieldId: v.string(),
            label: v.string(),
            type: v.union(v.literal("text"), v.literal("email"), v.literal("tel"), v.literal("textarea")),
            required: v.boolean(),
            placeholder: v.optional(v.string()),
          })
        )),
      })
    ),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Check if productId already exists
    const existing = await ctx.db
      .query("products")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();

    if (existing) {
      throw new Error("Product ID already exists");
    }

    const productId = await ctx.db.insert("products", {
      productId: args.productId,
      name: args.name,
      description: args.description,
      shortDescription: args.shortDescription,
      imageUrl: args.imageUrl,
      gallery: args.gallery,
      isVirtual: args.isVirtual,
      isVisible: args.isVisible ?? true,
      variants: args.variants,
    });

    // Initialize stock for each variant
    for (const variant of args.variants) {
      await ctx.db.insert("stock", {
        productId,
        variantId: variant.variantId,
        quantity: 0,
        reserved: 0,
      });
    }

    return productId;
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    productId: v.string(),
    name: v.string(),
    description: v.union(v.string(), v.null()),
    shortDescription: v.optional(v.string()),
    imageUrl: v.string(),
    gallery: v.array(v.string()),
    isVirtual: v.boolean(),
    isVisible: v.optional(v.boolean()),
    variants: v.array(
      v.object({
        variantId: v.string(),
        name: v.string(),
        price: v.number(),
        maxQuantity: v.optional(v.number()),
        requiredAgreements: v.optional(v.array(v.string())),
        customFields: v.optional(v.array(
          v.object({
            fieldId: v.string(),
            label: v.string(),
            type: v.union(v.literal("text"), v.literal("email"), v.literal("tel"), v.literal("textarea")),
            required: v.boolean(),
            placeholder: v.optional(v.string()),
          })
        )),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }

    // Check if productId is being changed and if new one already exists
    if (product.productId !== args.productId) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
        .first();

      if (existing && existing._id !== args.id) {
        throw new Error("Product ID already exists");
      }
    }

    // Update the product
    await ctx.db.patch(args.id, {
      productId: args.productId,
      name: args.name,
      description: args.description,
      shortDescription: args.shortDescription,
      imageUrl: args.imageUrl,
      gallery: args.gallery,
      isVirtual: args.isVirtual,
      isVisible: args.isVisible,
      variants: args.variants,
    });

    // Get existing stock entries
    const existingStocks = await ctx.db
      .query("stock")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .collect();

    // Create a map of existing stock by variantId
    const stockMap = new Map(
      existingStocks.map((stock) => [stock.variantId, stock])
    );

    // Update or create stock for each variant
    for (const variant of args.variants) {
      const existingStock = stockMap.get(variant.variantId);
      if (existingStock) {
        // Variant already has stock entry, keep it
        stockMap.delete(variant.variantId);
      } else {
        // New variant, create stock entry
        await ctx.db.insert("stock", {
          productId: args.id,
          variantId: variant.variantId,
          quantity: 0,
          reserved: 0,
        });
      }
    }

    // Remove stock entries for deleted variants
    for (const [, stock] of stockMap) {
      await ctx.db.delete(stock._id);
    }

    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }

    // Delete all stock entries for this product
    const stocks = await ctx.db
      .query("stock")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .collect();

    for (const stock of stocks) {
      await ctx.db.delete(stock._id);
    }

    // Delete the product
    await ctx.db.delete(args.id);

    return null;
  },
});

/**
 * Admin-only query to list all products (including hidden ones)
 */
export const listAll = query({
  args: {},
  returns: v.array(productWithStockValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    const products = await ctx.db.query("products").collect();

    // Sort by sortOrder (ascending), with undefined sortOrder at the end
    products.sort((a, b) => {
      const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

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

/**
 * Toggle product visibility
 */
export const toggleVisibility = mutation({
  args: { id: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }

    await ctx.db.patch(args.id, {
      isVisible: product.isVisible === false ? true : false,
    });

    return null;
  },
});

/**
 * Reorder products by updating their sortOrder
 */
export const reorderProducts = mutation({
  args: {
    productIds: v.array(v.id("products")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Update each product with its new sortOrder based on position in array
    for (let i = 0; i < args.productIds.length; i++) {
      await ctx.db.patch(args.productIds[i], {
        sortOrder: i,
      });
    }

    return null;
  },
});
