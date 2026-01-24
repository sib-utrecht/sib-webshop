import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Plus, Trash2, Table as TableIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Id } from "../../convex/_generated/dataModel";

export function ViewsListPage() {
  const views = useQuery(api.views.list);
  const removeView = useMutation(api.views.remove);
  const createView = useMutation(api.views.create);
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewToDelete, setViewToDelete] = useState<Id<"views"> | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewDescription, setNewViewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleDeleteClick = (viewId: Id<"views">) => {
    setViewToDelete(viewId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (viewToDelete) {
      await removeView({ viewId: viewToDelete });
      setDeleteDialogOpen(false);
      setViewToDelete(null);
    }
  };

  const handleCreateClick = () => {
    setNewViewName("");
    setNewViewDescription("");
    setCreateDialogOpen(true);
  };

  const handleCreateConfirm = async () => {
    if (!newViewName.trim()) return;
    
    setCreating(true);
    try {
      const viewId = await createView({
        name: newViewName.trim(),
        description: newViewDescription.trim() || undefined,
        columns: ["orderId", "email", "productName", "variantName", "quantity"],
        filters: {},
        sortBy: undefined,
        sortOrder: undefined,
      });
      setCreateDialogOpen(false);
      navigate(`/views/${viewId}`);
    } finally {
      setCreating(false);
    }
  };

  if (views === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">Loading views...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Order Views</h1>
          <p className="text-muted-foreground mt-2">
            Create custom views to filter and display order data
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          New View
        </Button>
      </div>

      {views.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TableIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Views Yet</h2>
            <p className="text-muted-foreground text-center max-w-sm mb-6">
              Create your first view to organize and filter order data in a table format.
            </p>
            <Button onClick={handleCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Create First View
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {views.map((view) => (
            <Card 
              key={view._id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/views/${view._id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate mb-1">{view.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        <span className="font-medium">{view.columns.length}</span> columns
                      </span>
                      {view.filters?.variantIds && view.filters.variantIds.length > 0 && (
                        <span>
                          <span className="font-medium">{view.filters.variantIds.length}</span> variants filtered
                        </span>
                      )}
                      {view.sortBy && (
                        <span>
                          Sorted by <span className="font-medium">{view.sortBy}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(view._id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create View Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New View</DialogTitle>
            <DialogDescription>
              Give your view a name and description. You'll be able to configure columns and filters after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="viewName">View Name *</Label>
              <Input
                id="viewName"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="e.g., Gala Ticket Orders"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newViewName.trim()) {
                    handleCreateConfirm();
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="viewDescription">Description</Label>
              <Textarea
                id="viewDescription"
                value={newViewDescription}
                onChange={(e) => setNewViewDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateConfirm}
              disabled={!newViewName.trim() || creating}
            >
              {creating ? "Creating..." : "Create View"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete View</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this view? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
