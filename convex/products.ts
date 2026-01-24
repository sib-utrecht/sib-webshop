import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const variantValidator = v.object({
  _id: v.id("variants"),
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

/**
 * Helper function to load variants for a product from the variants table
 */
async function loadProductVariants(ctx: QueryCtx, productId: Id<"products">) {
  const variants = await ctx.db
    .query("variants")
    .withIndex("by_product_id", (q) => q.eq("productId", productId))
    .collect();
  
  return variants.map(v => ({
    _id: v._id,
    variantId: v.variantId,
    name: v.name,
    price: v.price,
    maxQuantity: v.maxQuantity,
    requiredAgreements: v.requiredAgreements,
    customFields: v.customFields,
  }));
}

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

    // Fetch variants and stock for all products
    const productsWithStock = await Promise.all(
      visibleProducts.map(async (product) => {
        const variants = await loadProductVariants(ctx, product._id);
        
        const stocks = await ctx.db
          .query("stock")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .collect();

        return {
          ...product,
          variants,
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
    const product = await ctx.db.get(args.id);
    if (!product) return null;
    
    const variants = await loadProductVariants(ctx, product._id);
    
    return {
      ...product,
      variants,
    };
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
    if (!product || product.isVisible === false) {
      return null;
    }
    
    const variants = await loadProductVariants(ctx, product._id);
    
    return {
      ...product,
      variants,
    };
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

    const productDbId = await ctx.db.insert("products", {
      productId: args.productId,
      name: args.name,
      description: args.description,
      shortDescription: args.shortDescription,
      imageUrl: args.imageUrl,
      gallery: args.gallery,
      isVirtual: args.isVirtual,
      isVisible: args.isVisible ?? true,
    });

    // Insert variants into variants table
    for (const variant of args.variants) {
      await ctx.db.insert("variants", {
        productId: productDbId,
        variantId: variant.variantId,
        name: variant.name,
        price: variant.price,
        maxQuantity: variant.maxQuantity,
        requiredAgreements: variant.requiredAgreements,
        customFields: variant.customFields,
      });

      // Initialize stock for each variant
      await ctx.db.insert("stock", {
        productId: productDbId,
        variantId: variant.variantId,
        quantity: 0,
        reserved: 0,
      });
    }

    return productDbId;
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
    });

    // Get existing variants and stock entries
    const existingVariants = await ctx.db
      .query("variants")
      .withIndex("by_product_id", (q) => q.eq("productId", args.id))
      .collect();
    
    const existingStocks = await ctx.db
      .query("stock")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .collect();

    // Create maps of existing data by variantId
    const variantMap = new Map(
      existingVariants.map((v) => [v.variantId, v])
    );
    const stockMap = new Map(
      existingStocks.map((stock) => [stock.variantId, stock])
    );

    // Track which variants are being kept
    const keptVariantIds = new Set<string>();

    // Update or create variants
    for (const variant of args.variants) {
      keptVariantIds.add(variant.variantId);
      
      const existingVariant = variantMap.get(variant.variantId);
      if (existingVariant) {
        // Update existing variant
        await ctx.db.patch(existingVariant._id, {
          name: variant.name,
          price: variant.price,
          maxQuantity: variant.maxQuantity,
          requiredAgreements: variant.requiredAgreements,
          customFields: variant.customFields,
        });
      } else {
        // Insert new variant
        await ctx.db.insert("variants", {
          productId: args.id,
          variantId: variant.variantId,
          name: variant.name,
          price: variant.price,
          maxQuantity: variant.maxQuantity,
          requiredAgreements: variant.requiredAgreements,
          customFields: variant.customFields,
        });
      }

      // Handle stock
      const existingStock = stockMap.get(variant.variantId);
      if (!existingStock) {
        // New variant, create stock entry
        await ctx.db.insert("stock", {
          productId: args.id,
          variantId: variant.variantId,
          quantity: 0,
          reserved: 0,
        });
      }
    }

    // Remove variants and stock entries that are no longer in the product
    for (const variant of existingVariants) {
      if (!keptVariantIds.has(variant.variantId)) {
        await ctx.db.delete(variant._id);
      }
    }
    
    for (const stock of existingStocks) {
      if (!keptVariantIds.has(stock.variantId)) {
        await ctx.db.delete(stock._id);
      }
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

    // Delete all variants for this product
    const variants = await ctx.db
      .query("variants")
      .withIndex("by_product_id", (q) => q.eq("productId", args.id))
      .collect();
    
    for (const variant of variants) {
      await ctx.db.delete(variant._id);
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

    // Fetch variants and stock for all products
    const productsWithStock = await Promise.all(
      products.map(async (product) => {
        const variants = await loadProductVariants(ctx, product._id);
        
        const stocks = await ctx.db
          .query("stock")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .collect();

        return {
          ...product,
          variants,
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
