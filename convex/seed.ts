import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const mockProducts = [
  {
    name: "Wireless Bluetooth Headphones",
    description:
      "Premium over-ear headphones with active noise cancellation, 30-hour battery life, and crystal-clear audio quality. Perfect for music lovers and professionals alike.",
    price: 149.99,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
    category: "Electronics",
    stock: 25,
  },
  {
    name: "Minimalist Leather Watch",
    description:
      "Elegant timepiece featuring genuine Italian leather strap, sapphire crystal glass, and Swiss movement. A classic accessory for any occasion.",
    price: 199.99,
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
    category: "Accessories",
    stock: 15,
  },
  {
    name: "Organic Cotton T-Shirt",
    description:
      "Sustainably sourced 100% organic cotton t-shirt. Soft, breathable, and perfect for everyday wear. Available in multiple colors.",
    price: 34.99,
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80",
    category: "Clothing",
    stock: 50,
  },
  {
    name: "Smart Home Speaker",
    description:
      "Voice-controlled smart speaker with premium 360° sound, built-in virtual assistant, and smart home integration. Control your home with just your voice.",
    price: 129.99,
    imageUrl: "https://images.unsplash.com/photo-1543512214-318c7553f230?w=500&q=80",
    category: "Electronics",
    stock: 30,
  },
  {
    name: "Ceramic Pour-Over Coffee Set",
    description:
      "Handcrafted ceramic pour-over coffee maker with matching mug. Brew the perfect cup of coffee every morning with this artisan set.",
    price: 54.99,
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80",
    category: "Home",
    stock: 20,
  },
  {
    name: "Bamboo Wireless Charger",
    description:
      "Eco-friendly wireless charging pad made from sustainable bamboo. Fast charging compatible with all Qi-enabled devices.",
    price: 39.99,
    imageUrl: "https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?w=500&q=80",
    category: "Electronics",
    stock: 40,
  },
  {
    name: "Linen Throw Blanket",
    description:
      "Luxuriously soft French linen throw blanket. Perfect for cozy evenings on the couch or as a stylish bedroom accent.",
    price: 89.99,
    imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&q=80",
    category: "Home",
    stock: 18,
  },
  {
    name: "Canvas Backpack",
    description:
      "Durable waxed canvas backpack with leather accents. Features padded laptop compartment and multiple pockets for organization.",
    price: 119.99,
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80",
    category: "Accessories",
    stock: 22,
  },
];

export const seed = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if products already exist
    const existing = await ctx.db.query("products").first();
    if (existing) {
      console.log("Products already seeded");
      return null;
    }

    // Insert all mock products
    for (const product of mockProducts) {
      await ctx.db.insert("products", product);
    }
    console.log(`Seeded ${mockProducts.length} products`);
    return null;
  },
});
