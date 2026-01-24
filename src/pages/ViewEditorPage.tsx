import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams, useNavigate } from "react-router-dom";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";

// Available columns
const AVAILABLE_COLUMNS = [
  { id: "orderId", label: "Order ID" },
  { id: "orderCreationTime", label: "Order Date" },
  { id: "email", label: "Email" },
  { id: "name", label: "Name" },
  { id: "orderStatus", label: "Order Status" },
  { id: "productName", label: "Product Name" },
  { id: "variantName", label: "Variant Name" },
  { id: "quantity", label: "Quantity" },
  { id: "price", label: "Price" },
  { id: "itemTotal", label: "Item Total" },
];

const ORDER_STATUSES = ["completed", "pending", "paid", "cancelled", "expired", "failed"];

export function ViewEditorPage() {
  const { viewId } = useParams<{ viewId: string }>();
  const navigate = useNavigate();
  const isEditing = viewId && viewId !== "new";
  
  const existingView = useQuery(
    api.views.get,
    isEditing ? { viewId: viewId as Id<"views"> } : "skip"
  );
  
  const products = useQuery(api.products.listAll);
  const createView = useMutation(api.views.create);
  const updateView = useMutation(api.views.update);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "orderId",
    "email",
    "productName",
    "variantName",
    "quantity",
  ]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<Id<"variants">[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedProducts, setExpandedProducts] = useState<Set<Id<"products">>>(new Set());

  // Load existing view data
  useEffect(() => {
    if (existingView && existingView !== null) {
      setName(existingView.name);
      setDescription(existingView.description || "");
      setSelectedColumns(existingView.columns);
      // Variant IDs are stored as composite keys (productId-variantId)
      setSelectedVariantIds(existingView.filters?.variantIds || []);
      setSelectedStatuses(existingView.filters?.statuses || []);
      setSortBy(existingView.sortBy || "");
      setSortOrder(existingView.sortOrder || "desc");
    }
  }, [existingView]);

  const handleColumnToggle = (columnId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const moveColumnUp = (columnId: string) => {
    setSelectedColumns((prev) => {
      const index = prev.indexOf(columnId);
      if (index <= 0) return prev;
      const newColumns = [...prev];
      [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
      return newColumns;
    });
  };

  const moveColumnDown = (columnId: string) => {
    setSelectedColumns((prev) => {
      const index = prev.indexOf(columnId);
      if (index === -1 || index >= prev.length - 1) return prev;
      const newColumns = [...prev];
      [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
      return newColumns;
    });
  };

  const toggleProductExpansion = (productId: Id<"products">) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleProductToggle = (productId: Id<"products">) => {
    const product = products?.find((p) => p._id === productId);
    if (!product) return;

    // Get all variant database IDs for this product
    const allVariantDbIds = product.variants.map((v) => v._id);
    const allSelected = allVariantDbIds.every((id) => selectedVariantIds.includes(id));

    if (allSelected) {
      // Deselect all variants of this product
      setSelectedVariantIds((prev) => prev.filter((id) => !allVariantDbIds.includes(id)));
    } else {
      // Select all variants of this product
      setSelectedVariantIds((prev) => {
        const newSet = new Set(prev);
        allVariantDbIds.forEach((id) => newSet.add(id));
        return Array.from(newSet);
      });
    }
  };

  const handleVariantToggle = (variantDbId: Id<"variants">) => {
    setSelectedVariantIds((prev) =>
      prev.includes(variantDbId)
        ? prev.filter((id) => id !== variantDbId)
        : [...prev, variantDbId]
    );
  };

  const isProductSelected = (productId: Id<"products">) => {
    const product = products?.find((p) => p._id === productId);
    if (!product) return false;
    const allVariantDbIds = product.variants.map((v) => v._id);
    return allVariantDbIds.every((id) => selectedVariantIds.includes(id));
  };

  const isProductPartiallySelected = (productId: Id<"products">) => {
    const product = products?.find((p) => p._id === productId);
    if (!product) return false;
    const allVariantDbIds = product.variants.map((v) => v._id);
    const someSelected = allVariantDbIds.some((id) => selectedVariantIds.includes(id));
    const allSelected = allVariantDbIds.every((id) => selectedVariantIds.includes(id));
    return someSelected && !allSelected;
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const handleSave = async () => {
    setError("");
    
    if (!name.trim()) {
      setError("Please enter a view name");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (selectedColumns.length === 0) {
      setError("Please select at least one column");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);
    try {
      const viewData = {
        name: name.trim(),
        description: description.trim() || undefined,
        columns: selectedColumns,
        filters: {
          variantIds: selectedVariantIds.length > 0 ? selectedVariantIds : undefined,
          statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        },
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
      };

      if (isEditing) {
        await updateView({
          viewId: viewId as Id<"views">,
          ...viewData,
        });
      } else {
        const newViewId = await createView(viewData);
        navigate(`/views/${newViewId}`);
        return;
      }

      navigate(`/views/${viewId}`);
    } catch (error) {
      console.error("Error saving view:", error);
      setError("Failed to save view. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && existingView === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">Loading view...</div>
      </div>
    );
  }

  if (isEditing && existingView === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-destructive">View not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/views")}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Views
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {isEditing ? "Edit View" : "Create New View"}
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure which columns to display and how to filter the data
        </p>
      </div>

      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md border border-destructive/30">
            {error}
          </div>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">View Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Gala Ticket Orders"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of this view"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Columns */}
        <Card>
          <CardHeader>
            <CardTitle>Columns to Display</CardTitle>
            <CardDescription>
              Select which columns to show in the table and reorder them
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Available Columns */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Available Columns</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_COLUMNS.map((column) => (
                  <label
                    key={column.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(column.id)}
                      onChange={() => handleColumnToggle(column.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{column.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Column Order */}
            {selectedColumns.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Column Order</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Use the arrows to reorder columns. This is the order they will appear in the table.
                </p>
                <div className="space-y-2">
                  {selectedColumns.map((columnId, index) => {
                    const column = AVAILABLE_COLUMNS.find((c) => c.id === columnId);
                    if (!column) return null;
                    return (
                      <div
                        key={columnId}
                        className="flex items-center gap-2 p-2 bg-muted/30 rounded border"
                      >
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          {index + 1}.
                        </span>
                        <span className="text-sm flex-1">{column.label}</span>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveColumnUp(columnId)}
                            disabled={index === 0}
                            className="h-7 w-7 p-0"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveColumnDown(columnId)}
                            disabled={index === selectedColumns.length - 1}
                            className="h-7 w-7 p-0"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Filter which orders to include (leave empty to show all)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Product and Variant Filter */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Filter by Products and Variants
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select products to filter by. Click on a product to expand and select specific variants.
              </p>
              {products === undefined ? (
                <div className="text-sm text-muted-foreground">Loading products...</div>
              ) : products.length === 0 ? (
                <div className="text-sm text-muted-foreground">No products available</div>
              ) : (
                <div className="space-y-1 p-2 border rounded">
                  {products.map((product) => {
                    const isExpanded = expandedProducts.has(product._id);
                    const isChecked = isProductSelected(product._id);
                    const isIndeterminate = isProductPartiallySelected(product._id);

                    return (
                      <div key={product._id} className="space-y-1">
                        {/* Product row */}
                        <div className="flex items-center gap-2 hover:bg-muted/50 p-2 rounded">
                          <button
                            type="button"
                            onClick={() => toggleProductExpansion(product._id)}
                            className="p-0.5 hover:bg-muted rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              ref={(el) => {
                                if (el) {
                                  el.indeterminate = isIndeterminate;
                                }
                              }}
                              onChange={() => handleProductToggle(product._id)}
                              className="rounded"
                            />
                            <span className="text-sm font-medium">{product.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({product.variants.length} variant{product.variants.length !== 1 ? 's' : ''})
                            </span>
                          </label>
                        </div>

                        {/* Variants (shown when expanded) */}
                        {isExpanded && (
                          <div className="ml-8 space-y-1 pl-2 border-l-2 border-muted">
                            {product.variants.map((variant) => (
                              <label
                                key={variant._id}
                                className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-muted/30 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedVariantIds.includes(variant._id)}
                                  onChange={() => handleVariantToggle(variant._id)}
                                  className="rounded"
                                />
                                <span className="text-sm">{variant.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  €{variant.price.toFixed(2)}
                                </span>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  ({product.productId}-{variant.variantId})
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Filter by Order Status
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
          </CardContent>
        </Card>

        {/* Sorting */}
        <Card>
          <CardHeader>
            <CardTitle>Sorting</CardTitle>
            <CardDescription>
              Choose how to sort the results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="sortBy">Sort By</Label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">No sorting</option>
                {AVAILABLE_COLUMNS.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.label}
                  </option>
                ))}
              </select>
            </div>
            {sortBy && (
              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <select
                  id="sortOrder"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="min-w-32">
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? "Update View" : "Create View"}
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => navigate("/views")}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
