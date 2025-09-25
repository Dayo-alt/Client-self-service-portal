import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { FirebaseUser } from "@shared/schema";

interface DeleteUserModalProps {
  user: FirebaseUser | null;
  open: boolean;
  onClose: () => void;
}

export default function DeleteUserModal({ user, open, onClose }: DeleteUserModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteUserMutation = useMutation({
    mutationFn: async (uid: string) => {
      const response = await apiRequest("DELETE", `/api/users/${uid}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "User has been permanently removed from the system.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (user) {
      deleteUserMutation.mutate(user.uid);
    }
  };

  const handleClose = () => {
    if (!deleteUserMutation.isPending) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg" data-testid="modal-delete-user">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span>Delete User</span>
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone and will permanently remove this user from your Firebase database.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong className="text-foreground" data-testid="text-user-name">
              {user?.displayName || user?.email || "this user"}
            </strong>
            ? This action cannot be undone and will permanently remove the user from your Firebase database.
          </p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={deleteUserMutation.isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteUserMutation.isPending}
            data-testid="button-confirm-delete"
          >
            {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
