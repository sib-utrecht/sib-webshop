import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams, useNavigate } from "react-router-dom";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";

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
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [saving, setSaving] = useState(false);

  // Load existing view data
  useEffect(() => {
    if (existingView && existingView !== null) {
      setName(existingView.name);
      setDescription(existingView.description || "");
      setSelectedColumns(existingView.columns);
      setSelectedProductIds(existingView.filters?.productIds?.map(id => id) || []);
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

  const handleProductToggle = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleVariantToggle = (variantId: string) => {
    setSelectedVariantIds((prev) =>
      prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId]
    );
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Please enter a view name");
      return;
    }

    if (selectedColumns.length === 0) {
      alert("Please select at least one column");
      return;
    }

    setSaving(true);
    try {
      const viewData = {
        name: name.trim(),
        description: description.trim() || undefined,
        columns: selectedColumns,
        filters: {
          productIds: selectedProductIds.length > 0 
            ? selectedProductIds.map(id => id as Id<"products">) 
            : undefined,
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
      alert("Failed to save view. Please try again.");
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

  // Get all unique variants from all products
  const allVariants =
    products?.flatMap((product) =>
      product.variants.map((variant) => ({
        variantId: variant.variantId,
        name: `${product.name} - ${variant.name}`,
        productId: product._id,
      }))
    ) || [];

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
              Select which columns to show in the table
            </CardDescription>
          </CardHeader>
          <CardContent>
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
            {/* Product Filter */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Filter by Products
              </Label>
              {products === undefined ? (
                <div className="text-sm text-muted-foreground">Loading products...</div>
              ) : products.length === 0 ? (
                <div className="text-sm text-muted-foreground">No products available</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded">
                  {products.map((product) => (
                    <label
                      key={product._id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(product._id)}
                        onChange={() => handleProductToggle(product._id)}
                        className="rounded"
                      />
                      <span className="text-sm">{product.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Variant Filter */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Filter by Variants
              </Label>
              {allVariants.length === 0 ? (
                <div className="text-sm text-muted-foreground">No variants available</div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 border rounded">
                  {allVariants.map((variant) => (
                    <label
                      key={variant.variantId}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedVariantIds.includes(variant.variantId)}
                        onChange={() => handleVariantToggle(variant.variantId)}
                        className="rounded"
                      />
                      <span className="text-sm">{variant.name}</span>
                    </label>
                  ))}
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
