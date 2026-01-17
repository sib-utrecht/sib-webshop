import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ProductGrid } from "@/components/product/ProductGrid";

export function HomePage() {
  const products = useQuery(api.products.list);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Merch & more</h1>
        <p className="mt-2 text-muted-foreground">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
      </div>

      {products === undefined ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[400px] animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
