import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewToDelete, setViewToDelete] = useState<Id<"views"> | null>(null);

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
        <Button onClick={() => navigate("/views/new")}>
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
            <Button onClick={() => navigate("/views/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Create First View
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {views.map((view) => (
            <Card key={view._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{view.name}</CardTitle>
                    {view.description && (
                      <CardDescription className="mt-2">
                        {view.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div>
                    <span className="font-medium">Columns:</span> {view.columns.length}
                  </div>
                  {view.filters?.variantIds && view.filters.variantIds.length > 0 && (
                    <div>
                      <span className="font-medium">Variants filtered:</span>{" "}
                      {view.filters.variantIds.length}
                    </div>
                  )}
                  {view.sortBy && (
                    <div>
                      <span className="font-medium">Sorted by:</span> {view.sortBy}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/views/${view._id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/views/${view._id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(view._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
