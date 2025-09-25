import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Settings, BarChart3, Moon, Sun, Bell, Menu } from "lucide-react";
import { signOutAdmin, getCurrentUser, getIdToken } from "@/lib/firebase";
import { useLocation } from "wouter";
import StatsCards from "@/components/StatsCards";
import UserTable from "@/components/UserTable";
import EditUserModal from "@/components/EditUserModal";
import DeleteUserModal from "@/components/DeleteUserModal";
import type { FirebaseUser, UserStats } from "@shared/schema";
import { useTranslation } from "react-i18next";

// Backend API base URL (can include a path base like /admin)
const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || "http://localhost:5000";

function joinApiUrl(path: string) {
  const base = API_BASE.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

// Fetch helper with Authorization header
const fetchWithAuth = async (url: string) => {
  const token = await getIdToken();
  const res = await fetch(joinApiUrl(url), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<FirebaseUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<FirebaseUser | null>(null);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  // Load theme preference
  useEffect(() => {
    const isDark =
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  // Set page title
  useEffect(() => {
    document.title = `Admin - ${t("dashboard.title")}`;
  }, [t]);

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
        title: t("login.successTitle"),
        description: t("login.successDesc"),
      });
      setLocation("/login");
    } catch (error: any) {
      toast({
        title: t("login.failedTitle"),
        description: error.message || t("login.failedDesc"),
        variant: "destructive",
      });
    }
  };

  const onLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lng = e.target.value;
    i18n.changeLanguage(lng);
    try {
      localStorage.setItem("lang", lng);
    } catch {}
  };

  // Fetch users data with auth
  const { data: users = [], isLoading: usersLoading } = useQuery<FirebaseUser[]>({
    queryKey: ["/api/users"],
    queryFn: () => fetchWithAuth("/api/users"),
  });

  // Fetch user statistics with auth
  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/users/stats"],
    queryFn: () => fetchWithAuth("/api/users/stats"),
  });

  const currentUser = getCurrentUser();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center px-4 border-b border-border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="ml-3 text-xl font-semibold text-foreground">
                {t("common.admin")}
              </h1>
            </div>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1">
            <a
              href="#"
              onClick={() => setLocation("/dashboard")}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors"
              data-testid="nav-dashboard"
            >
              <BarChart3 className="mr-3 w-4 h-4" />
              {t("common.dashboard")}
            </a>
            <a
              href="#"
              onClick={() => setLocation("/tracking")}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors"
              data-testid="nav-tracking"
            >
              <Shield className="mr-3 w-4 h-4" />
              {t("common.tracking")}
            </a>
            <a
              href="#"
              onClick={() => setLocation("/settings")}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors"
              data-testid="nav-settings"
            >
              <Settings className="mr-3 w-4 h-4" />
              {t("common.settings")}
            </a>
          </nav>

          <div className="border-t border-border p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-muted-foreground">
                  {currentUser?.displayName?.[0] ||
                    currentUser?.email?.[0] ||
                    "A"}
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p
                  className="text-sm font-medium text-foreground"
                  data-testid="text-admin-name"
                >
                  {currentUser?.displayName || t("common.adminUser")}
                </p>
                <button
                  onClick={handleLogout}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-sign-out"
                >
                  {t("common.signOut")}
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
            <h2 className="text-2xl font-semibold text-foreground">
              {t("dashboard.title")}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            <select
              aria-label="Language"
              onChange={onLangChange}
              value={i18n.language}
              className="border border-border rounded-md bg-background text-foreground text-sm px-2 py-1"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="ar">العربية</option>
              <option value="ja">日本語</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              data-testid="button-notifications"
            >
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