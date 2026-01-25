import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Id } from "../../convex/_generated/dataModel";

export interface CartItem {
  cartItemId: string; // Unique ID for this cart entry (generated on add)
  productId: Id<"products">;
  variantId: string;
  name: string;
  variantName: string;
  price: number;
  imageUrl: string;
  isVirtual: boolean;
  quantity: number;
  maxQuantity?: number;
  requiredAgreements?: string[];
  agreements?: string[]; // Timestamped agreement strings
  customFields?: Array<{
    fieldId: string;
    label: string;
    type: "text" | "email" | "tel" | "textarea";
    required: boolean;
    placeholder?: string;
  }>;
  customFieldResponses?: Record<string, string>;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "cartItemId" | "quantity">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateCustomFieldResponse: (cartItemId: string, fieldId: string, value: string) => void;
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
    
    // Validate and migrate cart items
    const validItems = items
      .filter(item => {
        // Product IDs should not contain certain patterns that order IDs have
        const id = item.productId as string;
        // If ID looks suspicious (e.g., too long or contains patterns), filter it out
        return id && id.length < 50 && !id.includes("order");
      })
      .map(item => {
        // Migrate items without cartItemId (from before this feature was added)
        if (!item.cartItemId) {
          return {
            ...item,
            cartItemId: item.customFields?.length
              ? `${item.productId}-${item.variantId}-${Date.now()}-${Math.random()}`
              : `${item.productId}-${item.variantId}`,
          };
        }
        return item;
      });
    
    // Update localStorage with migrated items
    if (validItems.length !== items.length || validItems.some((item, i) => item.cartItemId !== items[i].cartItemId)) {
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

  const addItem = (item: Omit<CartItem, "cartItemId" | "quantity">) => {
    setItems((prev) => {
      // Items with custom fields should not stack - each one may have different responses
      if (item.customFields && item.customFields.length > 0) {
        return [
          ...prev,
          {
            ...item,
            cartItemId: `${item.productId}-${item.variantId}-${Date.now()}-${Math.random()}`,
            quantity: 1,
          },
        ];
      }

      // For items without custom fields, allow stacking as before
      const existing = prev.find(
        (i) => i.productId === item.productId && i.variantId === item.variantId
      );
      if (existing) {
        const newQuantity = existing.quantity + 1;
        if (item.maxQuantity && newQuantity > item.maxQuantity) {
          return prev; // Don't add if max quantity reached
        }
        return prev.map((i) =>
          i.cartItemId === existing.cartItemId
            ? { ...i, quantity: newQuantity }
            : i
        );
      }
      return [
        ...prev,
        {
          ...item,
          cartItemId: `${item.productId}-${item.variantId}`,
          quantity: 1,
          customFieldResponses: item.customFields ? {} : undefined,
        },
      ];
    });
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.cartItemId === cartItemId) {
          if (i.maxQuantity && quantity > i.maxQuantity) {
            return i; // Don't update if exceeds max
          }
          return { ...i, quantity };
        }
        return i;
      })
    );
  };

  const updateCustomFieldResponse = (cartItemId: string, fieldId: string, value: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.cartItemId === cartItemId
          ? { ...i, customFieldResponses: { ...i.customFieldResponses, [fieldId]: value } }
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
        updateCustomFieldResponse,
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
