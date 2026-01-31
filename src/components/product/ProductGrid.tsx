import { ProductCard } from "./ProductCard";
import type { Id } from "../../../convex/_generated/dataModel";

interface Product {
  _id: Id<"products">;
  productId: string;
  name: string;
  description: string | null;
  shortDescription?: string;
  imageUrl: string;
  gallery: string[];
  isVirtual: boolean;
  variants: Array<{
    variantId: string;
    name: string;
    price: number;
    maxQuantity?: number;
    requiredAgreements?: string[];
  }>;
}

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg text-muted-foreground">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product._id}
          id={product._id}
          productId={product.productId}
          name={product.name}
          shortDescription={product.shortDescription}
          imageUrl={product.imageUrl}
          variants={product.variants}
          isVirtual={product.isVirtual}
        />
      ))}
    </div>
  );
}
