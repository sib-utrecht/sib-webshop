# Stock Management System

## Overview

The stock management system has been enhanced to use a robust reservation-based approach that prevents race conditions and properly handles stock during the checkout and payment process.

## Architecture

### Key Methods

The system now uses three core internal methods defined in `convex/stock.ts`:

1. **`reserveStock`** - Reserves stock when an order is created
   - Increments the `reserved` field for the variant
   - Also reserves secondary stock if configured
   - Returns success/failure with messages

2. **`releaseStock`** - Releases reserved stock back to the available pool
   - Decrements the `reserved` field
   - Also releases secondary stock if configured
   - Called when payment fails, expires, or is canceled

3. **`confirmPurchase`** - Confirms a purchase and decrements actual stock
   - Decrements both `quantity` and `reserved` fields
   - Also handles secondary stock
   - Called when payment is successful

### Order Flow

```
1. User initiates checkout
   ↓
2. createOrder validates stock availability
   ↓
3. reserveStock is called for each item
   - If any reservation fails, all previous reservations are rolled back
   ↓
4. Order is created with status "pending"
   ↓
5. Payment is initiated with Mollie
   ↓
6. User completes or abandons payment
   ↓
7. Webhook receives payment status
   ↓
8a. Payment SUCCESS → confirmPurchase (decrements stock)
8b. Payment FAILED/EXPIRED/CANCELED → releaseStock (releases reservation)
8c. Payment still OPEN after 30 min → releaseExpiredReservations (automatic cleanup)
```

## Race Condition Prevention

The reservation system prevents the following race conditions:

### Before (Without Reservations)
- User A checks out 10 items (available: 10)
- User B checks out 10 items (available: 10)
- Both see "10 available" and proceed
- Both payments succeed
- Result: Oversold by 10 items ❌

### After (With Reservations)
- User A checks out 10 items → reserves 10 (available: 10, reserved: 10)
- User B checks out 10 items → sees 0 available ❌ checkout fails
- User A payment succeeds → confirms purchase (available: 0, reserved: 0)
- Result: Stock properly managed ✅

## Secondary Stock Handling

All three core methods (`reserveStock`, `releaseStock`, `confirmPurchase`) properly handle secondary stock:

- When reserving primary stock, secondary stock is also reserved based on the `secondaryStockFactor`
- When releasing primary stock, secondary stock is also released
- When confirming purchase, both primary and secondary stock are decremented

This ensures that products sharing stock (e.g., a combo meal that includes individual items) remain in sync.

## Automatic Expiry

A scheduled job (`releaseExpiredReservations`) runs every 5 minutes to:
- Find orders older than 30 minutes with "open" payment status
- Release all reserved stock for these orders
- Mark the orders as expired

This prevents abandoned carts from holding stock indefinitely.

## Database Fields

### Variants Table
- `quantity` - Total physical stock available
- `reserved` - Stock currently reserved by pending orders
- `secondaryStock` - Optional reference to another variant that shares stock
- `secondaryStockFactor` - How many units of secondary stock to reserve/decrement (default: 1)

### Available Stock Calculation
```typescript
available = quantity - reserved

// If secondary stock is configured:
available = min(
  quantity - reserved,
  floor((secondaryQuantity - secondaryReserved) / factor)
)
```

## Benefits

1. **No Race Conditions** - Stock is atomically reserved during checkout
2. **Proper Payment Handling** - Stock is only decremented after successful payment
3. **Automatic Cleanup** - Abandoned orders release stock after timeout
4. **Secondary Stock Support** - Products sharing stock stay in sync
5. **Rollback Support** - Partial failures are properly handled
6. **Centralized Logic** - All stock operations go through tested methods

## Testing Scenarios

To test the robustness of the system, consider these scenarios:

1. **Concurrent Checkouts** - Multiple users trying to buy the last few items
2. **Payment Abandonment** - User starts checkout but never completes payment
3. **Payment Failure** - Payment fails after stock is reserved
4. **Secondary Stock** - Buying items that share stock with other products
5. **Partial Availability** - Attempting to buy more than available stock
6. **Stock Reservation Failure** - What happens if reservation fails mid-checkout

All of these scenarios are now properly handled by the reservation system.
