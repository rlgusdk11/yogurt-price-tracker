self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: '가격 알림', body: '', url: '/' };
  try {
    data = event.data.json();
  } catch (e) {
    data.body = event.data ? event.data.text() : '';
  }

  event.waitUntil(
    self.registration.showNotification(data.title || '가격 알림', {
      body: data.body || '',
      icon: '/icons/icon.svg',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        if (url && url !== '/') existing.navigate(url);
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});
