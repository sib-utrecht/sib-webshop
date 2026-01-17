import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { items, removeItem, totalPrice } = useCart();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Shopping Cart</SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? "Your cart is empty"
              : `${items.length} item${items.length > 1 ? "s" : ""} in your cart`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-muted-foreground">
                Add some products to get started!
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.cartItemId}
                  className="flex gap-4 border-b pb-4 last:border-0"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <h4 className="font-medium line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-muted-foreground">{item.variantName}</p>
                    <p className="text-sm text-muted-foreground">
                      €{item.price.toFixed(2)}
                    </p>
                    <div className="mt-auto flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 ml-auto text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.cartItemId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="flex-col gap-4 border-t pt-4 sm:flex-col">
            <div className="flex items-center justify-between w-full">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-lg font-bold">€{totalPrice.toFixed(2)}</span>
            </div>
            <Button asChild className="w-full" onClick={() => onOpenChange(false)}>
              <Link to="/checkout">Proceed to Checkout</Link>
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
