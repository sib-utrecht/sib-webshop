# SIB Webshop - Project Documentation

## Overview

IMPORTANT: Check files for errors after editing them!

Beware that you must use `import type` instead of `import` when importing types.

The SIB Webshop is a modern e-commerce platform built for SIB-Utrecht, a student organization. It provides a simple but elegant shopping experience for members to purchase event tickets, merchandise, and make donations.

## Requirements

### Functional Requirements

1. **Product Catalog**
   - Display all available products on the home page
   - Support for product variants (sizes, types, price tiers)
   - Product detail pages with image galleries
   - Virtual products (tickets, donations) and physical merchandise

2. **Shopping Cart**
   - Add/remove items with variant selection
   - Quantity management with per-variant limits
   - Persistent cart using localStorage (no authentication)
   - Real-time price calculations

3. **Checkout Process**
   - Contact information collection (email, name)
   - Comments field for special instructions
   - Agreement checkboxes for specific products (e.g., Code of Conduct for events)
   - Mock payment processing (payment integration to be added later)
   - Stock validation and decrement on purchase

4. **Stock Management**
   - Track inventory per product variant
   - Display stock availability on product pages
   - Low stock warnings (≤5 items)
   - Out-of-stock handling (disable purchases)
   - Atomic stock decrement on checkout

5. **Required Agreements**
   - Some products require users to agree to terms before purchase
   - Agreements shown on product page and checkout
   - Must be accepted before adding to cart/completing order

### Non-Functional Requirements

- No user authentication required
- Responsive design for mobile and desktop
- Real-time data updates via Convex
- Type-safe throughout (TypeScript)
- Clean, modern UI using Tailwind CSS and Shadcn components

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Vite** | Build tool and dev server |
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Tailwind CSS v4** | Styling |
| **Shadcn UI** | Component library |
| **Convex** | Backend (database, real-time sync, serverless functions) |
| **React Router** | Client-side routing |
| **react-markdown** | Rendering markdown in descriptions |

## Project Structure

```
sib-webshop/
├── convex/                    # Convex backend
│   ├── _generated/            # Auto-generated Convex files
│   ├── schema.ts              # Database schema definition
│   ├── products.ts            # Product queries
│   ├── stock.ts               # Stock management queries/mutations
│   ├── checkout.ts            # Checkout mutation
│   └── seed.ts                # Database seeding script
│
├── src/
│   ├── components/
│   │   ├── ui/                # Shadcn UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   └── sheet.tsx
│   │   ├── layout/            # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   ├── product/           # Product components
│   │   │   ├── ProductCard.tsx
│   │   │   └── ProductGrid.tsx
│   │   └── cart/              # Cart components
│   │       └── CartDrawer.tsx
│   │
│   ├── context/
│   │   └── CartContext.tsx    # Global cart state management
│   │
│   ├── pages/
│   │   ├── HomePage.tsx       # Product grid listing
│   │   ├── ProductPage.tsx    # Product detail with variants
│   │   └── CheckoutPage.tsx   # Checkout form and order processing
│   │
│   ├── App.tsx                # Router configuration
│   ├── main.tsx               # App entry point with providers
│   └── index.css              # Tailwind imports and theme
│
├── .env.local                 # Convex environment variables
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies
```

## Database Schema

### Products Table
```typescript
products: defineTable({
  productId: v.string(),           // Human-readable ID (e.g., "gala2026")
  name: v.string(),
  description: v.string(),
  shortDescription: v.optional(v.string()),
  imageUrl: v.string(),
  gallery: v.array(v.string()),    // Additional images
  isVirtual: v.boolean(),          // Virtual product (no shipping)
  variants: v.array(v.object({
    variantId: v.string(),
    name: v.string(),
    price: v.number(),
    maxQuantity: v.optional(v.number()),
    requiredAgreements: v.optional(v.array(v.string())),
  })),
}).index("by_product_id", ["productId"])
```

