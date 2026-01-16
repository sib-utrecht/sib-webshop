import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCart } from "@/context/CartContext";
import type { Id } from "../../convex/_generated/dataModel";

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const id = searchParams.get("id") as Id<"orders"> | null;
  const { clearCart } = useCart();
  const [hasCleared, setHasCleared] = useState(false);

  const order = useQuery(
    api.orders.getOrderSecure,
    orderId && id ? { orderId, id } : "skip"
  );

  // Clear cart once when payment is successful
  useEffect(() => {
    if (order && order.paymentStatus === "paid" && !hasCleared) {
      clearCart();
      setHasCleared(true);
    }
  }, [order, hasCleared, clearCart]);

  if (!orderId || !id) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Invalid Order</h1>
          <p className="text-muted-foreground mb-6">
            No order ID was provided.
          </p>
          <Button asChild>
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <Loader2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold mb-2">Loading Order...</h1>
          <p className="text-muted-foreground">
            Please wait while we verify your payment.
          </p>
        </div>
      </div>
    );
  }

  const isPaid = order.paymentStatus === "paid";
  const isPending = order.paymentStatus === "open" || order.paymentStatus === "pending";
  const isFailed = order.paymentStatus === "failed" || order.paymentStatus === "expired" || order.paymentStatus === "canceled";

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        {isPaid && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground mb-6">
              Thank you for your purchase. We've sent a confirmation email to{" "}
              {order.email}.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Order #{orderId}
            </p>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link to="/">Continue Shopping</Link>
              </Button>
            </div>
          </>
        )}

        {isPending && (
          <>
            <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold mb-2">Payment Pending</h1>
            <p className="text-muted-foreground mb-6">
              Your payment is being processed. This page will update automatically.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Order #{orderId}
            </p>
          </>
        )}

        {isFailed && (
          <>
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
            <p className="text-muted-foreground mb-6">
              Your payment could not be processed. Please try again.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Order #{orderId}
            </p>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link to="/checkout">Try Again</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Return to Home</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
