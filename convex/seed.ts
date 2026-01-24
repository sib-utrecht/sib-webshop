import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const codeOfConductAgreement =
  "I agree with the [Code of conduct](https://sib-utrecht.nl/code-of-conduct)";

const codeOfConductAgreementPlusOne =
  "I agree with the [Code of conduct](https://sib-utrecht.nl/code-of-conduct), " +
  "and I, as a SIB member, am responsible for any +1's I bring to follow these rules.";

const mockProducts = [
  {
    productId: "gala2026",
    name: "Gala 2026",
    description:
      "**..**\n\n" +
      "... \n\n" +
      "<br/>" +
      "Note: In the comment box of checkout, please state your name.\n" +
      "If you take a +1 with you, add a second ticket, and add their name too.\n\n" +
      "<br/>By buying a ticket, you agree to the [Code of conduct](https://sib-utrecht.nl/code-of-conduct), and " +
      "are responsible for any +1's you bring following these rules.",
    shortDescription: "Join the end of year party! Take a +1 with you!",
    imageUrl:
      "https://sib-utrecht.nl/promo-images/2025/06/promo_90829f35_1000318283.jpg",
    variants: [
      {
        variantId: "member",
        name: "Member",
        price: 9.5,
        maxQuantity: 1,
        requiredAgreements: [codeOfConductAgreementPlusOne],
      },
      {
        variantId: "plusone",
        name: "+1",
        price: 11,
        maxQuantity: 1,
        requiredAgreements: [codeOfConductAgreementPlusOne],
      },
    ],
    gallery: [
      "https://sib-utrecht.nl/promo-images/2025/06/promo_90829f35_1000318283.jpg",
    ],
    isVirtual: false,
  },
  {
    productId: "card-game",
    name: "SIB playing cards",
    description:
      "SIB playingcards!! Fancy any game of cards, the SIB playingcards are for you. " +
      "Collect them at the GMA or any activity of choice:)",
    imageUrl:
      "https://sib-utrecht.nl/wp-content/uploads/public/card-game1.jpeg",
    gallery: [
      "https://sib-utrecht.nl/wp-content/uploads/public/card-game1.jpeg",
    ],
    variants: [
      {
        variantId: "default",
        name: "Card game",
        price: 3.79,
      },
    ],
    isVirtual: false,
  },
  {
    productId: "socks",
    name: "SIB socks",
    description:
      "Keep your feet warm with these cozy socks! Price per pair. " +
      "Collect them at the GMA or an activity of your choice.",
    imageUrl: "https://sib-utrecht.nl/wp-content/uploads/public/sokken1.jpg",
    gallery: ["https://sib-utrecht.nl/wp-content/uploads/public/sokken1.jpg"],
    variants: [
      {
        variantId: "size-36-42",
        name: "36-42",
        price: 3,
      },
      {
        variantId: "size-42-46",
        name: "42-46",
        price: 3,
      },
    ],
    isVirtual: false,
  },
  {
    productId: "beer-mugs",
    name: "SIB beer mug (glass)",
    description:
      "Enjoy your drink with these beer mugs! Price per mug. " +
      "Collect them at the GMA or an activity of your choice.",
    imageUrl:
      "https://sib-utrecht.nl/wp-content/uploads/public/bierpul1.jpeg",
    gallery: [
      "https://sib-utrecht.nl/wp-content/uploads/public/bierpul1.jpeg",
      "https://sib-utrecht.nl/wp-content/uploads/public/bierpul2.jpeg",
    ],
    variants: [
      {
        variantId: "with-sib-logo",
        name: "With SIB logo",
        price: 12,
      },
      {
        variantId: "no-logo",
        name: "No logo",
        price: 8,
      },
    ],
    isVirtual: false,
  },
  {
    productId: "sweater",
    name: "SIB Sweater",
    description: "Wear a cool sweater!",
    imageUrl:
      "https://sib-utrecht.nl/wp-content/uploads/public/sweaterparallax-600x600.jpg",
    gallery: [
      "https://sib-utrecht.nl/wp-content/uploads/public/sweaterwornfront_600x400.jpg",
      "https://sib-utrecht.nl/wp-content/uploads/public/sweaterwornback_600x400.jpg",
      "https://sib-utrecht.nl/wp-content/uploads/public/sweaterwornfrontsolo_600x900.jpg",
      "https://sib-utrecht.nl/wp-content/uploads/public/sweaterwornbacksolo_600x900.jpg",
    ],
    variants: [
      {
        variantId: "size-small",
        name: "S",
        price: 26.5,
      },
      {
        variantId: "size-medium",
        name: "M",
        price: 26.5,
      },
      {
        variantId: "size-large",
        name: "L",
        price: 26.5,
      },
      {
        variantId: "size-xlarge",
        name: "XL",
        price: 26.5,
      },
    ],
    isVirtual: false,
  },
  {
    productId: "tote_bag",
    name: "Tote Bag",
    description: null,
    imageUrl:
      "https://sib-utrecht.nl/wp-content/uploads/public/totebagparallax_600x600.jpg",
    gallery: [
      "https://sib-utrecht.nl/wp-content/uploads/public/totebagworn_600x600.jpg",
      "https://sib-utrecht.nl/wp-content/uploads/public/totebagwornzoomedout_600x900.jpg",
    ],
    variants: [
      {
        variantId: "default",
        name: "Tote Bag",
        price: 3.0,
      },
    ],
    isVirtual: false,
  },
  {
    productId: "dopper",
    name: "Dopper",
    description: null,
    imageUrl:
      "https://sib-utrecht.nl/wp-content/uploads/public/dopperparallax_600x600.jpg",
    gallery: [
      "https://sib-utrecht.nl/wp-content/uploads/public/dopperfront_600x600.jpg",
    ],
    variants: [
      {
        variantId: "default",
        name: "Dopper",
        price: 9.5,
      },
    ],
    isVirtual: false,
  },
  {
    productId: "donation",
    name: "Donation",
    description: "Donate to SIB",
    imageUrl:
      "https://sib-utrecht.nl/wp-content/uploads/2024/11/domtorentjes_placeholder.png",
    variants: [
      {
        variantId: "1",
        name: "€ 1.00",
        price: 1,
      },
      {
        variantId: "5",
        name: "€ 5.00",
        price: 5,
      },
      {
        variantId: "10",
        name: "€ 10.00",
        price: 10,
      },
    ],
    gallery: [],
    isVirtual: true,
  },
];

