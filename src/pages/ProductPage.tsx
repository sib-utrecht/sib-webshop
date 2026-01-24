import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useCart } from "@/context/CartContext";
import { ArrowLeft, ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { CustomFieldsEditor } from "@/components/product/CustomFieldsEditor";

export function ProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const product = useQuery(
    api.products.getByProductId,
    productId ? { productId } : "skip"
  );
  
  const { addItem, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [customFieldResponses, setCustomFieldResponses] = useState<Record<string, string>>({});
  const [showFieldValidation, setShowFieldValidation] = useState(false);

  // Set default variant and image when product loads
  if (product && selectedVariantId === null && product.variants.length > 0) {
    setSelectedVariantId(product.variants[0].variantId);
  }
  if (product && selectedImage === null) {
    setSelectedImage(product.imageUrl);
  }

  // Reset custom fields when variant changes
  const handleVariantChange = (variantId: string) => {
    setSelectedVariantId(variantId);
    setCustomFieldResponses({});
    setShowFieldValidation(false);
    setAgreedToTerms(false);
  };

  const selectedVariant = product?.variants.find(
    (v) => v.variantId === selectedVariantId
  );

  const amountInCart = items.reduce((total, item) => {
    if (
      product &&
      item.productId === product._id &&
      item.variantId === selectedVariantId
    ) {
      return total + item.quantity;
    }
    return total;
  }, 0);
  
  const canAddToCart = () => {
    if (!product || !selectedVariant) return false;
    
    // Check stock availability
    if (selectedVariant.available <= 0) return false;
    
    // Check required agreements
    if (selectedVariant.requiredAgreements && selectedVariant.requiredAgreements.length > 0 && !agreedToTerms) {
      return false;
    }
    
    // Check required custom fields
    if (selectedVariant.customFields && selectedVariant.customFields.length > 0) {
      const allRequiredFieldsFilled = selectedVariant.customFields.every((field) => {
        if (!field.required) return true;
        return customFieldResponses[field.fieldId]?.trim();
      });
      if (!allRequiredFieldsFilled) return false;
    }
    
    // Check max quantity
    if (selectedVariant.maxQuantity && amountInCart >= selectedVariant.maxQuantity) {
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    
    // Show validation if custom fields are not filled
    if (!canAddToCart()) {
      setShowFieldValidation(true);
      return;
    }
    
    addItem({
      productId: product._id,
      variantId: selectedVariant.variantId,
      name: product.name,
      variantName: selectedVariant.name,
      price: selectedVariant.price,
      imageUrl: product.imageUrl,
      isVirtual: product.isVirtual,
      maxQuantity: selectedVariant.maxQuantity,
      requiredAgreements: selectedVariant.requiredAgreements,
      customFields: selectedVariant.customFields,
      customFieldResponses: customFieldResponses,
    });
    
    // Reset fields after adding to cart
    setCustomFieldResponses({});
    setAgreedToTerms(false);
    setShowFieldValidation(false);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  if (product === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-32 rounded bg-muted mb-8" />
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-square rounded-xl bg-muted" />
            <div className="space-y-4">
              <div className="h-10 w-3/4 rounded bg-muted" />
              <div className="h-6 w-24 rounded bg-muted" />
              <div className="h-24 rounded bg-muted" />
              <div className="h-10 w-32 rounded bg-muted" />
              <div className="h-12 w-full rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold">Product Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            The product you're looking for doesn't exist.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Back to Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  const displayImages = product.gallery.length > 0 ? product.gallery : [product.imageUrl];

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-8">
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-xl bg-muted">
            <img
              src={selectedImage || product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          {displayImages.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {displayImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(img)}
                  className={`aspect-square overflow-hidden rounded-md bg-muted border-2 transition-colors cursor-pointer ${
                    selectedImage === img ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            {product.isVirtual && (
              <Badge variant="secondary" className="shrink-0 text-sm">
                Virtual
              </Badge>
            )}
          </div>

          {product.description && (
            <div className="mt-4 text-muted-foreground prose prose-sm max-w-none">
              <ReactMarkdown>{product.description}</ReactMarkdown>
            </div>
          )}

          {/* Variant Selection */}
          <div className="mt-6 space-y-4">
            <div>
              <Label className="text-base font-semibold">
                {product.variants.length > 1 ? "Select Option" : "Option"}
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const isOutOfStock = variant.available <= 0;
                  const isLowStock = variant.available > 0 && variant.available <= 5 && variant.available < 999999;
                  
                  return (
                    <Button
                      key={variant.variantId}
                      variant={selectedVariantId === variant.variantId ? "default" : "outline"}
                      onClick={() => handleVariantChange(variant.variantId)}
                      disabled={isOutOfStock}
                      className="flex-col h-auto py-2 px-4 relative"
                    >
                      <span className="font-medium">{variant.name}</span>
                      <span className="text-xs">€{variant.price.toFixed(2)}</span>
                      {isOutOfStock && (
                        <span className="text-xs text-destructive mt-1">Out of stock</span>
                      )}
                      {isLowStock && !isOutOfStock && (
                        <span className="text-xs text-orange-600 mt-1">
                          Only {variant.available} left
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>

            {selectedVariant && (
              <div className="pt-2">
                <p className="text-3xl font-bold">€{selectedVariant.price.toFixed(2)}</p>
                {selectedVariant.maxQuantity && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Max {selectedVariant.maxQuantity} per order
                  </p>
                )}
                {selectedVariant.available > 0 && selectedVariant.available < 999999 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedVariant.available} in stock
                  </p>
                )}
                {selectedVariant.available <= 0 && (
                  <p className="mt-1 text-sm text-destructive font-semibold">
                    Out of stock
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Required Agreements */}
          {selectedVariant?.requiredAgreements && selectedVariant.requiredAgreements.length > 0 && (
            <div className="mt-6 space-y-2 p-4 border rounded-lg bg-muted/50">
              {selectedVariant.requiredAgreements.map((agreement, index) => (
                <div key={index} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id={`agreement-${index}`}
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 cursor-pointer"
                  />
                  <Label htmlFor={`agreement-${index}`} className="text-sm cursor-pointer">
                    <span className="inline">
                      <ReactMarkdown>{agreement}</ReactMarkdown>
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          )}

          {/* Custom Fields */}
          {selectedVariant?.customFields && selectedVariant.customFields.length > 0 && (
            <div className="mt-6 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-3">Additional Information</h3>
              <CustomFieldsEditor
                fields={selectedVariant.customFields}
                responses={customFieldResponses}
                onResponseChange={(fieldId, value) =>
                  setCustomFieldResponses((prev) => ({ ...prev, [fieldId]: value }))
                }
                showValidation={showFieldValidation}
              />
            </div>
          )}

          {/* Add to Cart */}
          <div className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="lg"
                onClick={handleAddToCart}
                disabled={!canAddToCart()}
                className="flex-1"
              >
                {justAdded ? (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </>
                )}
              </Button>
              
              {items.length > 0 && (
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="flex-1"
                >
                  <Link to="/checkout">
                    Go to Cart
                  </Link>
                </Button>
              )}
            </div>

            {!canAddToCart() && selectedVariant?.requiredAgreements && !agreedToTerms && (
              <p className="text-sm text-destructive">
                Please agree to the terms above to continue
              </p>
            )}
            
            {!canAddToCart() && selectedVariant && selectedVariant.available <= 0 && (
              <p className="text-sm text-destructive">
                This item is currently out of stock
              </p>
            )}

            {amountInCart > 0 && (
              <p className="text-sm text-muted-foreground">
                You have {amountInCart} in your cart
              </p>
            )}

            {selectedVariant?.maxQuantity && amountInCart >= selectedVariant.maxQuantity && (
              <p className="text-sm text-orange-600">
                Maximum quantity reached for this option
              </p>
            )}
          </div>

          {!product.isVirtual && (
            <div className="mt-auto pt-8 border-t">
              <h2 className="font-semibold mb-2">Product Details</h2>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• This item should be picked up at an activity.</li>
                <li>• Contact the board to arrange the pickup.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
