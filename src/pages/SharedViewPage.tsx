import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "react-router-dom";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Type for flattened order item row (matching the validator in convex/views.ts)
interface OrderItemRow {
  orderId: string;
  orderDbId: Id<"orders">;
  orderCreationTime: number;
  email: string;
  name: string;
  orderStatus: string;
  productId: Id<"products">;
  productName: string;
  variantId: string;
  variantName: string;
  quantity: number;
  price: number;
  itemTotal: number;
  customFieldResponses?: Record<string, string>;
  itemIndex: number;
}

// Available columns
const AVAILABLE_COLUMNS = [
  { id: "orderId", label: "Order ID" },
  { id: "orderCreationTime", label: "Date" },
  { id: "orderStatus", label: "Status" },
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
  { id: "productName", label: "Product" },
  { id: "variantName", label: "Variant" },
  { id: "price", label: "Price" },
  { id: "quantity", label: "Quantity" },
  { id: "itemTotal", label: "Item Total" },
];

export function SharedViewPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  
  // Validate token format - should be 32 chars, lowercase alphanumeric
  const isValidToken = shareToken && /^[a-z0-9]{32}$/.test(shareToken);
  
  const view = useQuery(
    api.views.getByShareToken,
    isValidToken ? { shareToken } : "skip"
  );
  
  const rows = useQuery(
    api.views.executeByShareToken,
    isValidToken ? { shareToken: shareToken! } : "skip"
  );

  // Show error for invalid token format
  if (!isValidToken) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-destructive text-lg font-semibold mb-4">Invalid share link</p>
          <p className="text-muted-foreground">
            The share link you're trying to access is not valid.
          </p>
        </div>
      </div>
    );
  }

  if (view === undefined || rows === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">Loading view...</div>
      </div>
    );
  }

  if (view === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-destructive text-lg font-semibold mb-2">View not found</p>
          <p className="text-muted-foreground">
            This view may have been deleted or sharing has been disabled.
          </p>
        </div>
      </div>
    );
  }

  const displayColumns = view.columns;

  // Helper to get column display name
  const getColumnDisplayName = (columnId: string): string => {
    if (columnId.startsWith("customField_")) {
      return columnId.substring("customField_".length);
    }
    const column = AVAILABLE_COLUMNS.find((c) => c.id === columnId);
    return column?.label || columnId;
  };

  // Helper to get cell value
  const getCellValue = (row: OrderItemRow, columnId: string): React.ReactNode => {
    if (columnId.startsWith("customField_")) {
      const fieldId = columnId.substring("customField_".length);
      return row.customFieldResponses?.[fieldId] || "-";
    }

    switch (columnId) {
      case "orderCreationTime":
        return formatDateTime(row.orderCreationTime);
      case "orderStatus":
        return (
          <Badge
            variant={
              row.orderStatus === "completed" || row.orderStatus === "paid"
                ? "default"
                : row.orderStatus === "pending"
                  ? "secondary"
                  : "destructive"
            }
          >
            {row.orderStatus}
          </Badge>
        );
      case "price":
        return `€${row.price.toFixed(2)}`;
      case "itemTotal":
        return `€${row.itemTotal.toFixed(2)}`;
      default: {
        const value = row[columnId as keyof OrderItemRow];
        if (value === null || value === undefined) {
          return "-";
        }
        if (typeof value === "object") {
          return JSON.stringify(value);
        }
        return String(value);
      }
    }
  };

  // Export to CSV
  const handleExport = () => {
    if (!rows) return;
    
    const headers = displayColumns.map(getColumnDisplayName);
    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        displayColumns
          .map((col) => {
            const value = getCellValue(row, col);
            // Handle React nodes (like Badge components)
            if (typeof value === "object" && value !== null) {
              // For Badge components, extract the status text
              if (col === "orderStatus") {
                return row.orderStatus;
              }
              return "";
            }
            // Escape commas and quotes for CSV
            const strValue = String(value);
            if (strValue.includes(",") || strValue.includes('"')) {
              return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
          })
          .join(",")
      ),
    ];
    
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${view.name.replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{view.name}</h1>
            <p className="text-muted-foreground mt-2">Read-only shared view</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={!rows || rows.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {rows.length === 0 || displayColumns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {displayColumns.length === 0 
            ? "No columns configured" 
            : "No data to display"}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                {displayColumns.map((columnId) => (
                  <TableHead key={columnId}>
                    {getColumnDisplayName(columnId)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.orderDbId}-${row.itemIndex}`}>
                  {displayColumns.map((columnId) => (
                    <TableCell key={columnId}>
                      {getCellValue(row, columnId)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {rows.length} {rows.length === 1 ? "row" : "rows"}
        </div>
      )}
    </div>
  );
}
