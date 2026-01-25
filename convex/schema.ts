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
    isVisible: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    // Legacy field - kept optional for migration, can be removed after migration
    variants: v.optional(v.array(
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
    )),
  }).index("by_product_id", ["productId"]),

  variants: defineTable({
    productId: v.id("products"),
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
    quantity: v.number(),
    reserved: v.number(), // Items in carts but not yet purchased
    secondaryStock: v.optional(v.id("variants")), // Reference to another variant that shares the same stock
    secondaryStockFactor: v.optional(v.number()), // How many units of secondary stock to decrement (default 1)
  })
    .index("by_product_id", ["productId"])
    .index("by_product_variant", ["productId", "variantId"]),


  orders: defineTable({
    orderId: v.string(),
    email: v.string(),
    name: v.string(),
    comments: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        variantId: v.string(),
        variantName: v.string(),
        quantity: v.number(),
        price: v.number(),
        customFieldResponses: v.optional(v.record(v.string(), v.string())),
      })
    ),
    totalAmount: v.number(),
    status: v.union(
      v.literal("completed"),
      v.literal("pending"),
      v.literal("paid"),
      v.literal("cancelled"),
      v.literal("expired"),
      v.literal("failed")
    ),
    // Mollie payment metadata
    molliePaymentId: v.optional(v.string()),
    mollieCheckoutUrl: v.optional(v.string()),
    mollieWebhookUrl: v.optional(v.string()),
    paymentStatus: v.optional(v.union(
      v.literal("open"),
      v.literal("pending"),
      v.literal("paid"),
      v.literal("expired"),
      v.literal("failed"),
      v.literal("canceled")
    )),
  }).index("by_order_id", ["orderId"])
    .index("by_mollie_payment_id", ["molliePaymentId"]),

  views: defineTable({
    name: v.string(),
    columns: v.array(v.string()), // Column IDs to display (e.g., ["email", "productName", "variantName", "customField_fieldId"])
    filters: v.optional(v.object({
      variantIds: v.optional(v.array(v.id("variants"))), // Variant database IDs
      statuses: v.optional(v.array(v.string())),
    })),
    sortBy: v.optional(v.string()), // Column ID to sort by
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    shareToken: v.optional(v.string()), // Secure token for public sharing
  })
    .index("by_name", ["name"])
    .index("by_share_token", ["shareToken"]),
});