### Stock Table
```typescript
stock: defineTable({
  productId: v.id("products"),
  variantId: v.string(),
  quantity: v.number(),            // Total available
  reserved: v.number(),            // Reserved in carts (future use)
})
.index("by_product_variant", ["productId", "variantId"])
.index("by_product", ["productId"])
```

## Key Intents & User Flows

### 1. Browse Products
**Intent:** User wants to see available products
**Flow:**
1. User visits home page (`/`)
2. ProductGrid displays all products from Convex
3. ProductCard shows name, image, price range, and stock status
4. User clicks to view product details

### 2. View Product Details
**Intent:** User wants to learn more about a specific product
**Flow:**
1. User navigates to product page (`/product/:id`)
2. ProductPage fetches product and stock data
3. User views image gallery, description, and variants
4. Stock availability shown per variant
5. Out-of-stock variants are disabled

### 3. Add to Cart
**Intent:** User wants to purchase a product
**Flow:**
1. User selects variant on product page
2. If required, user accepts agreement checkboxes
3. User clicks "Add to Cart"
4. CartContext adds item with variant info to localStorage
5. Header cart icon updates with item count

### 4. Manage Cart
**Intent:** User wants to review/modify cart
**Flow:**
1. User clicks cart icon in header
2. CartDrawer slides open (Sheet component)
3. User can adjust quantities or remove items
4. Total price updates in real-time
5. User clicks "Checkout" to proceed

### 5. Complete Purchase
**Intent:** User wants to finalize order
**Flow:**
1. User navigates to checkout page (`/checkout`)
2. User reviews order summary
3. User accepts any required agreements
4. User fills in contact information
5. User adds optional comments
6. User clicks "Complete Order"
7. `processCheckout` mutation validates and decrements stock
8. Order confirmation displayed with order ID
9. Cart is cleared

## API Reference

### Queries

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `products.list` | none | `Product[]` | Get all products |
| `products.getById` | `{ id }` | `Product \| null` | Get product by database ID |
| `products.getByProductId` | `{ productId }` | `Product \| null` | Get product by human-readable ID |
| `stock.getStock` | `{ productId, variantId }` | `Stock \| null` | Get stock for specific variant |
| `stock.getAllStock` | `{ productId }` | `Stock[]` | Get all stock for a product |

### Mutations

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `stock.updateStock` | `{ productId, variantId, quantity }` | `Id<"stock">` | Update stock quantity |
| `stock.reserveStock` | `{ productId, variantId, quantity }` | `{ success, message }` | Reserve stock (for cart) |
| `stock.releaseStock` | `{ productId, variantId, quantity }` | `null` | Release reserved stock |
| `checkout.processCheckout` | `{ items[] }` | `{ success, message, orderId }` | Process order and decrement stock |

## Seeded Products

| Product ID | Name | Variants | Type |
|------------|------|----------|------|
| `gala2026` | Gala 2026 | Member (€9.50), +1 (€11.00) | Event ticket |
| `card-game` | SIB Playing Cards | Default (€5.00) | Merchandise |
| `socks` | SIB Socks | S/M (€7.00), L/XL (€7.00) | Merchandise |
| `beer-mugs` | SIB Beer Mugs | Single (€8.00), Set of 2 (€14.00) | Merchandise |
| `sweater` | SIB Sweater | XS/S/M/L (€25.00 each) | Merchandise |
| `tote_bag` | SIB Tote Bag | Default (€3.00) | Merchandise |
| `dopper` | SIB Dopper | Default (€12.00) | Merchandise |
| `donation` | Donation | €2/€5/€10 | Virtual (donation) |

## Future Enhancements

- [ ] Payment integration (Mollie, Stripe, or similar)
- [ ] User authentication for order history
- [ ] Admin dashboard for stock/order management
- [ ] Email notifications for orders
- [ ] Stock reservation with expiration
- [ ] Order history and tracking
- [ ] Discount codes and promotions
