import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams, useNavigate } from "react-router-dom";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, GripVertical, ArrowUp, ArrowDown, Filter, Pencil, Check, X, Share2, Copy, Link2Off } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { buildShareUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProductVariantFilter } from "@/components/product/ProductVariantFilter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

const ORDER_STATUSES = ["completed", "pending", "paid", "canceled", "expired", "failed"];

export function ViewDetailPage() {
  const { viewId } = useParams<{ viewId: string }>();
  const navigate = useNavigate();
  
  // Validate ID format - Convex IDs are 32 chars, lowercase alphanumeric
  const isValidId = viewId && /^[a-z0-9]{32}$/.test(viewId);
  
  // Show error for invalid ID format before calling useQuery
  if (!isValidId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-destructive text-lg font-semibold mb-4">Invalid view ID</p>
          <Button variant="outline" onClick={() => navigate("/views")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Views
          </Button>
        </div>
      </div>
    );
  }
  
  // At this point, viewId is guaranteed to be valid
  const view = useQuery(api.views.get, { viewId: viewId as Id<"views"> });
  const products = useQuery(api.products.listAll);
  const updateView = useMutation(api.views.update);
  const generateShareToken = useMutation(api.views.generateShareToken);
  const disableSharing = useMutation(api.views.disableSharing);
  
  // Local state for editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [name, setName] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Id<"products">[]>([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<Id<"variants">[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Load view data into local state
  useEffect(() => {
    if (view && view !== null) {
      setName(view.name);
      setSelectedColumns(view.columns);
      setSelectedProductIds(view.filters?.productIds || []);
      setSelectedVariantIds(view.filters?.variantIds || []);
      setSelectedStatuses(view.filters?.statuses || []);
      setSortBy(view.sortBy || "");
      setSortOrder(view.sortOrder || "desc");
    }
  }, [view]);

  // Use live config when editing, saved config when viewing
  const rows = useQuery(
    api.views.execute,
    view !== null ? { viewId: viewId as Id<"views"> } : "skip"
  );

  // Handler functions for editing
  const handleColumnToggle = async (columnId: string) => {
    const newColumns = selectedColumns.includes(columnId)
      ? selectedColumns.filter((id) => id !== columnId)
      : [...selectedColumns, columnId];
    
    setSelectedColumns(newColumns);
    
    if (view) {
      await updateView({
        viewId: viewId as Id<"views">,
        name: view.name,
        columns: newColumns,
        filters: {
          productIds: selectedProductIds.length > 0 ? selectedProductIds : undefined,
          variantIds: selectedVariantIds.length > 0 ? selectedVariantIds : undefined,
          statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        },
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
      });
    }
  };

  const handleProductToggle = async (productId: Id<"products">) => {
    const product = products?.find((p) => p._id === productId);
    if (!product) return;

    const allVariantDbIds = product.variants.map((v) => v._id);
    const allSelected = allVariantDbIds.every((id) => selectedVariantIds.includes(id));

    const newVariantIds = allSelected
      ? selectedVariantIds.filter((id) => !allVariantDbIds.includes(id))
      : Array.from(new Set([...selectedVariantIds, ...allVariantDbIds]));
    
    setSelectedVariantIds(newVariantIds);
    
    await updateViewConfig({
      filters: {
        productIds: selectedProductIds.length > 0 ? selectedProductIds : undefined,
        variantIds: newVariantIds.length > 0 ? newVariantIds : undefined,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      },
    });
  };

  const handleVariantToggle = async (variantDbId: Id<"variants">) => {
    const newVariantIds = selectedVariantIds.includes(variantDbId)
      ? selectedVariantIds.filter((id) => id !== variantDbId)
      : [...selectedVariantIds, variantDbId];
    
    setSelectedVariantIds(newVariantIds);
    
    await updateViewConfig({
      filters: {
        productIds: selectedProductIds.length > 0 ? selectedProductIds : undefined,
        variantIds: newVariantIds.length > 0 ? newVariantIds : undefined,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      },
    });
  };

  const handleStatusToggle = async (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    
    setSelectedStatuses(newStatuses);
    
    await updateViewConfig({
      filters: {
        productIds: selectedProductIds.length > 0 ? selectedProductIds : undefined,
        variantIds: selectedVariantIds.length > 0 ? selectedVariantIds : undefined,
        statuses: newStatuses.length > 0 ? newStatuses : undefined,
      },
    });
  };

  const updateViewConfig = async (updates: Partial<{
    columns: string[];
    filters: { productIds?: Id<"products">[]; variantIds?: Id<"variants">[]; statuses?: string[] };
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }>) => {
    if (!view) return;
    
    await updateView({
      viewId: viewId as Id<"views">,
      name: view.name,
      columns: updates.columns ?? selectedColumns,
      filters: updates.filters ?? {
        productIds: selectedProductIds.length > 0 ? selectedProductIds : undefined,
        variantIds: selectedVariantIds.length > 0 ? selectedVariantIds : undefined,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      },
      sortBy: updates.sortBy !== undefined ? (updates.sortBy || undefined) : (sortBy || undefined),
      sortOrder: updates.sortOrder ?? (sortBy ? sortOrder : undefined),
    });
  };

  // Drag and drop handlers for column reordering
  const handleDragStart = (columnId: string) => {
    setDraggedColumn(columnId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    
    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    const newColumns = [...selectedColumns];
    const draggedIndex = newColumns.indexOf(draggedColumn);
    const targetIndex = newColumns.indexOf(targetColumnId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }
    
    // Remove dragged item
    newColumns.splice(draggedIndex, 1);
    // Insert at new position
    newColumns.splice(targetIndex, 0, draggedColumn);
    
    setSelectedColumns(newColumns);
    setDraggedColumn(null);
    setDragOverColumn(null);

    await updateViewConfig({ columns: newColumns });
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Title editing handler
  const handleSaveTitle = async () => {
    if (!view || !name.trim()) return;
    
    await updateView({
      viewId: viewId as Id<"views">,
      name: name.trim(),
      columns: view.columns,
      filters: view.filters,
      sortBy: view.sortBy,
      sortOrder: view.sortOrder,
    });
    
    setIsEditingTitle(false);
  };

  const handleCancelTitleEdit = () => {
    if (view) {
      setName(view.name);
    }
    setIsEditingTitle(false);
  };

  // Sorting handler
  const handleColumnSort = async (columnId: string) => {
    let newSortBy = sortBy;
    let newSortOrder = sortOrder;

    if (sortBy === columnId) {
      // Cycle through: asc -> desc -> none
      if (sortOrder === "asc") {
        newSortOrder = "desc";
      } else {
        newSortBy = "";
        newSortOrder = "desc";
      }
    } else {
      newSortBy = columnId;
      newSortOrder = "asc";
    }

    setSortBy(newSortBy);
    setSortOrder(newSortOrder);

    await updateViewConfig({
      sortBy: newSortBy,
      sortOrder: newSortBy ? newSortOrder : undefined,
    });
  };

  // Share link handlers
  const handleGenerateShareLink = async () => {
    if (!viewId) return;
    await generateShareToken({ viewId: viewId as Id<"views"> });
  };

  const handleDisableSharing = async () => {
    if (!viewId) return;
    await disableSharing({ viewId: viewId as Id<"views"> });
  };

  const handleCopyShareLink = () => {
    if (!view?.shareToken) return;
    const shareUrl = buildShareUrl(view.shareToken);
    navigator.clipboard.writeText(shareUrl);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
  };

  if (view === undefined) {
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
          <p className="text-muted-foreground mb-4">This view may have been deleted.</p>
          <Button
            variant="outline"
            onClick={() => navigate("/views")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Views
          </Button>
        </div>
      </div>
    );
  }

  // Use local state columns for display
  const displayColumns = selectedColumns;

  // Helper to get column display name
  const getColumnDisplayName = (columnId: string): string => {
    if (columnId.startsWith("customField_")) {
      return columnId.substring("customField_".length);
    }
    // Look up label from AVAILABLE_COLUMNS
    const column = AVAILABLE_COLUMNS.find((c) => c.id === columnId);
    return column?.label || columnId;
  };

  // Helper to get cell value
  const getCellValue = (row: OrderItemRow, columnId: string): React.ReactNode => {
    if (columnId.startsWith("customField_")) {
      const label = columnId.substring("customField_".length);
      return row.customFieldResponses?.[label] || "-";
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/views")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Views
        </Button>
        
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-3xl font-bold h-auto py-2 max-w-2xl"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveTitle();
                    } else if (e.key === "Escape") {
                      handleCancelTitleEdit();
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveTitle}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelTitleEdit}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{view.name}</h1>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingTitle(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={!rows || rows.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

      {/* Share Link Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share View
          </CardTitle>
        </CardHeader>
        <CardContent>
          {view.shareToken ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="shareUrl" className="text-sm font-medium">
                  Share URL
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="shareUrl"
                    value={view.shareToken ? buildShareUrl(view.shareToken) : ""}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyShareLink}
                  >
                    {copiedToClipboard ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Anyone with this link can view this data in read-only mode.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateShareLink}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Regenerate Link
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisableSharing}
                >
                  <Link2Off className="h-4 w-4 mr-2" />
                  Disable Sharing
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sharing is currently disabled. Generate a secure link to share this view with others.
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerateShareLink}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Generate Share Link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column Badges */}
      <div className="mb-4 p-4 border rounded-lg bg-muted/20">
          <Label className="text-sm font-medium mb-3 block">Columns</Label>
          <div className="flex flex-wrap gap-2 mb-4">
            {AVAILABLE_COLUMNS.map((column) => {
              const isSelected = selectedColumns.includes(column.id);
              const isProductColumn = column.id === "productName";
              const isStatusColumn = column.id === "orderStatus";
              const isProductFilterActive = selectedVariantIds.length > 0;
              const isStatusFilterActive = selectedStatuses.length > 0;
              
              if (isProductColumn) {
                return (
                  <Badge
                    key={column.id}
                    variant={isSelected ? "outline" : "secondary"}
                    className={`cursor-pointer transition-all ${
                      isSelected ? "opacity-100" : "opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => handleColumnToggle(column.id)}
                  >
                    <span className="flex items-center gap-1.5">
                      {column.label}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className={`inline-flex rounded p-0.5 transition-colors ${
                              isProductFilterActive 
                                ? "bg-foreground text-background hover:bg-foreground/90" 
                                : "hover:bg-black/10"
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Filter className="h-3 w-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96" align="start" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-3">
                            <h4 className="font-semibold">Filter Products</h4>
                            <ProductVariantFilter
                              products={products}
                              selectedVariantIds={selectedVariantIds}
                              onVariantToggle={handleVariantToggle}
                              onProductToggle={handleProductToggle}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </span>
                  </Badge>
                );
              }
              
              if (isStatusColumn) {
                return (
                  <Badge
                    key={column.id}
                    variant={isSelected ? "outline" : "secondary"}
                    className={`cursor-pointer transition-all ${
                      isSelected ? "opacity-100" : "opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => handleColumnToggle(column.id)}
                  >
                    <span className="flex items-center gap-1.5">
                      {column.label}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className={`inline-flex rounded p-0.5 transition-colors ${
                              isStatusFilterActive 
                                ? "bg-foreground text-background hover:bg-foreground/90" 
                                : "hover:bg-black/10"
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Filter className="h-3 w-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-3">
                            <h4 className="font-semibold">Filter by Status</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {ORDER_STATUSES.map((status) => (
                                <label
                                  key={status}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedStatuses.includes(status)}
                                    onChange={() => handleStatusToggle(status)}
                                    className="rounded"
                                  />
                                  <span className="text-sm capitalize">{status}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </span>
                  </Badge>
                );
              }
              
              return (
                <Badge
                  key={column.id}
                  variant={isSelected ? "outline" : "secondary"}
                  className={`cursor-pointer transition-all ${
                    isSelected ? "opacity-100" : "opacity-60 hover:opacity-100"
                  }`}
                  onClick={() => handleColumnToggle(column.id)}
                >
                  {column.label}
                </Badge>
              );
            })}
          </div>
          
          {/* Custom Field Badges */}
          {rows && rows.length > 0 && (() => {
            const customFieldLabels = new Set<string>();
            rows.forEach((row) => {
              if (row.customFieldResponses) {
                Object.keys(row.customFieldResponses).forEach((label) => {
                  customFieldLabels.add(label);
                });
              }
            });
            
            if (customFieldLabels.size === 0) return null;
            
            return (
              <div className="pt-3 border-t">
                <Label className="text-sm font-medium mb-3 block">Custom Fields</Label>
                <div className="flex flex-wrap gap-2">
                  {Array.from(customFieldLabels).sort().map((label) => {
                    const columnId = `customField_${label}`;
                    const isSelected = selectedColumns.includes(columnId);
                    
                    return (
                      <Badge
                        key={columnId}
                        variant={isSelected ? "outline" : "secondary"}
                        className={`cursor-pointer transition-all ${
                          isSelected ? "opacity-100" : "opacity-60 hover:opacity-100"
                        }`}
                        onClick={() => handleColumnToggle(columnId)}
                      >
                        {label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {rows === undefined ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading data...
        </div>
      ) : rows.length === 0 || displayColumns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {displayColumns.length === 0 
            ? "No columns selected" 
            : "No orders match the view filters"}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                {displayColumns.map((columnId) => {
                  const isSorted = sortBy === columnId;
                  const isAscending = isSorted && sortOrder === "asc";
                  const isProductColumn = columnId === "productName";
                  const isStatusColumn = columnId === "orderStatus";
                  
                  return (
                    <TableHead 
                      key={columnId}
                      draggable={true}
                      onDragStart={() => handleDragStart(columnId)}
                      onDragOver={(e) => handleDragOver(e, columnId)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, columnId)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        // Don't trigger sort when clicking the filter icon
                        if (!(e.target as HTMLElement).closest('[data-filter-trigger]')) {
                          handleColumnSort(columnId);
                        }
                      }}
                      className={`
                        select-none
                        ${draggedColumn !== null ? 'cursor-move' : ''}
                        ${draggedColumn === columnId ? 'opacity-40' : ''}
                        ${dragOverColumn === columnId && draggedColumn !== columnId ? 'bg-muted' : ''}
                        ${!draggedColumn ? 'hover:bg-muted/50' : ''}
                        transition-colors
                      `}
                      title='Drag to reorder • Click to sort'
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-move" />
                        <span className="flex-1">{getColumnDisplayName(columnId)}</span>
                        {isProductColumn && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                data-filter-trigger
                                className={`flex-shrink-0 p-1 rounded transition-colors ${
                                  selectedVariantIds.length > 0
                                    ? "bg-foreground text-background hover:bg-foreground/90"
                                    : "hover:bg-muted"
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Filter className="h-3.5 w-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="w-96" 
                              align="start"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="space-y-3">
                                <h4 className="font-semibold">Filter Products</h4>
                                <ProductVariantFilter
                                  products={products}
                                  selectedVariantIds={selectedVariantIds}
                                  onVariantToggle={handleVariantToggle}
                                  onProductToggle={handleProductToggle}
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                        {isStatusColumn && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                data-filter-trigger
                                className={`flex-shrink-0 p-1 rounded transition-colors ${
                                  selectedStatuses.length > 0
                                    ? "bg-foreground text-background hover:bg-foreground/90"
                                    : "hover:bg-muted"
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Filter className="h-3.5 w-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="w-80" 
                              align="start"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="space-y-3">
                                <h4 className="font-semibold">Filter by Status</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {ORDER_STATUSES.map((status) => (
                                    <label
                                      key={status}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedStatuses.includes(status)}
                                        onChange={() => handleStatusToggle(status)}
                                        className="rounded"
                                      />
                                      <span className="text-sm capitalize">{status}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                        {isSorted && (
                          <span className="flex-shrink-0">
                            {isAscending ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
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
