import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2";
import Razorpay from "razorpay";
import crypto from "crypto";

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

export const onFeedbackAcknowledged = onDocumentUpdated("chapters/{chapterId}/feedbacks/{feedbackId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (!before || !after) return;
  
  if (before.acknowledged !== true && after.acknowledged === true) {
    const memberId = after.memberId;
    if (!memberId) return;

    const userSnap = await db.collection("users").doc(String(memberId)).get();
    if (userSnap.exists) {
      const fcmToken = userSnap.data().fcmToken;
      if (fcmToken) {
        const payload = {
          data: {
            title: "Feedback Acknowledged",
            body: "Your feedback has been acknowledged by the administrators.",
            url: "/?page=feedbacks"
          },
          tokens: [fcmToken]
        };

        try {
          const response = await messaging.sendEachForMulticast(payload);
          console.log(response.successCount + " messages were sent successfully for feedback acknowledgement.");
        } catch (error) {
          console.error("Error sending feedback acknowledgement push notification:", error);
        }
      }
    }
  }
});

// RAZORPAY INTEGRATION

// You must set these using Firebase CLI: 
// firebase functions:secrets:set RAZORPAY_KEY_ID
// firebase functions:secrets:set RAZORPAY_KEY_SECRET
export const createRazorpaySubscription = onCall({ secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] }, async (request) => {
  if (!request.auth) {
    throw new Error("unauthenticated", "User must be logged in to create a subscription.");
  }
  
  const { planId, chapterId, memberId } = request.data;
  
  if (!planId || !chapterId || !memberId) {
    throw new Error("invalid-argument", "planId, chapterId, and memberId are required.");
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const subscriptionParams = {
      plan_id: planId,
      customer_notify: 1,
      total_count: 120, // E.g., 10 years if monthly
      notes: {
        chapterId: chapterId,
        memberId: memberId,
        uid: request.auth.uid
      }
    };

    const subscription = await razorpay.subscriptions.create(subscriptionParams);
    
    return {
      success: true,
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      status: subscription.status
    };
  } catch (error) {
    console.error("Razorpay subscription error:", error);
    throw new Error("internal", "Failed to create subscription with Razorpay.");
  }
});

export const razorpayWebhook = onRequest({ secrets: ["RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"] }, async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  
  const signature = req.headers["x-razorpay-signature"];
  const body = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) {
    res.status(400).send("Invalid signature");
    return;
  }

  const event = req.body;

  try {
    if (event.event === "subscription.charged" || event.event === "subscription.activated") {
      const subscription = event.payload.subscription.entity;
      const notes = subscription.notes || {};
      const { chapterId, memberId } = notes;

      if (chapterId && memberId) {
        // Calculate expiry logic (e.g., charge_at or next billing cycle)
        let expiryDate = new Date();
        if (subscription.charge_at) {
          expiryDate = new Date(subscription.charge_at * 1000);
        } else {
          // Fallback, add 30 days
          expiryDate.setDate(expiryDate.getDate() + 30);
        }

        const updateData = {
          subscriptionStatus: 'Active',
          subscriptionExpiry: expiryDate.toISOString(),
          razorpaySubscriptionId: subscription.id
        };

        // Update the member doc inside chapter
        await db.doc(`chapters/${chapterId}/members/${memberId}`).set(updateData, { merge: true });

        // Note: You should also update the top-level user doc for global access checks
        const usersSnapshot = await db.collection("users").where("Member ID", "==", String(memberId)).get();
        if (!usersSnapshot.empty) {
          await usersSnapshot.docs[0].ref.set(updateData, { merge: true });
        }
      }
    } else if (event.event === "subscription.halted" || event.event === "subscription.cancelled") {
      const subscription = event.payload.subscription.entity;
      const notes = subscription.notes || {};
      const { chapterId, memberId } = notes;

      if (chapterId && memberId) {
        const updateData = {
          subscriptionStatus: 'Cancelled',
        };
        await db.doc(`chapters/${chapterId}/members/${memberId}`).set(updateData, { merge: true });
        
        const usersSnapshot = await db.collection("users").where("Member ID", "==", String(memberId)).get();
        if (!usersSnapshot.empty) {
          await usersSnapshot.docs[0].ref.set(updateData, { merge: true });
        }
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send("Server Error");
  }
});

// Run daily at 9:00 AM UTC
export const mandateExpiryReminder = onSchedule("0 9 * * *", async (event) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Target date: 3 days from today
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + 3);

  const startOfDay = targetDate.toISOString();
  
  targetDate.setHours(23, 59, 59, 999);
  const endOfDay = targetDate.toISOString();

  // Query users where subscriptionExpiry falls within the target date
  const snapshot = await db.collection("users")
    .where("subscriptionExpiry", ">=", startOfDay)
    .where("subscriptionExpiry", "<=", endOfDay)
    .where("subscriptionStatus", "==", "Active")
    .get();

  if (snapshot.empty) {
    console.log("No subscriptions expiring in exactly 3 days.");
    return;
  }

  const tokens = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.fcmToken) {
      tokens.push(data.fcmToken);
    }
  });

  if (tokens.length > 0) {
    const payload = {
      data: {
        title: "Mandate Expiry Reminder",
        body: "Your ₹100/month UPI mandate is scheduled for renewal in 3 days. Please ensure sufficient funds.",
        url: "/?page=subscription"
      },
      tokens: tokens
    };

    try {
      const response = await messaging.sendEachForMulticast(payload);
      console.log(`Sent mandate reminders to ${response.successCount} users.`);
    } catch (error) {
      console.error("Error sending mandate reminders:", error);
    }
  }
});
