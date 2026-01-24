import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Migration: Populate quantity and reserved from stock table to variants table
 * 
 * This migration copies stock data from the stock table to the variants table,
 * allowing variants to track their own stock directly.
 * 
 * Run this once to migrate existing data:
 * npx convex run migrateStock:run
 */
export const run = internalMutation({
  args: {},
  returns: v.object({
    variantsProcessed: v.number(),
    variantsUpdated: v.number(),
    stockEntriesProcessed: v.number(),
  }),
  handler: async (ctx) => {
    const variants = await ctx.db.query("variants").collect();
    
    let variantsProcessed = 0;
    let variantsUpdated = 0;
    let stockEntriesProcessed = 0;
    
    for (const variant of variants) {
      variantsProcessed++;
      
      // Find corresponding stock entry
      const stock = await ctx.db
        .query("stock")
        .withIndex("by_product_variant", (q) =>
          q.eq("productId", variant.productId).eq("variantId", variant.variantId)
        )
        .first();
      
      if (stock) {
        stockEntriesProcessed++;
        
        // Only update if the variant doesn't already have these fields set
        if (variant.quantity === undefined || variant.reserved === undefined) {
          await ctx.db.patch(variant._id, {
            quantity: stock.quantity,
            reserved: stock.reserved,
          });
          variantsUpdated++;
          console.log(
            `Updated variant ${variant.variantId} for product ${variant.productId}: ` +
            `quantity=${stock.quantity}, reserved=${stock.reserved}`
          );
        } else {
          console.log(
            `Variant ${variant.variantId} for product ${variant.productId} ` +
            `already has stock data, skipping`
          );
        }
      } else {
        // No stock entry found - initialize with zero
        if (variant.quantity === undefined || variant.reserved === undefined) {
          await ctx.db.patch(variant._id, {
            quantity: 0,
            reserved: 0,
          });
          variantsUpdated++;
          console.log(
            `No stock found for variant ${variant.variantId} for product ${variant.productId}, ` +
            `initialized with zeros`
          );
        }
      }
    }
    
    return {
      variantsProcessed,
      variantsUpdated,
      stockEntriesProcessed,
    };
  },
});

/**
 * Verification: Compare stock table with variants table to ensure data consistency
 * 
 * Run this to verify the migration was successful:
 * npx convex run migrateStock:verify
 */
export const verify = internalMutation({
  args: {},
  returns: v.object({
    totalVariants: v.number(),
    matchingEntries: v.number(),
    mismatches: v.array(
      v.object({
        productId: v.id("products"),
        variantId: v.string(),
        stockQuantity: v.union(v.number(), v.null()),
        stockReserved: v.union(v.number(), v.null()),
        variantQuantity: v.union(v.number(), v.null()),
        variantReserved: v.union(v.number(), v.null()),
      })
    ),
  }),
  handler: async (ctx) => {
    const variants = await ctx.db.query("variants").collect();
    
    let totalVariants = 0;
    let matchingEntries = 0;
    const mismatches = [];
    
    for (const variant of variants) {
      totalVariants++;
      
      const stock = await ctx.db
        .query("stock")
        .withIndex("by_product_variant", (q) =>
          q.eq("productId", variant.productId).eq("variantId", variant.variantId)
        )
        .first();
      
      const stockQuantity = stock?.quantity ?? null;
      const stockReserved = stock?.reserved ?? null;
      const variantQuantity = variant.quantity ?? null;
      const variantReserved = variant.reserved ?? null;
      
      if (stockQuantity === variantQuantity && stockReserved === variantReserved) {
        matchingEntries++;
      } else {
        mismatches.push({
          productId: variant.productId,
          variantId: variant.variantId,
          stockQuantity,
          stockReserved,
          variantQuantity,
          variantReserved,
        });
      }
    }
    
    return {
      totalVariants,
      matchingEntries,
      mismatches,
    };
  },
});
