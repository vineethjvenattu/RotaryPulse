importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBpVt_4q2gp-0Ak06yP7ycez2O-f6_pnDs",
  authDomain: "rotary-club-of-amity-tvm.firebaseapp.com",
  projectId: "rotary-club-of-amity-tvm",
  storageBucket: "rotary-club-of-amity-tvm.firebasestorage.app",
  messagingSenderId: "962876194129",
  appId: "1:962876194129:web:c06ce844d38654bfdf2770"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.data.title || "New Notification";
  const notificationOptions = {
    body: payload.data.body || "",
    icon: '/rotary-logo.png', // Fallback icon
    data: { url: payload.data.url }, // This contains our deep link URL
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
