import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HomePage } from "@/pages/HomePage";
import { ProductPage } from "@/pages/ProductPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { CheckoutSuccessPage } from "@/pages/CheckoutSuccessPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { StockOverviewPage } from "@/pages/StockOverviewPage";
import { ProductEditorPage } from "@/pages/ProductEditorPage";
import { LoginPage } from "@/pages/LoginPage";
import { DebugPage } from "@/pages/DebugPage";
import { ViewsListPage } from "@/pages/ViewsListPage";
import { ViewDetailPage } from "@/pages/ViewDetailPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function App() {
  return (
    <ErrorBoundary>
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
          <Route
            path="/products/edit"
            element={
              <ProtectedRoute>
                <ProductEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/views"
            element={
              <ProtectedRoute>
                <ViewsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/views/:viewId"
            element={
              <ProtectedRoute>
                <ViewDetailPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

