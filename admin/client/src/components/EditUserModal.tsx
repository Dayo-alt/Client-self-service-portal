import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { FirebaseUser, UpdateUserData } from "@shared/schema";

interface EditUserModalProps {
  user: FirebaseUser | null;
  open: boolean;
  onClose: () => void;
}

export default function EditUserModal({ user, open, onClose }: EditUserModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [role, setRole] = useState("user");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
      setDisabled(user.disabled);
      
      // Determine role from custom claims
      if (user.customClaims?.admin) {
        setRole("admin");
      } else if (user.customClaims?.moderator) {
        setRole("moderator");
      } else {
        setRole("user");
      }
    }
  }, [user]);

  const updateUserMutation = useMutation({
    mutationFn: async (updateData: UpdateUserData & { uid: string }) => {
      const response = await apiRequest("PATCH", `/api/users/${updateData.uid}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "User information has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user information.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const customClaims: Record<string, any> = {};
    if (role === "admin") {
      customClaims.admin = true;
    } else if (role === "moderator") {
      customClaims.moderator = true;
    }

    updateUserMutation.mutate({
      uid: user.uid,
      displayName: displayName || undefined,
      email: email || undefined,
      disabled,
      customClaims,
    });
  };

  const handleClose = () => {
    if (!updateUserMutation.isPending) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg" data-testid="modal-edit-user">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="editDisplayName">Display Name</Label>
              <Input
                id="editDisplayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name"
                data-testid="input-display-name"
              />
            </div>
            
            <div>
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                data-testid="input-email"
              />
            </div>
            
            <div>
              <Label htmlFor="editRole">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="editDisabled"
                checked={!disabled}
                onCheckedChange={(checked) => setDisabled(!checked)}
                data-testid="switch-active"
              />
              <Label htmlFor="editDisabled">Account Active</Label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateUserMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateUserMutation.isPending}
              data-testid="button-save"
            >
              {updateUserMutation.isPending ? "Updating..." : "Update User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
