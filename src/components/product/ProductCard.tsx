import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Id } from "../../../convex/_generated/dataModel";

interface ProductCardProps {
  id: Id<"products">;
  productId: string;
  name: string;
  description: string | null;
  shortDescription?: string;
  imageUrl: string;
  variants: Array<{
    variantId: string;
    name: string;
    price: number;
  }>;
  isVirtual: boolean;
}

export function ProductCard({
  id: _id,
  productId,
  name,
  description,
  shortDescription,
  imageUrl,
  variants,
  isVirtual: _isVirtual,
}: ProductCardProps) {
  const minPrice = Math.min(...variants.map((v) => v.price));
  const maxPrice = Math.max(...variants.map((v) => v.price));
  const priceDisplay =
    minPrice === maxPrice
      ? `€${minPrice.toFixed(2)}`
      : `€${minPrice.toFixed(2)} - €${maxPrice.toFixed(2)}`;

  return (
    <Link to={`/product/${productId}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg h-full flex flex-col">
        <div className="aspect-square overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
        <CardContent className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold line-clamp-1">{name}</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {shortDescription || description || ""}
          </p>
          <p className="mt-3 text-lg font-bold">{priceDisplay}</p>
          {variants.length > 1 && (
            <p className="text-xs text-muted-foreground mt-1">
              {variants.length} options available
            </p>
          )}
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button className="w-full">View Details</Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
