import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Migration: Remove fieldId from customFields in products table
 * 
 * This migration removes the deprecated `fieldId` property from all
 * customFields in the products table's variants array, as labels are
 * now used as the unique identifier.
 */
export const removeFieldIdFromProducts = internalMutation({
  args: {},
  returns: v.object({
    productsUpdated: v.number(),
    variantsProcessed: v.number(),
  }),
  handler: async (ctx) => {
    let productsUpdated = 0;
    let variantsProcessed = 0;

    const products = await ctx.db.query("products").collect();

    for (const product of products) {
      // Skip if product doesn't have variants array
      if (!product.variants || product.variants.length === 0) {
        continue;
      }

      let needsUpdate = false;
      const updatedVariants = product.variants.map((variant) => {
        if (variant.customFields && variant.customFields.length > 0) {
          variantsProcessed++;
          const updatedCustomFields = variant.customFields.map((field: any) => {
            if ('fieldId' in field) {
              needsUpdate = true;
              const { fieldId, ...rest } = field;
              return rest;
            }
            return field;
          });
          return { ...variant, customFields: updatedCustomFields };
        }
        return variant;
      });

      if (needsUpdate) {
        await ctx.db.patch(product._id, { variants: updatedVariants });
        productsUpdated++;
      }
    }

    return { productsUpdated, variantsProcessed };
  },
});

/**
 * Migration: Remove fieldId from customFields in variants table
 * 
 * This migration removes the deprecated `fieldId` property from all
 * customFields in the variants table, as labels are now used as the
 * unique identifier.
 */
export const removeFieldIdFromVariants = internalMutation({
  args: {},
  returns: v.object({
    variantsUpdated: v.number(),
  }),
  handler: async (ctx) => {
    let variantsUpdated = 0;

    const variants = await ctx.db.query("variants").collect();

    for (const variant of variants) {
      if (variant.customFields && variant.customFields.length > 0) {
        let needsUpdate = false;
        const updatedCustomFields = variant.customFields.map((field: any) => {
          if ('fieldId' in field) {
            needsUpdate = true;
            const { fieldId, ...rest } = field;
            return rest;
          }
          return field;
        });

        if (needsUpdate) {
          await ctx.db.patch(variant._id, { customFields: updatedCustomFields });
          variantsUpdated++;
        }
      }
    }

    return { variantsUpdated };
  },
});

/**
 * Migration: Remove fieldId from customFields in all tables
 * 
 * Removes the deprecated `fieldId` property from customFields in both
 * the products and variants tables in a single transaction.
 */
export const removeFieldIdFromAllTables = internalMutation({
  args: {},
  returns: v.object({
    productsUpdated: v.number(),
    variantsProcessed: v.number(),
    variantsTableUpdated: v.number(),
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    let productsUpdated = 0;
    let variantsProcessed = 0;

    // Update products table
    const products = await ctx.db.query("products").collect();

    for (const product of products) {
      // Skip if product doesn't have variants array
      if (!product.variants || product.variants.length === 0) {
        continue;
      }

      let needsUpdate = false;
      const updatedVariants = product.variants.map((variant) => {
        if (variant.customFields && variant.customFields.length > 0) {
          variantsProcessed++;
          const updatedCustomFields = variant.customFields.map((field: any) => {
            if ('fieldId' in field) {
              needsUpdate = true;
              const { fieldId, ...rest } = field;
              return rest;
            }
            return field;
          });
          return { ...variant, customFields: updatedCustomFields };
        }
        return variant;
      });

      if (needsUpdate) {
        await ctx.db.patch(product._id, { variants: updatedVariants });
        productsUpdated++;
      }
    }

    // Update variants table
    let variantsTableUpdated = 0;
    const variants = await ctx.db.query("variants").collect();

    for (const variant of variants) {
      if (variant.customFields && variant.customFields.length > 0) {
        let needsUpdate = false;
        const updatedCustomFields = variant.customFields.map((field: any) => {
          if ('fieldId' in field) {
            needsUpdate = true;
            const { fieldId, ...rest } = field;
            return rest;
          }
          return field;
        });

        if (needsUpdate) {
          await ctx.db.patch(variant._id, { customFields: updatedCustomFields });
          variantsTableUpdated++;
        }
      }
    }

    return {
      productsUpdated,
      variantsProcessed,
      variantsTableUpdated,
      success: true,
      message: `Migration completed successfully. Updated ${productsUpdated} products (${variantsProcessed} variants processed) and ${variantsTableUpdated} variants in variants table.`,
    };
  },
});
