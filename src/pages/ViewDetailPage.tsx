import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams, useNavigate } from "react-router-dom";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
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
}

export function ViewDetailPage() {
  const { viewId } = useParams<{ viewId: string }>();
  const navigate = useNavigate();
  
  const view = useQuery(
    api.views.get,
    viewId ? { viewId: viewId as Id<"views"> } : "skip"
  );
  
  const rows = useQuery(
    api.views.execute,
    viewId ? { viewId: viewId as Id<"views"> } : "skip"
  );

  if (!viewId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-destructive">Invalid view ID</div>
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
        <div className="text-center text-destructive">View not found</div>
      </div>
    );
  }

  // Helper to get column display name
  const getColumnDisplayName = (columnId: string): string => {
    if (columnId.startsWith("customField_")) {
      return columnId.substring("customField_".length);
    }
    // Convert camelCase to Title Case
    return columnId
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
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
      case "itemTotal":
        return `€${row[columnId].toFixed(2)}`;
      default:
        return row[columnId] ?? "-";
    }
  };

  // Export to CSV
  const handleExport = () => {
    const headers = view.columns.map(getColumnDisplayName);
    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        view.columns
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/views")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Views
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{view.name}</h1>
            {view.description && (
              <p className="text-muted-foreground mt-2">{view.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/views/${viewId}/edit`)}
            >
              Edit View
            </Button>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No orders match the view filters
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                {view.columns.map((columnId) => (
                  <TableHead key={columnId}>
                    {getColumnDisplayName(columnId)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.orderDbId}-${row.variantId}-${row.productId}`}>
                  {view.columns.map((columnId) => (
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

      <div className="mt-4 text-sm text-muted-foreground">
        Showing {rows.length} {rows.length === 1 ? "row" : "rows"}
      </div>
    </div>
  );
}
