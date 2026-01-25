# Mollie Payment Integration

This webshop uses Mollie for payment processing. Follow the steps below to configure the integration.

## Setup Instructions

### 1. Get Mollie API Key

1. Sign up for a Mollie account at [https://www.mollie.com](https://www.mollie.com)
2. Navigate to **Developers** → **API keys**
3. Copy your **Test API key** (starts with `test_`) for development
4. For production, use your **Live API key** (starts with `live_`)

### 2. Configure Environment Variables

Add the following environment variable to your Convex deployment:

```bash
# For local development
npx convex env set MOLLIE_API_KEY test_your_api_key_here

# For production
npx convex env set MOLLIE_API_KEY live_your_api_key_here --prod
```

You can also set this in the Convex dashboard under Settings → Environment Variables.

### 3. Configure URLs (Optional)

The following environment variables are optional but recommended:

- `VITE_APP_URL`: Your frontend URL (default: `http://localhost:5173`)
- `CONVEX_SITE_URL`: Your Convex backend URL (automatically set by Convex)

For local development, these defaults work fine. For production:

```bash
npx convex env set VITE_APP_URL https://your-domain.com --prod
```

### 4. Test the Integration

1. Start your development server: `npm run dev`
2. Add items to cart and proceed to checkout
3. Fill in the checkout form
4. You'll be redirected to Mollie's payment page
5. Use Mollie's test payment methods:
   - Test credit card: Use any valid credit card number format
   - Status will be immediately shown as "paid"

## Payment Flow

1. **Order Creation**: When user clicks "Complete Order", an order is created with status `pending`
2. **Payment Creation**: A Mollie payment link is generated via the `createPaymentForOrder` action
3. **User Redirect**: User is redirected to Mollie's checkout page
4. **Payment Processing**: User completes payment on Mollie
5. **Webhook Callback**: Mollie calls the webhook at `/payment-webhook` with payment status
6. **Order Update**: Order status and payment status are updated
7. **Stock Decrement**: If payment is successful, stock is decremented
8. **User Return**: User returns to `/checkout/success` and sees payment status

## Webhook Configuration

The webhook is automatically configured when creating a payment. Mollie will call:

```
https://your-convex-site.convex.cloud/payment-webhook
```

For local development, you can use a tool like [ngrok](https://ngrok.com/) to expose your local Convex instance.

## Payment Statuses

### Order Status
- `pending`: Order created, awaiting payment
- `paid`: Payment successful, stock decremented
- `cancelled`: Order cancelled
- `expired`: Payment expired
- `failed`: Payment failed

### Payment Status (Mollie)
- `open`: Payment created, awaiting user
- `pending`: Payment in progress
- `paid`: Payment successful
- `expired`: Payment link expired
- `failed`: Payment failed
- `canceled`: Payment cancelled by user

## Testing Payment Methods

Mollie provides test payment methods for development:

### Credit Card
- Any valid credit card number works in test mode
- Example: 5555 5555 5555 4444
- Expiry: Any future date
- CVC: Any 3 digits

### iDEAL (Dutch bank)
- Select any test bank
- All test banks result in "paid" status

See [Mollie's test mode documentation](https://docs.mollie.com/overview/testing) for more test methods.

## Security Notes

- Never commit API keys to version control
- Use test keys for development
- Verify webhook calls are from Mollie by fetching payment status
- Store sensitive data in environment variables

## Troubleshooting

### "Mollie API key not configured"
- Ensure you've set the `MOLLIE_API_KEY` environment variable in Convex
- Restart your Convex backend after setting the variable

### Webhook not receiving updates
- Check that `CONVEX_SITE_URL` is set correctly
- For local development, use ngrok or similar to expose your webhook
- Verify the webhook URL in Mollie dashboard under **Developers** → **Webhook Logs**

### Payment status not updating
- Check the Convex logs for webhook errors
- Verify the payment ID in the Mollie dashboard
- Ensure the webhook endpoint is accessible

## API Reference

### Actions

#### `payment.createPaymentForOrder`
Creates a Mollie payment for an existing order.

**Arguments:**
- `orderId` (string): The order ID

**Returns:**
- `success` (boolean): Whether payment was created
- `checkoutUrl` (string): URL to redirect user to
- `message` (string): Status message

### Mutations

#### `checkout.updateOrderPayment`
Updates an order with Mollie payment information (called internally by action).

#### `checkout.completeOrderPayment`
Completes payment and updates order status (called by webhook).

**Arguments:**
- `paymentId` (string): Mollie payment ID
- `status` (string): Payment status from Mollie

## Further Reading

- [Mollie API Documentation](https://docs.mollie.com)
- [Mollie Payments API](https://docs.mollie.com/reference/create-payment)
- [Mollie Webhooks](https://docs.mollie.com/overview/webhooks)
- [Convex Actions](https://docs.convex.dev/functions/actions)
