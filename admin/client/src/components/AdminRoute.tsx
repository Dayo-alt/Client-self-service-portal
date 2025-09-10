import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { onAuthStateChange, getCurrentUser, signOutAdmin } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Shield, AlertCircle } from "lucide-react";
import type { User } from "firebase/auth";

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNotAdminError, setShowNotAdminError] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (authUser) => {
      if (authUser) {
        try {
          // Check for admin custom claim
          const idTokenResult = await authUser.getIdTokenResult();
          if (idTokenResult.claims.admin) {
            setUser(authUser);
            setIsAdmin(true);
            setShowNotAdminError(false);
          } else {
            console.log("User does not have admin privileges");
            setUser(authUser);
            setIsAdmin(false);
            setShowNotAdminError(true);
          }
        } catch (error) {
          console.error("Error checking admin claims:", error);
          setLocation("/login");
        }
      } else {
        setLocation("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setLocation]);

  const handleLogout = async () => {
    try {
      await signOutAdmin();
      setLocation("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      setLocation("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-3">
          <div className="loading-spinner"></div>
          <span className="text-foreground font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (showNotAdminError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground">
              You are not an admin. Only users with admin privileges can access this dashboard.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact your administrator if you believe this is an error.
            </p>
          </div>

          <div className="space-y-3">
            <Button onClick={handleLogout} className="w-full" data-testid="button-logout">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
