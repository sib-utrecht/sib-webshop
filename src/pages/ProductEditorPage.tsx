import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Package, Edit, Trash2, Plus, X, AlertCircle, Eye, EyeOff } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

type Variant = {
  variantId: string;
  name: string;
  price: number;
  maxQuantity?: number;
  requiredAgreements?: string[];
  stock?: number;
};

type ProductForm = {
  _id?: Id<"products">;
  productId: string;
  name: string;
  description: string | null;
  shortDescription?: string;
  imageUrl: string;
  gallery: string[];
  isVirtual: boolean;
  variants: Variant[];
};

const emptyProduct: ProductForm = {
  productId: "",
  name: "",
  description: "",
  shortDescription: "",
  imageUrl: "",
  gallery: [],
  isVirtual: false,
  variants: [{ variantId: "default", name: "Default", price: 0 }],
};

export function ProductEditorPage() {
  const products = useQuery(api.products.listAll);
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const deleteProduct = useMutation(api.products.remove);
  const toggleVisibility = useMutation(api.products.toggleVisibility);
  const updateStock = useMutation(api.stock.updateStock);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductForm>(emptyProduct);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"products"> | null>(null);

  if (products === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">Loading products...</div>
      </div>
    );
  }

  const handleCreate = () => {
    setEditingProduct(emptyProduct);
    setError("");
    setIsDialogOpen(true);
  };

  const handleEdit = (product: typeof products[0]) => {
    // Map stock data to variants
    const stockMap = new Map(
      product.stock?.map((s) => [s.variantId, s.quantity]) || []
    );
    
    setEditingProduct({
      _id: product._id,
      productId: product.productId,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      imageUrl: product.imageUrl,
      gallery: product.gallery,
      isVirtual: product.isVirtual,
      variants: product.variants.map((v) => ({
        ...v,
        stock: stockMap.get(v.variantId) ?? 0,
      })),
    });
    setError("");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setError("");

    // Validation
    if (!editingProduct.productId.trim()) {
      setError("Product ID is required");
      return;
    }
    if (!editingProduct.name.trim()) {
      setError("Product name is required");
      return;
    }
    if (!editingProduct.imageUrl.trim()) {
      setError("Image URL is required");
      return;
    }
    if (editingProduct.variants.length === 0) {
      setError("At least one variant is required");
      return;
    }
    for (const variant of editingProduct.variants) {
      if (!variant.variantId.trim()) {
        setError("All variants must have an ID");
        return;
      }
      if (!variant.name.trim()) {
        setError("All variants must have a name");
        return;
      }
      if (variant.price < 0) {
        setError("Variant prices must be non-negative");
        return;
      }
    }

    setIsSaving(true);
    try {
      let productId: Id<"products">;
      
      // Remove stock from variants before sending to backend
      const variantsWithoutStock = editingProduct.variants.map(({ stock, ...variant }) => variant);
      
      if (editingProduct._id) {
        await updateProduct({
          id: editingProduct._id,
          productId: editingProduct.productId,
          name: editingProduct.name,
          description: editingProduct.description,
          shortDescription: editingProduct.shortDescription,
          imageUrl: editingProduct.imageUrl,
          gallery: editingProduct.gallery,
          isVirtual: editingProduct.isVirtual,
          variants: variantsWithoutStock,
        });
        productId = editingProduct._id;
      } else {
        productId = await createProduct({
          productId: editingProduct.productId,
          name: editingProduct.name,
          description: editingProduct.description,
          shortDescription: editingProduct.shortDescription,
          imageUrl: editingProduct.imageUrl,
          gallery: editingProduct.gallery,
          isVirtual: editingProduct.isVirtual,
          variants: variantsWithoutStock,
        });
      }
      
      // Update stock for each variant
      for (const variant of editingProduct.variants) {
        if (variant.stock !== undefined) {
          await updateStock({
            productId,
            variantId: variant.variantId,
            quantity: variant.stock,
          });
        }
      }
      
      setIsDialogOpen(false);
      setEditingProduct(emptyProduct);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: Id<"products">) => {
    try {
      await deleteProduct({ id });
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  const addVariant = () => {
    setEditingProduct({
      ...editingProduct,
      variants: [
        ...editingProduct.variants,
        { variantId: "", name: "", price: 0 },
      ],
    });
  };

  const removeVariant = (index: number) => {
    setEditingProduct({
      ...editingProduct,
      variants: editingProduct.variants.filter((_, i) => i !== index),
    });
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...editingProduct.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setEditingProduct({ ...editingProduct, variants: newVariants });
  };

  const addGalleryImage = () => {
    setEditingProduct({
      ...editingProduct,
      gallery: [...editingProduct.gallery, ""],
    });
  };

  const removeGalleryImage = (index: number) => {
    setEditingProduct({
      ...editingProduct,
      gallery: editingProduct.gallery.filter((_, i) => i !== index),
    });
  };

  const updateGalleryImage = (index: number, value: string) => {
    const newGallery = [...editingProduct.gallery];
    newGallery[index] = value;
    setEditingProduct({ ...editingProduct, gallery: newGallery });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Product Editor</h1>
          <p className="text-muted-foreground">
            Create, edit, and manage products
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Product
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-16">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Products</h2>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first product.
          </p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Product
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product._id}>
              <CardHeader>
                <div className="h-48 w-full overflow-hidden rounded-md bg-muted mb-4">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <CardTitle className="flex items-start justify-between">
                  <span>{product.name}</span>
                  <div className="flex gap-2">
                    {product.isVirtual && (
                      <Badge variant="secondary" className="ml-2">
                        Virtual
                      </Badge>
                    )}
                    {product.isVisible === false && (
                      <Badge variant="outline" className="ml-2">
                        Hidden
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {product.shortDescription || product.description}
                </p>
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {product.variants.length} variant
                    {product.variants.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {product.variants.slice(0, 3).map((variant) => (
                      <Badge key={variant.variantId} variant="outline">
                        €{variant.price.toFixed(2)}
                      </Badge>
                    ))}
                    {product.variants.length > 3 && (
                      <Badge variant="outline">
                        +{product.variants.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => toggleVisibility({ id: product._id })}
                    variant="outline"
                    size="icon"
                    title={product.isVisible === false ? "Show product" : "Hide product"}
                  >
                    {product.isVisible === false ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    onClick={() => handleEdit(product)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => setDeleteConfirm(product._id)}
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct._id ? "Edit Product" : "Create Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct._id
                ? "Update the product details below."
                : "Fill in the details to create a new product."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="productId">Product ID *</Label>
                <Input
                  id="productId"
                  value={editingProduct.productId}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      productId: e.target.value,
                    })
                  }
                  placeholder="e.g., gala2026"
                />
              </div>
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  placeholder="e.g., Gala 2026"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="shortDescription">Short Description</Label>
              <Input
                id="shortDescription"
                value={editingProduct.shortDescription || ""}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    shortDescription: e.target.value,
                  })
                }
                placeholder="Brief one-line description"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingProduct.description || ""}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    description: e.target.value,
                  })
                }
                placeholder="Full product description (supports Markdown)"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="imageUrl">Image URL *</Label>
              <Input
                id="imageUrl"
                value={editingProduct.imageUrl}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    imageUrl: e.target.value,
                  })
                }
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Gallery Images</Label>
                <Button
                  type="button"
                  onClick={addGalleryImage}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Image
                </Button>
              </div>
              {editingProduct.gallery.map((url, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={url}
                    onChange={(e) => updateGalleryImage(index, e.target.value)}
                    placeholder="https://example.com/gallery-image.jpg"
                  />
                  <Button
                    type="button"
                    onClick={() => removeGalleryImage(index)}
                    size="icon"
                    variant="destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isVirtual"
                checked={editingProduct.isVirtual}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    isVirtual: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="isVirtual">Virtual Product (no shipping)</Label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Variants *</Label>
                <Button
                  type="button"
                  onClick={addVariant}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Variant
                </Button>
              </div>
              {editingProduct.variants.map((variant, index) => (
                <Card key={index} className="mb-3 p-4">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`variantId-${index}`}>Variant ID</Label>
                        <Input
                          id={`variantId-${index}`}
                          value={variant.variantId}
                          onChange={(e) =>
                            updateVariant(index, "variantId", e.target.value)
                          }
                          placeholder="e.g., member"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`variantName-${index}`}>Name</Label>
                        <Input
                          id={`variantName-${index}`}
                          value={variant.name}
                          onChange={(e) =>
                            updateVariant(index, "name", e.target.value)
                          }
                          placeholder="e.g., Member Ticket"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor={`variantPrice-${index}`}>
                          Price (€)
                        </Label>
                        <Input
                          id={`variantPrice-${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={variant.price}
                          onChange={(e) =>
                            updateVariant(
                              index,
                              "price",
                              parseFloat(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`variantStock-${index}`}>
                          Stock
                        </Label>
                        <Input
                          id={`variantStock-${index}`}
                          type="number"
                          min="0"
                          value={variant.stock ?? 0}
                          onChange={(e) =>
                            updateVariant(
                              index,
                              "stock",
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`variantMaxQty-${index}`}>
                          Max Quantity (optional)
                        </Label>
                        <Input
                          id={`variantMaxQty-${index}`}
                          type="number"
                          min="1"
                          value={variant.maxQuantity || ""}
                          onChange={(e) =>
                            updateVariant(
                              index,
                              "maxQuantity",
                              e.target.value ? parseInt(e.target.value) : undefined
                            )
                          }
                          placeholder="No limit"
                        />
                      </div>
                    </div>
                    {editingProduct.variants.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeVariant(index)}
                        size="sm"
                        variant="destructive"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove Variant
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be
              undone and will also delete all associated stock entries.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
