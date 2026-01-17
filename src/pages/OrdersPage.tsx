import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, User, Mail, Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useMemo } from "react";

export function OrdersPage() {
  const orders = useQuery(api.orders.list);
  const products = useQuery(api.products.listAll);

  // Create a lookup map for custom field labels
  const customFieldLabels = useMemo(() => {
    if (!products) return new Map();
    
    const map = new Map<string, Map<string, string>>(); // productId -> (fieldId -> label)
    
    products.forEach(product => {
      product.variants.forEach(variant => {
        if (variant.customFields) {
          const fieldMap = new Map<string, string>();
          variant.customFields.forEach(field => {
            fieldMap.set(field.fieldId, field.label);
          });
          // Store by variant's custom fields signature since we don't store variant info in order
          const key = `${product._id}-${variant.variantId}`;
          map.set(key, fieldMap);
        }
      });
    });
    
    return map;
  }, [products]);

  if (orders === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">Loading orders...</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">No Orders Yet</h1>
          <p className="text-muted-foreground">
            Orders will appear here once customers make purchases.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Orders</h1>

      <div className="space-y-6">
        {orders.map((order) => (
          <Card key={order._id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Order {order.orderId}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDateTime(order._creationTime)}
                    </div>
                  </div>
                </div>
                <Badge
                  variant={
                    order.status === "completed"
                      ? "default"
                      : order.status === "pending"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {order.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Customer Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{order.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{order.email}</span>
                    </div>
                    {order.comments && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs">
                        <span className="font-medium">Comments:</span> {order.comments}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Order Items</h3>
                  <ul className="space-y-3">
                    {order.items.map((item, index) => (
                      <li key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.variantName} × {item.quantity}
                            </p>
                          </div>
                          <span className="font-medium ml-2">
                            €{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        {/* Custom Field Responses */}
                        {item.customFieldResponses && Object.keys(item.customFieldResponses).length > 0 && (
                          <div className="ml-4 mt-1 p-2 bg-muted/50 rounded text-xs space-y-1">
                            {Object.entries(item.customFieldResponses).map(([fieldId, value]) => {
                              // Look up the field label
                              const fieldMap = customFieldLabels.get(`${item.productId}-${item.variantId}`);
                              const label = fieldMap?.get(fieldId) || fieldId;
                              
                              return (
                                <div key={fieldId}>
                                  <span className="font-medium">{label}:</span>{" "}
                                  <span className="text-muted-foreground">{value}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>€{order.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
