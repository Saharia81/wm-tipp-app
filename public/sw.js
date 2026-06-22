// Service Worker für die Tipp-Erinnerungen (Web Push).
// Liegt bewusst in /public, damit er unter der stabilen URL /sw.js mit Scope "/"
// ausgeliefert wird (gebundelte Dateien hätten wechselnde Pfade).

// Eingehende Push-Nachricht anzeigen. Der Server (lib/send-reminders.ts) schickt
// JSON mit { title, body, url }.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "WM-Tipp 2026";
  const options = {
    body: payload.body || "Vergiss nicht zu tippen!",
    // Großes Symbol (rechts in der Meldung): das bunte Maskottchen.
    icon: "/icon.png",
    // Kleines Statusleisten-Symbol: muss einfarbig + transparent sein, sonst
    // zeigt Android nur ein weißes Viereck. Daher ein Fußball-Silhouetten-PNG.
    badge: "/badge.png",
    data: { url: payload.url || "/tipps" },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Klick auf die Notification: vorhandenen Tab fokussieren oder neuen öffnen.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/tipps";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
