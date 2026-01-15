import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import { ArrowLeft, ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const product = useQuery(
    api.products.getById,
    id ? { id: id as Id<"products"> } : "skip"
  );
  const { addItem, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const isInCart = items.some(
    (item) => product && item.productId === product._id
  );
  const cartItem = items.find(
    (item) => product && item.productId === product._id
  );

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product._id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
    });
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

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-8">
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-xl bg-muted">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <Badge variant="secondary" className="shrink-0 text-sm">
              {product.category}
            </Badge>
          </div>

          <p className="mt-4 text-lg text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-6">
            <p className="text-4xl font-bold">${product.price.toFixed(2)}</p>
            {product.stock > 0 ? (
              <p
                className={`mt-2 text-sm ${product.stock < 10 ? "text-orange-600" : "text-green-600"}`}
              >
                {product.stock < 10
                  ? `Only ${product.stock} left in stock!`
                  : "In stock"}
              </p>
            ) : (
              <p className="mt-2 text-sm text-destructive">Out of stock</p>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="w-full sm:w-auto"
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

            {isInCart && !justAdded && (
              <p className="text-sm text-muted-foreground">
                You have {cartItem?.quantity} in your cart
              </p>
            )}
          </div>

          <div className="mt-auto pt-8 border-t">
            <h2 className="font-semibold mb-2">Product Details</h2>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Category: {product.category}</li>
              <li>• Free shipping on orders over $50</li>
              <li>• 30-day return policy</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
