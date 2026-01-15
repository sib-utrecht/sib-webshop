import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import type { Id } from "../../../convex/_generated/dataModel";

interface ProductCardProps {
  id: Id<"products">;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
}

export function ProductCard({
  id,
  name,
  description,
  price,
  imageUrl,
  category,
  stock,
}: ProductCardProps) {
  const { addItem } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: id,
      name,
      price,
      imageUrl,
    });
  };

  return (
    <Link to={`/product/${id}`}>
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
            <Badge variant="secondary" className="shrink-0">
              {category}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
          <p className="mt-3 text-lg font-bold">${price.toFixed(2)}</p>
          {stock < 10 && stock > 0 && (
            <p className="text-xs text-orange-600 mt-1">Only {stock} left!</p>
          )}
          {stock === 0 && (
            <p className="text-xs text-destructive mt-1">Out of stock</p>
          )}
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button
            onClick={handleAddToCart}
            className="w-full"
            disabled={stock === 0}
          >
            Add to Cart
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
