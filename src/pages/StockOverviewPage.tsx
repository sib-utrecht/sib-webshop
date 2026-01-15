import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Edit, Check, X, AlertCircle } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

export function StockOverviewPage() {
  const products = useQuery(api.products.list);
  const updateStock = useMutation(api.stock.updateStock);
  const [editingStock, setEditingStock] = useState<{
    productId: Id<"products">;
    variantId: string;
    currentValue: number;
  } | null>(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [error, setError] = useState("");

  if (products === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">Loading stock...</div>
      </div>
    );
  }

  const handleEdit = (productId: Id<"products">, variantId: string, currentQuantity: number) => {
    setEditingStock({ productId, variantId, currentValue: currentQuantity });
    setNewQuantity(currentQuantity.toString());
    setError("");
  };

  const handleCancel = () => {
    setEditingStock(null);
    setNewQuantity("");
    setError("");
  };

  const handleSave = async () => {
    if (!editingStock) return;

    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity < 0) {
      setError("Please enter a valid quantity (0 or greater)");
      return;
    }

    try {
      await updateStock({
        productId: editingStock.productId,
        variantId: editingStock.variantId,
        quantity,
      });
      setEditingStock(null);
      setNewQuantity("");
      setError("");
    } catch (err) {
      setError("Failed to update stock");
    }
  };

  const getStockBadgeVariant = (quantity: number) => {
    if (quantity === 0) return "destructive";
    if (quantity <= 5) return "secondary";
    return "default";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Stock Overview</h1>
        <p className="text-muted-foreground">View and manage inventory for all products</p>
      </div>

      {products.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-16">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Products</h2>
          <p className="text-muted-foreground">Products will appear here once added.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {products.map((product) => (
            <Card key={product._id}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <CardTitle>{product.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {product.variants.length} variant{product.variants.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.variants.map((variant) => {
                    const stockInfo = product.stock?.find((s) => s.variantId === variant.variantId);
                    const quantity = stockInfo?.quantity ?? 0;
                    const isEditing =
                      editingStock?.productId === product._id &&
                      editingStock?.variantId === variant.variantId;

                    return (
                      <div
                        key={variant.variantId}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{variant.name}</p>
                          <p className="text-sm text-muted-foreground">€{variant.price.toFixed(2)}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          {isEditing ? (
                            <>
                              <div className="flex flex-col gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={newQuantity}
                                  onChange={(e) => setNewQuantity(e.target.value)}
                                  className="w-24 h-9"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSave();
                                    if (e.key === "Escape") handleCancel();
                                  }}
                                />
                                {error && (
                                  <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {error}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 text-green-600 hover:text-green-700"
                                onClick={handleSave}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9"
                                onClick={handleCancel}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Badge variant={getStockBadgeVariant(quantity)} className="min-w-[80px] justify-center">
                                {quantity === 0 ? "Out of Stock" : `${quantity} in stock`}
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9"
                                onClick={() => handleEdit(product._id, variant.variantId, quantity)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