export const seed = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Clear existing data
    const existingProducts = await ctx.db.query("products").collect();
    for (const product of existingProducts) {
      await ctx.db.delete(product._id);
    }
    
    const existingVariants = await ctx.db.query("variants").collect();
    for (const variant of existingVariants) {
      await ctx.db.delete(variant._id);
    }

    // Insert all mock products and initialize stock
    for (const product of mockProducts) {
      const productId: Id<"products"> = await ctx.db.insert("products", {
        productId: product.productId,
        name: product.name,
        description: product.description,
        shortDescription: product.shortDescription,
        imageUrl: product.imageUrl,
        gallery: product.gallery,
        isVirtual: product.isVirtual,
        isVisible: true,
      });
      
      // Initialize variants with stock for each variant
      for (const variant of product.variants) {
        let quantity: number;
        
        // Set stock quantities based on product type
        if (product.isVirtual) {
          // Virtual products have unlimited stock
          quantity = 999999;
        } else if (product.productId === "gala2026") {
          // Limited tickets for gala
          quantity = 50;
        } else {
          // Physical merchandise
          quantity = 20;
        }
        
        await ctx.db.insert("variants", {
          productId,
          variantId: variant.variantId,
          name: variant.name,
          price: variant.price,
          maxQuantity: "maxQuantity" in variant ? variant.maxQuantity : undefined,
          requiredAgreements: "requiredAgreements" in variant ? variant.requiredAgreements : undefined,
          quantity,
          reserved: 0,
        });
      }
    }
    
    console.log(`Seeded ${mockProducts.length} products with stock`);
    return null;
  },
});
