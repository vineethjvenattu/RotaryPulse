import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

setGlobalOptions({ maxInstances: 10 });

// Trigger when a new document is added to the "payments" collection inside a chapter
export const onDueCreated = onDocumentCreated("chapters/{chapterId}/payments/{paymentId}", async (event) => {
  const paymentData = event.data.data();
  if (!paymentData) return;

  const targetMemberId = paymentData["Member ID"] || paymentData.memberId;
  const description = paymentData["Description"] || paymentData.description || "A new due has been added to your account.";
  
  // 1. Get the target user's FCM token
  const tokensToNotify = [];
  
  if (targetMemberId) {
    const userSnap = await db.collection("users").doc(String(targetMemberId)).get();
    if (userSnap.exists) {
      const fcmToken = userSnap.data().fcmToken;
      if (fcmToken) {
        tokensToNotify.push(fcmToken);
      }
    }
  }

  // 2. Get PST (President, Secretary, Treasurer) members' FCM tokens
  const pstQuery = await db.collection("users").where("Role", "in", ["President", "Secretary", "Treasurer"]).get();
  pstQuery.forEach(doc => {
    const token = doc.data().fcmToken;
    if (token && !tokensToNotify.includes(token)) {
      tokensToNotify.push(token);
    }
  });

  const superAdminQuery = await db.collection("users").where("isSuperAdmin", "==", true).get();
  superAdminQuery.forEach(doc => {
    const token = doc.data().fcmToken;
    if (token && !tokensToNotify.includes(token)) {
      tokensToNotify.push(token);
    }
  });

  if (tokensToNotify.length === 0) {
    console.log("No FCM tokens found to notify.");
    return;
  }

  // 3. Construct the push payload (Data-only to prevent double notifications)
  const payload = {
    data: {
      title: "New Due Created",
      body: description,
      url: "/?page=payments"
    },
    tokens: tokensToNotify
  };

  // 4. Send the notification
  try {
    const response = await messaging.sendEachForMulticast(payload);
    console.log(response.successCount + " messages were sent successfully");
  } catch (error) {
    console.error("Error sending push notifications:", error);
  }
});
