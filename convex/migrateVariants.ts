import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Migration: Move product variants from products.variants array to variants table
 * 
 * Run this once to migrate existing data:
 * npx convex run migrateVariants:run
 */
export const run = internalMutation({
  args: {},
  returns: v.object({
    productsProcessed: v.number(),
    variantsMigrated: v.number(),
  }),
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    
    let productsProcessed = 0;
    let variantsMigrated = 0;
    
    for (const product of products) {
      // Skip if product has no variants array (already migrated or new product)
      if (!product.variants || product.variants.length === 0) {
        continue;
      }
      
      // Check if variants already exist in variants table
      const existingVariants = await ctx.db
        .query("variants")
        .withIndex("by_product_id", (q) => q.eq("productId", product._id))
        .collect();
      
      if (existingVariants.length > 0) {
        console.log(`Product ${product.productId} already has variants in variants table, skipping`);
        continue;
      }
      
      // Migrate each variant to variants table
      for (const variant of product.variants) {
        await ctx.db.insert("variants", {
          productId: product._id,
          variantId: variant.variantId,
          name: variant.name,
          price: variant.price,
          maxQuantity: variant.maxQuantity,
          requiredAgreements: variant.requiredAgreements,
          customFields: variant.customFields,
        });
        variantsMigrated++;
      }
      
      productsProcessed++;
      console.log(`Migrated ${product.variants.length} variants for product ${product.productId}`);
    }
    
    return {
      productsProcessed,
      variantsMigrated,
    };
  },
});

/**
 * Optional: Remove the legacy variants field from products after migration
 * Only run this after confirming the migration was successful!
 */
export const cleanupLegacyField = internalMutation({
  args: {},
  returns: v.object({
    productsUpdated: v.number(),
  }),
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    
    let productsUpdated = 0;
    
    for (const product of products) {
      if (product.variants) {
        await ctx.db.patch(product._id, {
          variants: undefined,
        });
        productsUpdated++;
      }
    }
    
    return {
      productsUpdated,
    };
  },
});
