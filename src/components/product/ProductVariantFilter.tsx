import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

interface Product {
  _id: Id<"products">;
  productId: string;
  name: string;
  variants: Array<{
    _id: Id<"variants">;
    variantId: string;
    name: string;
    price: number;
  }>;
}

interface ProductVariantFilterProps {
  products: Product[] | undefined;
  selectedVariantIds: Id<"variants">[];
  onVariantToggle: (variantId: Id<"variants">) => void;
  onProductToggle: (productId: Id<"products">) => void;
}

export function ProductVariantFilter({
  products,
  selectedVariantIds,
  onVariantToggle,
  onProductToggle,
}: ProductVariantFilterProps) {
  const [expandedProducts, setExpandedProducts] = useState<Set<Id<"products">>>(new Set());

  const toggleProductExpansion = (productId: Id<"products">) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const isProductSelected = (productId: Id<"products">) => {
    const product = products?.find((p) => p._id === productId);
    if (!product) return false;
    const allVariantDbIds = product.variants.map((v) => v._id);
    return allVariantDbIds.every((id) => selectedVariantIds.includes(id));
  };

  const isProductPartiallySelected = (productId: Id<"products">) => {
    const product = products?.find((p) => p._id === productId);
    if (!product) return false;
    const allVariantDbIds = product.variants.map((v) => v._id);
    const someSelected = allVariantDbIds.some((id) => selectedVariantIds.includes(id));
    const allSelected = allVariantDbIds.every((id) => selectedVariantIds.includes(id));
    return someSelected && !allSelected;
  };

  if (products === undefined) {
    return <div className="text-sm text-muted-foreground p-4">Loading products...</div>;
  }

  if (products.length === 0) {
    return <div className="text-sm text-muted-foreground p-4">No products available</div>;
  }

  return (
    <div className="space-y-1 max-h-96 overflow-y-auto">
      {products.map((product) => {
        const isExpanded = expandedProducts.has(product._id);
        const isChecked = isProductSelected(product._id);
        const isIndeterminate = isProductPartiallySelected(product._id);

        return (
          <div key={product._id} className="space-y-1">
            {/* Product row */}
            <div className="flex items-center gap-2 hover:bg-muted/50 p-2 rounded">
              <button
                type="button"
                onClick={() => toggleProductExpansion(product._id)}
                className="p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={isChecked}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = isIndeterminate;
                    }
                  }}
                  onChange={() => onProductToggle(product._id)}
                  className="rounded"
                />
                <span className="text-sm font-medium">{product.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({product.variants.length} variant{product.variants.length !== 1 ? "s" : ""})
                </span>
              </label>
            </div>

            {/* Variants (shown when expanded) */}
            {isExpanded && (
              <div className="ml-8 space-y-1 pl-2 border-l-2 border-muted">
                {product.variants.map((variant) => (
                  <label
                    key={variant._id}
                    className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-muted/30 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedVariantIds.includes(variant._id)}
                      onChange={() => onVariantToggle(variant._id)}
                      className="rounded"
                    />
                    <span className="text-sm">{variant.name}</span>
                    <span className="text-xs text-muted-foreground">
                      €{variant.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      ({product.productId}-{variant.variantId})
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
