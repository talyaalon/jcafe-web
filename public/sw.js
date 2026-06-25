// Service Worker — התרעות רקע למסך המלקט (Web Push).
// מציג התראת-מערכת גם כשהאפליקציה סגורה / המסך כבוי (אנדרואיד; iOS כ-PWA מותקן).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "הזמנה חדשה";
  const options = {
    body: data.body || "",
    icon: "/app-logo.png",
    badge: "/app-logo.png",
    // רטט חזק וארוך — מורגש יותר
    vibrate: [400, 150, 400, 150, 400, 150, 500],
    requireInteraction: true, // נשארת עד שלוחצים
    tag: data.tag || "new-order",
    renotify: true,
    silent: false,
    data: { url: data.url || "/en/picker" },
  };
  // "צלצול" — מציגים את ההתראה כמה פעמים ברצף כדי לחזור על הצליל+הרטט (בגבולות ה-Web)
  event.waitUntil(
    (async () => {
      for (let i = 0; i < 3; i++) {
        await self.registration.showNotification(title, options);
        if (i < 2) await new Promise((r) => setTimeout(r, 2500));
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/en/picker";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes("/picker") && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
