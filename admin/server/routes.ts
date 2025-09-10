import type { Express } from "express";
import { createServer, type Server } from "http";
import { getAllUsers, getUserStats, updateUser, deleteUser, verifyIdToken, setUserAsAdmin, removeUserAdmin } from "./services/firebase-admin";
import { updateUserSchema } from "@shared/schema";
import { z } from "zod";

// Admin middleware to verify Firebase ID token and admin privileges
async function verifyAdmin(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "No authorization token provided" });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyIdToken(idToken);
    
    // Check if user has admin custom claim
    if (!decodedToken.admin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Admin verification failed:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to add auth header from Firebase SDK
  app.use((req, res, next) => {
    // Add CORS headers for Firebase requests
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    
    next();
  });

  // Get all users
  app.get("/api/users", verifyAdmin, async (req, res) => {
    try {
      const users = await getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: error.message || "Failed to fetch users" });
    }
  });

  // Get user statistics
  app.get("/api/users/stats", verifyAdmin, async (req, res) => {
    try {
      const stats = await getUserStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: error.message || "Failed to fetch user statistics" });
    }
  });

  // Update user
  app.patch("/api/users/:uid", verifyAdmin, async (req, res) => {
    try {
      const { uid } = req.params;
      const updateData = updateUserSchema.parse(req.body);
      
      const updatedUser = await updateUser(uid, updateData);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to update user" });
    }
  });

  // Delete user
  app.delete("/api/users/:uid", verifyAdmin, async (req, res) => {
    try {
      const { uid } = req.params;
      await deleteUser(uid);
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: error.message || "Failed to delete user" });
    }
  });

  // Set user as admin
  app.post("/api/users/:uid/admin", verifyAdmin, async (req, res) => {
    try {
      const { uid } = req.params;
      const updatedUser = await setUserAsAdmin(uid);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error setting user as admin:", error);
      res.status(500).json({ message: error.message || "Failed to set user as admin" });
    }
  });

  // Remove admin privileges
  app.delete("/api/users/:uid/admin", verifyAdmin, async (req, res) => {
    try {
      const { uid } = req.params;
      const updatedUser = await removeUserAdmin(uid);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error removing admin privileges:", error);
      res.status(500).json({ message: error.message || "Failed to remove admin privileges" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
