import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import "./index.css";
import App from "./App.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Wrapper component to set auth token on Convex client
function ConvexAuthWrapper({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  
  // Update Convex client with auth token whenever it changes
  useEffect(() => {
    if (token) {
      convex.setAuth(async () => token);
    } else {
      convex.clearAuth();
    }
  }, [token]);
  
  return <>{children}</>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <AuthProvider>
        <ConvexAuthWrapper>
          <CartProvider>
            <App />
          </CartProvider>
        </ConvexAuthWrapper>
      </AuthProvider>
    </ConvexProvider>
  </StrictMode>
);
