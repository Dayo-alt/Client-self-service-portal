// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();
const auth = admin.auth();
const db = admin.firestore();
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Middleware: verify ID token & admin claim
async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) return res.status(401).json({ error: "Missing token" });

    const decoded = await admin.auth().verifyIdToken(match[1]);
    if (decoded.admin === true) {
      req.user = decoded;
      return next();
    }
    return res.status(403).json({ error: "Admin only" });
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// List users (paginated)
app.get("/users", requireAdmin, async (req, res) => {
  const limit = Number(req.query.limit) || 1000;
  const nextPageToken = req.query.nextPageToken || undefined;
  const result = await auth.listUsers(limit, nextPageToken);
  const users = result.users.map(u => ({
    uid: u.uid,
    email: u.email,
    displayName: u.displayName || "",
    disabled: u.disabled,
    admin: !!(u.customClaims && u.customClaims.admin),
    createdAt: u.metadata.creationTime,
    lastSignInAt: u.metadata.lastSignInTime
  }));
  res.json({ users, nextPageToken: result.pageToken || null });
});

// Create user
app.post("/users", requireAdmin, async (req, res) => {
  const { email, password, displayName, admin: isAdmin } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email & password required" });

  const user = await auth.createUser({ email, password, displayName });
  if (isAdmin) await auth.setCustomUserClaims(user.uid, { admin: true });

  await db.collection("audit").add({
    type: "createUser",
    by: req.user.uid,
    target: user.uid,
    at: admin.firestore.FieldValue.serverTimestamp()
  });

  res.status(201).json({ uid: user.uid });
});

// Update user
app.patch("/users/:uid", requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const { email, displayName, disabled } = req.body;
  await auth.updateUser(uid, { email, displayName, disabled });
  await db.collection("audit").add({
    type: "updateUser",
    by: req.user.uid,
    target: uid,
    at: admin.firestore.FieldValue.serverTimestamp(),
    payload: { email, displayName, disabled }
  });
  res.json({ ok: true });
});

// Delete user
app.delete("/users/:uid", requireAdmin, async (req, res) => {
  const { uid } = req.params;
  await auth.deleteUser(uid);
  await db.collection("audit").add({
    type: "deleteUser",
    by: req.user.uid,
    target: uid,
    at: admin.firestore.FieldValue.serverTimestamp()
  });
  res.json({ ok: true });
});

// Set/unset admin custom claim
app.post("/users/:uid/role", requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const { admin: isAdmin } = req.body;
  await auth.setCustomUserClaims(uid, { admin: !!isAdmin });

  await db.collection("audit").add({
    type: "setRole",
    by: req.user.uid,
    target: uid,
    at: admin.firestore.FieldValue.serverTimestamp(),
    payload: { admin: !!isAdmin }
  });

  res.json({ ok: true });
});

// Generate password reset link
app.post("/users/:uid/reset-link", requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const user = await auth.getUser(uid);
  const link = await auth.generatePasswordResetLink(user.email);
  await db.collection("audit").add({
    type: "passwordResetLink",
    by: req.user.uid,
    target: uid,
    at: admin.firestore.FieldValue.serverTimestamp()
  });
  res.json({ link });
});

// Fetch login logs (from Firestore)
app.get("/logs/login", requireAdmin, async (req, res) => {
  const snap = await db.collection("loginAttempts").orderBy("at", "desc").limit(200).get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json({ items });
});

// Small one-time bootstrap endpoint (protect with secret)
app.post("/bootstrap/make-admin", async (req, res) => {
  const { email, secret } = req.body;
  if (secret !== process.env.MAKE_ADMIN_SECRET) return res.status(403).json({ error: "Nope" });
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { admin: true });
  res.json({ ok: true, uid: user.uid });
});

exports.api = functions.https.onRequest(app);

// Auth trigger: write audit when a user is created
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  await db.collection("audit").add({
    type: "userCreated",
    target: user.uid,
    at: admin.firestore.FieldValue.serverTimestamp()
  });
});
