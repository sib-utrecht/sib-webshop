import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2, AlertCircle, Edit, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/context/CartContext";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CustomFieldsEditor } from "@/components/product/CustomFieldsEditor";

export function CheckoutPage() {
  const { items, totalPrice, removeItem, updateQuantity, updateCustomFieldResponse } = useCart();
  const processCheckout = useAction(api.checkout.processCheckout);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [comments, setComments] = useState("");
  const [donationAmount, setDonationAmount] = useState<string>("");
  const [editingCustomFields, setEditingCustomFields] = useState<{
    cartItemId: string;
  } | null>(null);

  // Fetch donation product for ID
  const donationProduct = useQuery(api.products.getByProductId, { productId: "donation" });

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    pickupDate: "",
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
  const itemsWithCustomFields = items.filter(
    (item) => item.customFields && item.customFields.length > 0
  );
  const allAgreed = itemsWithAgreements.every((item) =>
    item.agreements && item.agreements.length > 0
  );
  const allCustomFieldsFilled = itemsWithCustomFields.every((item) => {
    if (!item.customFields) return true;
    return item.customFields.every((field) => {
      if (!field.required) return true;
      return item.customFieldResponses && item.customFieldResponses[field.fieldId]?.trim();
    });
  });
  const hasNonVirtualItems = items.some((item) => !item.isVirtual);
  const canCheckout = allAgreed && allCustomFieldsFilled;

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
      const orderComments = [
        formData.pickupDate ? `Pickup: ${formData.pickupDate}` : null,
        comments || null,
      ]
        .filter(Boolean)
        .join("\n");

      // Prepare items array with optional donation
      const checkoutItems = items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        customFieldResponses: item.customFieldResponses,
        agreements: item.agreements,
      }));

      // Add donation if amount is specified and donation product exists
      const donationValue = parseFloat(donationAmount);
      if (donationProduct && !isNaN(donationValue) && donationValue > 0) {
        checkoutItems.push({
          productId: donationProduct._id,
          variantId: donationValue.toFixed(2),
          quantity: 1,
          customFieldResponses: undefined,
          agreements: undefined,
        });
      }

      const result = await processCheckout({
        items: checkoutItems,
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`,
        comments: orderComments || undefined,
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
              {items.map((item) => {
                const hasCustomFields = item.customFields && item.customFields.length > 0;
                const hasAgreements = item.requiredAgreements && item.requiredAgreements.length > 0;
                const hasResponses = item.customFields?.some(
                  (field) => item.customFieldResponses?.[field.fieldId]
                );
                const allRequiredFilled = item.customFields
                  ?.filter((field) => field.required)
                  .every((field) => item.customFieldResponses?.[field.fieldId]);

                return (
                  <li key={item.cartItemId} className="border-b pb-4 last:border-0">
                    <div className="flex gap-4">
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
                        {/* Quantity controls - only for items without custom fields */}
                        {!item.customFields || item.customFields.length === 0 ? (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-muted-foreground">
                              {item.quantity} × €{item.price.toFixed(2)}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                              disabled={item.maxQuantity !== undefined && item.quantity >= item.maxQuantity}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} × €{item.price.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium">
                          €{(item.price * item.quantity).toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.cartItemId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Required Agreements - Display Only */}
                    {hasAgreements && (
                      <div className="mt-3 ml-20 p-3 border rounded-lg bg-muted/50 space-y-2">
                        <p className="text-xs font-semibold">Agreements</p>
                        {item.agreements && item.agreements.length > 0 ? (
                          <div className="space-y-1">
                            {item.agreements.map((agreement, index) => (
                              <p key={index} className="text-xs text-muted-foreground whitespace-pre-wrap">
                                ✓ {agreement}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 text-destructive">
                            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                            <p className="text-xs">Agreement missing - please remove and re-add this item</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Custom Fields - Inline */}
                    {hasCustomFields && (
                      <div className="mt-3 ml-20 p-3 border rounded-lg bg-muted/50">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-xs font-semibold">Additional Information</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => setEditingCustomFields({ cartItemId: item.cartItemId })}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                        {hasResponses ? (
                          <div className="space-y-1">
                            {item.customFields?.map((field) => {
                              const value = item.customFieldResponses?.[field.fieldId];
                              if (value) {
                                return (
                                  <p key={field.fieldId} className="text-xs text-muted-foreground">
                                    <span className="font-medium">{field.label}:</span>{" "}
                                    {value.length > 50 ? value.slice(0, 50) + "..." : value}
                                  </p>
                                );
                              }
                              return null;
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No information provided</p>
                        )}
                        {!allRequiredFilled && (
                          <div className="flex items-start gap-2 text-destructive mt-2">
                            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                            <p className="text-xs">Please fill in all required fields</p>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

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

              {hasNonVirtualItems && (
                <div>
                  <Label htmlFor="pickupDate">Pickup Moment</Label>
                  <Input
                    id="pickupDate"
                    name="pickupDate"
                    type="text"
                    value={formData.pickupDate}
                    onChange={handleInputChange}
                    placeholder="e.g., 'next lecture' or 'activity XXX'"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    When do you plan to pick up your items?
                  </p>
                </div>
              )}

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
              </div>

              {/* Donation Section */}
              <div className="pt-4 space-y-4 border-t">
                <div>
                  <Label className="text-base font-semibold">Support SIB</Label>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    We think it's important that our merch is affordable for all of our members. This means that we do not profit of the selling of the merch. Do you want to help us realise more merch, fun activities and interesting lectures in the future? You can choose to donate just a little extra with the merch you buy.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={donationAmount === "1" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDonationAmount("1")}
                  >
                    € 1
                  </Button>
                  <Button
                    type="button"
                    variant={donationAmount === "5" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDonationAmount("5")}
                  >
                    € 5
                  </Button>
                  <Button
                    type="button"
                    variant={donationAmount === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDonationAmount("")}
                  >
                    No donation
                  </Button>
                  {(() => {
                    const currentTotal = totalPrice;
                    const nextRounded = Math.ceil(currentTotal / 5) * 5;
                    const roundUpAmount = nextRounded - currentTotal;
                    if (roundUpAmount > 0.01 && roundUpAmount < 5) {
                      const isSelected = donationAmount === roundUpAmount.toFixed(2);
                      return (
                        <Button
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDonationAmount(roundUpAmount.toFixed(2))}
                        >
                          €{roundUpAmount.toFixed(2)} (rounds total to €{nextRounded})
                        </Button>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div>
                  <Label htmlFor="customDonation">Or enter a custom amount</Label>
                  <Input
                    id="customDonation"
                    name="customDonation"
                    type="number"
                    step="0.01"
                    min="0"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    placeholder="€ 0.00"
                  />
                </div>
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
                  {isSubmitting ? "Processing..." : (() => {
                    const donation = parseFloat(donationAmount) || 0;
                    const total = totalPrice + (isNaN(donation) ? 0 : donation);
                    return `Complete Order - €${total.toFixed(2)}`;
                  })()}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Custom Fields Edit Dialog */}
      {editingCustomFields && (() => {
        const editingItem = items.find((item) => item.cartItemId === editingCustomFields.cartItemId);

        if (!editingItem?.customFields) return null;

        return (
          <Dialog
            open={!!editingCustomFields}
            onOpenChange={(open) => !open && setEditingCustomFields(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Additional Information</DialogTitle>
                <DialogDescription>
                  {editingItem.name} - {editingItem.variantName}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <CustomFieldsEditor
                  fields={editingItem.customFields}
                  responses={editingItem.customFieldResponses || {}}
                  onResponseChange={(fieldId, value) =>
                    updateCustomFieldResponse(editingItem.cartItemId, fieldId, value)
                  }
                  showValidation={true}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingCustomFields(null)}>
                  Cancel
                </Button>
                <Button onClick={() => setEditingCustomFields(null)}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
