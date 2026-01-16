import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { HomePage } from "@/pages/HomePage";
import { ProductPage } from "@/pages/ProductPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { CheckoutSuccessPage } from "@/pages/CheckoutSuccessPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { StockOverviewPage } from "@/pages/StockOverviewPage";
import { LoginPage } from "@/pages/LoginPage";
import { DebugPage } from "@/pages/DebugPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:productId" element={<ProductPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/debug" element={<DebugPage />} />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock"
            element={
              <ProtectedRoute>
                <StockOverviewPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

