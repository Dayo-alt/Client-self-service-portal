import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Settings, BarChart3, Moon, Sun, Bell, Menu, LogOut } from "lucide-react";
import { signOutAdmin, getCurrentUser } from "@/lib/firebase";
import { useLocation } from "wouter";
import StatsCards from "@/components/StatsCards";
import UserTable from "@/components/UserTable";
import EditUserModal from "@/components/EditUserModal";
import DeleteUserModal from "@/components/DeleteUserModal";
import type { FirebaseUser, UserStats } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<FirebaseUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<FirebaseUser | null>(null);
  const { toast } = useToast();

  // Load theme preference
  useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark" || 
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newDarkMode);
  };

  const handleLogout = async () => {
    try {
      await signOutAdmin();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      setLocation("/login");
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to log out.",
        variant: "destructive",
      });
    }
  };

  // Fetch users data
  const { data: users = [], isLoading: usersLoading } = useQuery<FirebaseUser[]>({
    queryKey: ["/api/users"],
  });

  // Fetch user statistics
  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/users/stats"],
  });

  const currentUser = getCurrentUser();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center px-4 border-b border-border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="ml-3 text-xl font-semibold text-foreground">Admin Panel</h1>
            </div>
          </div>
          
          <nav className="flex-1 px-2 py-4 space-y-1">
            <a href="#" className="bg-accent text-accent-foreground group flex items-center px-2 py-2 text-sm font-medium rounded-md" data-testid="nav-dashboard">
              <BarChart3 className="mr-3 w-4 h-4" />
              Dashboard
            </a>
            <a href="#" className="text-muted-foreground hover:bg-accent hover:text-accent-foreground group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors" data-testid="nav-users">
              <Shield className="mr-3 w-4 h-4" />
              User Management
            </a>
            <a href="#" className="text-muted-foreground hover:bg-accent hover:text-accent-foreground group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors" data-testid="nav-settings">
              <Settings className="mr-3 w-4 h-4" />
              Settings
            </a>
            <a href="#" className="text-muted-foreground hover:bg-accent hover:text-accent-foreground group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors" data-testid="nav-analytics">
              <BarChart3 className="mr-3 w-4 h-4" />
              Analytics
            </a>
          </nav>
          
          <div className="border-t border-border p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-muted-foreground">
                  {currentUser?.displayName?.[0] || currentUser?.email?.[0] || "A"}
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-foreground" data-testid="text-admin-name">
                  {currentUser?.displayName || "Admin User"}
                </p>
                <button 
                  onClick={handleLogout}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-sign-out"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex h-16 items-center justify-between bg-card border-b border-border px-4 shadow-sm">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden mr-2"
              data-testid="button-menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-semibold text-foreground">User Management Dashboard</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-notifications">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Stats Cards */}
            {stats && <StatsCards stats={stats} />}
            
            {/* User Table */}
            <UserTable
              users={users}
              onEditUser={setEditingUser}
              onDeleteUser={setDeletingUser}
              loading={usersLoading}
            />
          </div>
        </main>
      </div>

      {/* Modals */}
      <EditUserModal
        user={editingUser}
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
      />
      
      <DeleteUserModal
        user={deletingUser}
        open={!!deletingUser}
        onClose={() => setDeletingUser(null)}
      />
    </div>
  );
}
