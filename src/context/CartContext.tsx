import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Id } from "../../convex/_generated/dataModel";

export interface CartItem {
  productId: Id<"products">;
  variantId: string;
  name: string;
  variantName: string;
  price: number;
  imageUrl: string;
  quantity: number;
  maxQuantity?: number;
  requiredAgreements?: string[];
  agreedToTerms?: boolean;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity" | "agreedToTerms">) => void;
  removeItem: (productId: Id<"products">, variantId: string) => void;
  updateQuantity: (productId: Id<"products">, variantId: string, quantity: number) => void;
  updateAgreement: (productId: Id<"products">, variantId: string, agreed: boolean) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "webshop-cart";

// Helper to validate cart items from localStorage
function loadCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return [];
    
    const items = JSON.parse(saved) as CartItem[];
    
    // Validate that productIds are actually product IDs (not order IDs)
    const validItems = items.filter(item => {
      // Product IDs should not contain certain patterns that order IDs have
      const id = item.productId as string;
      // If ID looks suspicious (e.g., too long or contains patterns), filter it out
      return id && id.length < 50 && !id.includes("order");
    });
    
    // If we filtered out items, update localStorage
    if (validItems.length !== items.length) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(validItems));
    }
    
    return validItems;
  } catch (error) {
    console.error("Error loading cart from localStorage:", error);
    localStorage.removeItem(CART_STORAGE_KEY);
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCartFromStorage);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "quantity" | "agreedToTerms">) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === item.productId && i.variantId === item.variantId
      );
      if (existing) {
        const newQuantity = existing.quantity + 1;
        if (item.maxQuantity && newQuantity > item.maxQuantity) {
          return prev; // Don't add if max quantity reached
        }
        return prev.map((i) =>
          i.productId === item.productId && i.variantId === item.variantId
            ? { ...i, quantity: newQuantity }
            : i
        );
      }
      return [
        ...prev,
        {
          ...item,
          quantity: 1,
          agreedToTerms: item.requiredAgreements ? false : undefined,
        },
      ];
    });
  };

  const removeItem = (productId: Id<"products">, variantId: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.variantId === variantId))
    );
  };

  const updateQuantity = (productId: Id<"products">, variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId && i.variantId === variantId) {
          if (i.maxQuantity && quantity > i.maxQuantity) {
            return i; // Don't update if exceeds max
          }
          return { ...i, quantity };
        }
        return i;
      })
    );
  };

  const updateAgreement = (productId: Id<"products">, variantId: string, agreed: boolean) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.variantId === variantId
          ? { ...i, agreedToTerms: agreed }
          : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateAgreement,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
