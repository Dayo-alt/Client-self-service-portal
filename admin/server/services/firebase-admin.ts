import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { UserRecord } from "firebase-admin/auth";
import type { FirebaseUser, UserStats, UpdateUserData } from "@shared/schema";

// Import the JSON directly (snake_case keys from Firebase)
import serviceAccount from "../../client-self-service.json";

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount as any),
  });
}

// using environment variables

// // Initialize Firebase Admin SDK
// if (!getApps().length) {
//   // TEMPORARY FIX: Environment variables are swapped, so we fix them here
//   // const serviceAccount = {
//   //   project_Id: process.env.FIREBASE_PROJECT_ID, // Actually contains the project ID
//   //   privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//   //   clientEmail: process.env.FIREBASE_CLIENT_EMAIL, // Actually contains the client email
//   // };

//   const serviceAccount = {
//   projectId: process.env.FIREBASE_PROJECT_ID, // must be exactly project_id
//   clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//   privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
// };

// console.log(serviceAccount, "serviceAccount config");
//   initializeApp({
//     credential: cert(serviceAccount),
//     // projectId: process.env.FIREBASE_PROJECT_ID, // Actually contains the project ID
//   });
// }

const auth = getAuth();

// Convert Firebase UserRecord to our FirebaseUser type
function convertUserRecord(userRecord: UserRecord): FirebaseUser {
  return {
    uid: userRecord.uid,
    email: userRecord.email || null,
    displayName: userRecord.displayName || null,
    photoURL: userRecord.photoURL || null,
    emailVerified: userRecord.emailVerified,
    disabled: userRecord.disabled,
    metadata: {
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime || null,
    },
    customClaims: userRecord.customClaims || {},
    providerData: userRecord.providerData.map(provider => ({
      uid: provider.uid,
      displayName: provider.displayName || null,
      email: provider.email || null,
      photoURL: provider.photoURL || null,
      providerId: provider.providerId,
    })),
  };
}

export async function getAllUsers(): Promise<FirebaseUser[]> {
  try {
    console.log("Fetching real users from Firebase...");
    const listUsersResult = await auth.listUsers();
    const users = listUsersResult.users.map(convertUserRecord);
    console.log(`Found ${users.length} users from Firebase`);
    return users;
  } catch (error) {
    console.error("Error listing users:", error);
    throw new Error("Failed to fetch users");
  }
}

export async function getUserStats(): Promise<UserStats> {
  try {
    const users = await getAllUsers();
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const totalUsers = users.length;
    const activeUsers = users.filter(user => !user.disabled).length;
    const inactiveUsers = users.filter(user => user.disabled).length;
    const newUsers = users.filter(user => {
      const creationDate = new Date(user.metadata.creationTime);
      return creationDate >= monthAgo;
    }).length;

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      newUsers,
    };
  } catch (error) {
    console.error("Error getting user stats:", error);
    throw new Error("Failed to fetch user statistics");
  }
}

export async function updateUser(uid: string, updateData: UpdateUserData): Promise<FirebaseUser> {
  try {
    // Update user profile
    const updateFields: any = {};
    if (updateData.displayName !== undefined) {
      updateFields.displayName = updateData.displayName;
    }
    if (updateData.email !== undefined) {
      updateFields.email = updateData.email;
    }
    if (updateData.disabled !== undefined) {
      updateFields.disabled = updateData.disabled;
    }

    if (Object.keys(updateFields).length > 0) {
      await auth.updateUser(uid, updateFields);
    }

    // Update custom claims if provided
    if (updateData.customClaims !== undefined) {
      await auth.setCustomUserClaims(uid, updateData.customClaims);
    }

    // Return updated user
    const userRecord = await auth.getUser(uid);
    return convertUserRecord(userRecord);
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("Failed to update user");
  }
}

export async function deleteUser(uid: string): Promise<void> {
  try {
    await auth.deleteUser(uid);
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new Error("Failed to delete user");
  }
}

export async function verifyIdToken(idToken: string): Promise<any> {
  try {
    return await auth.verifyIdToken(idToken);
  } catch (error) {
    console.error("Error verifying ID token:", error);
    throw new Error("Invalid authentication token");
  }
}

export async function setUserAsAdmin(uid: string): Promise<FirebaseUser> {
  try {
    console.log(`Setting user ${uid} as admin...`);
    await auth.setCustomUserClaims(uid, { admin: true });
    
    // Return updated user
    const userRecord = await auth.getUser(uid);
    return convertUserRecord(userRecord);
  } catch (error) {
    console.error("Error setting user as admin:", error);
    throw new Error("Failed to set user as admin");
  }
}

export async function removeUserAdmin(uid: string): Promise<FirebaseUser> {
  try {
    console.log(`Removing admin privileges from user ${uid}...`);
    await auth.setCustomUserClaims(uid, { admin: false });
    
    // Return updated user
    const userRecord = await auth.getUser(uid);
    return convertUserRecord(userRecord);
  } catch (error) {
    console.error("Error removing admin privileges:", error);
    throw new Error("Failed to remove admin privileges");
  }
}
