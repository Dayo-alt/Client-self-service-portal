import { Switch, Route, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminRoute from "@/components/AdminRoute";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import Tracking from "@/pages/Tracking";
import Settings from "@/pages/Settings";

function Routes() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/dashboard">
        <AdminRoute>
          <Dashboard />
        </AdminRoute>
      </Route>
      <Route path="/tracking">
        <AdminRoute>
          <Tracking />
        </AdminRoute>
      </Route>
      <Route path="/">
        <AdminRoute>
          <Dashboard />
        </AdminRoute>
      </Route>
      {/* In development, render Settings without AdminRoute so the page is visible at http://localhost:3001/admin/settings */}
      {import.meta.env.DEV ? (
        <Route path="/settings" component={Settings} />
      ) : (
        <Route path="/settings">
          <AdminRoute>
            <Settings />
          </AdminRoute>
        </Route>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router base="/admin">
          <Routes />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;