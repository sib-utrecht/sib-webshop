import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Store, Package, Box, Edit, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useState } from "react";

export function Header() {
  const { totalItems } = useCart();
  const { isAuthenticated, logout } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
          <Store className="h-6 w-6" />
          <span>SIB-Utrecht</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Products
          </Link>
          {isAuthenticated && (
            <>
              <Link
                to="/orders"
                className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-1"
              >
                <Package className="h-4 w-4" />
                Orders
              </Link>
              <Link
                to="/stock"
                className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-1"
              >
                <Box className="h-4 w-4" />
                Stock
              </Link>
              <Link
                to="/products/edit"
                className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-1"
              >
                <Edit className="h-4 w-4" />
                Edit Products
              </Link>
            </>
          )}
          <Button
            variant="outline"
            size="icon"
            className="relative"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {totalItems}
              </span>
            )}
          </Button>
          {isAuthenticated ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/login")}
              title="Login"
            >
              <LogIn className="h-5 w-5" />
            </Button>
          )}
        </nav>
      </div>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
