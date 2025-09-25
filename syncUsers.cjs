const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function syncAuthUsersToFirestore() {
  const listUsersResult = await admin.auth().listUsers();
  for (const user of listUsersResult.users) {
    await db.collection("users").doc(user.uid).set({
      email: user.email,
      displayName: user.displayName || "",
      createdAt: user.metadata.creationTime,
    }, { merge: true });
  }
  console.log("Synced all users to Firestore!");
}

syncAuthUsersToFirestore().catch(console.error);