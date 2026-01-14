self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Reminder';
  const options = {
    body: data.body || 'Ai un reminder nou',
    data: { url: data.url || '/app', jobId: data.jobId, token: data.token },
    actions: [
      { action: 'done', title: 'Done ✅' },
      { action: 'snooze', title: 'Snooze 30 min 🕒' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/app';
  const action = event.action;
  const jobId = event.notification.data?.jobId;
  const token = event.notification.data?.token;

  if (action === 'done' || action === 'snooze') {
    event.waitUntil(
      fetch('/api/notifications/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, jobId, token })
      })
    );
    return;
  }
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
      return undefined;
    })
  );
});
