import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAvailableStock } from "./stockHelpers";

const variantValidator = v.object({
  _id: v.id("variants"),
  variantId: v.string(),
  name: v.string(),
  price: v.number(),
  maxQuantity: v.optional(v.number()),
  requiredAgreements: v.optional(v.array(v.string())),
  customFields: v.optional(v.array(
    v.object({
      label: v.string(),
      type: v.union(v.literal("text"), v.literal("email"), v.literal("tel"), v.literal("textarea")),
      required: v.boolean(),
      placeholder: v.optional(v.string()),
    })
  )),
  quantity: v.number(),
  reserved: v.number(),
  available: v.number(),
  secondaryStock: v.optional(v.id("variants")),
  secondaryStockFactor: v.optional(v.number()),
  hideStockIfAbove: v.optional(v.number()),
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
  
  // Calculate available stock considering secondary stock for each variant
  const result = [];
  for (const v of variants) {
    const available = await getAvailableStock(v, (id) => ctx.db.get(id));

    result.push({
      _id: v._id,
      variantId: v.variantId,
      name: v.name,
      price: v.price,
      maxQuantity: v.maxQuantity,
      requiredAgreements: v.requiredAgreements,
      customFields: v.customFields,
      quantity: v.quantity,
      reserved: v.reserved,
      available,
      secondaryStock: v.secondaryStock,
      secondaryStockFactor: v.secondaryStockFactor,
      hideStockIfAbove: v.hideStockIfAbove,
    });
  }
  
  return result;
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

    // Fetch variants (with stock) for all products
    const productsWithStock = await Promise.all(
      visibleProducts.map(async (product) => {
        const variants = await loadProductVariants(ctx, product._id);

        return {
          ...product,
          variants,
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
            label: v.string(),
            type: v.union(v.literal("text"), v.literal("email"), v.literal("tel"), v.literal("textarea")),
            required: v.boolean(),
            placeholder: v.optional(v.string()),
          })
        )),
        secondaryStockVariantId: v.optional(v.string()),
        secondaryStockFactor: v.optional(v.number()),
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
            label: v.string(),
            type: v.union(v.literal("text"), v.literal("email"), v.literal("tel"), v.literal("textarea")),
            required: v.boolean(),
            placeholder: v.optional(v.string()),
          })
        )),
        secondaryStockVariantId: v.optional(v.string()),
        secondaryStockFactor: v.optional(v.number()),
        hideStockIfAbove: v.optional(v.number()),
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

    // Get existing variants
    const existingVariants = await ctx.db
      .query("variants")
      .withIndex("by_product_id", (q) => q.eq("productId", args.id))
      .collect();

    // Create map of existing data by variantId
    const variantMap = new Map(
      existingVariants.map((v) => [v.variantId, v])
    );

    // Track which variants are being kept
    const keptVariantIds = new Set<string>();

    // First pass: Update or create variants without secondaryStock
    for (const variant of args.variants) {
      keptVariantIds.add(variant.variantId);
      
      const existingVariant = variantMap.get(variant.variantId);
      if (existingVariant) {
        // Update existing variant (preserve stock values)
        await ctx.db.patch(existingVariant._id, {
          name: variant.name,
          price: variant.price,
          maxQuantity: variant.maxQuantity,
          requiredAgreements: variant.requiredAgreements,
          customFields: variant.customFields,
          hideStockIfAbove: variant.hideStockIfAbove,
        });
      } else {
        // Insert new variant with initial stock
        await ctx.db.insert("variants", {
          productId: args.id,
          variantId: variant.variantId,
          name: variant.name,
          price: variant.price,
          maxQuantity: variant.maxQuantity,
          requiredAgreements: variant.requiredAgreements,
          customFields: variant.customFields,
          quantity: 0,
          reserved: 0,
          hideStockIfAbove: variant.hideStockIfAbove,
        });
      }
    }

    // Second pass: Update secondaryStock references
    // Need to fetch all variants again to get the updated/created IDs
    const allVariants = await ctx.db
      .query("variants")
      .withIndex("by_product_id", (q) => q.eq("productId", args.id))
      .collect();
    
    const variantIdToDbId = new Map(
      allVariants.map((v) => [v.variantId, v._id])
    );

    for (const variant of args.variants) {
      if (variant.secondaryStockVariantId) {
        const secondaryStockDbId = variantIdToDbId.get(variant.secondaryStockVariantId);
        const currentVariantDbId = variantIdToDbId.get(variant.variantId);
        
        if (secondaryStockDbId && currentVariantDbId) {
          const factor = variant.secondaryStockFactor ?? 1;
          if (!Number.isInteger(factor) || factor < 1) {
            throw new Error("secondaryStockFactor must be a positive integer (>= 1) when provided");
          }

          await ctx.db.patch(currentVariantDbId, {
            secondaryStock: secondaryStockDbId,
            secondaryStockFactor: factor,
          });
        }
      } else {
        // Clear secondaryStock if not set
        const currentVariantDbId = variantIdToDbId.get(variant.variantId);
        if (currentVariantDbId) {
          await ctx.db.patch(currentVariantDbId, {
            secondaryStock: undefined,
            secondaryStockFactor: undefined,
          });
        }
      }
    }

    // Remove variants that are no longer in the product
    for (const variant of existingVariants) {
      if (!keptVariantIds.has(variant.variantId)) {
        await ctx.db.delete(variant._id);
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

    // Fetch variants (with stock) for all products
    const productsWithStock = await Promise.all(
      products.map(async (product) => {
        const variants = await loadProductVariants(ctx, product._id);

        return {
          ...product,
          variants,
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
