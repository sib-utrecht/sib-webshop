import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  products: defineTable({
    productId: v.string(),
    name: v.string(),
    description: v.union(v.string(), v.null()),
    shortDescription: v.optional(v.string()),
    imageUrl: v.string(),
    gallery: v.array(v.string()),
    isVirtual: v.boolean(),
    variants: v.array(
      v.object({
        variantId: v.string(),
        name: v.string(),
        price: v.number(),
        maxQuantity: v.optional(v.number()),
        requiredAgreements: v.optional(v.array(v.string())),
      })
    ),
  }).index("by_product_id", ["productId"]),

  stock: defineTable({
    productId: v.id("products"),
    variantId: v.string(),
    quantity: v.number(),
    reserved: v.number(), // Items in carts but not yet purchased
  })
    .index("by_product_variant", ["productId", "variantId"])
    .index("by_product", ["productId"]),
});
