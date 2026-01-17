import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/context/CartContext";
import ReactMarkdown from "react-markdown";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export function CheckoutPage() {
  const { items, totalPrice, removeItem, updateAgreement } = useCart();
  const processCheckout = useAction(api.checkout.processCheckout);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [comments, setComments] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const itemsWithAgreements = items.filter(
    (item) => item.requiredAgreements && item.requiredAgreements.length > 0
  );
  const allAgreed = itemsWithAgreements.every((item) => item.agreedToTerms);
  const canCheckout = allAgreed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCheckout) return;

    setIsSubmitting(true);
    setError("");

    try {
      // Validate cart items before submitting
      if (items.length === 0) {
        setError("Your cart is empty");
        setIsSubmitting(false);
        return;
      }

      // Step 1: Create order in database
      const result = await processCheckout({
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`,
        comments: comments || undefined,
      });

      if (!result.success) {
        setError(result.message);
        setIsSubmitting(false);
        return;
      }

      if (!result.checkoutUrl) {
        setError("Failed to create payment");
        setIsSubmitting(false);
        return;
      }

      // Step 2: Redirect to Mollie payment page
      window.location.href = result.checkoutUrl;
    } catch (err) {
      console.error("Checkout error:", err);
      setError("An error occurred during checkout. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-2">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-6">
            Add some products before checking out.
          </p>
          <Button asChild>
            <Link to="/">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-8">
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Continue Shopping
        </Link>
      </Button>

      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4 mb-6">
              {items.map((item) => (
                <li key={`${item.productId}-${item.variantId}`} className="flex gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.variantName}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity} × €{item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      €{(item.price * item.quantity).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.productId, item.variantId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Required Agreements */}
            {itemsWithAgreements.length > 0 && (
              <div className="mb-6 p-4 border rounded-lg bg-muted/50 space-y-4">
                <h3 className="font-semibold text-sm">Required Agreements</h3>
                {itemsWithAgreements.map((item) => (
                  <div key={`${item.productId}-${item.variantId}`} className="space-y-2">
                    <p className="text-sm font-medium">
                      {item.name} - {item.variantName}
                    </p>
                    {item.requiredAgreements?.map((agreement, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id={`checkout-agreement-${item.productId}-${item.variantId}-${index}`}
                          checked={item.agreedToTerms || false}
                          onChange={(e) =>
                            updateAgreement(item.productId, item.variantId, e.target.checked)
                          }
                          className="mt-1"
                        />
                        <Label
                          htmlFor={`checkout-agreement-${item.productId}-${item.variantId}-${index}`}
                          className="text-xs cursor-pointer"
                        >
                          <span className="inline">
                            <ReactMarkdown>{agreement}</ReactMarkdown>
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                ))}
                {!allAgreed && (
                  <div className="flex items-start gap-2 text-destructive mt-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p className="text-xs">Please agree to all terms to continue</p>
                  </div>
                )}
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>€{totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checkout Form */}
        <Card>
          <CardHeader>
            <CardTitle>Contact & Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="comments">Comments (optional)</Label>
                <textarea
                  id="comments"
                  name="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any special instructions or notes here..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  For events: Please include your name and any +1's names
                </p>
              </div>

              <div className="pt-4">
                {error && (
                  <div className="mb-4 p-3 border border-destructive/50 bg-destructive/10 rounded-md flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting || !canCheckout}
                >
                  {isSubmitting ? "Processing..." : `Complete Order - €${totalPrice.toFixed(2)}`}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  This is a mock checkout. No payment will be processed.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
