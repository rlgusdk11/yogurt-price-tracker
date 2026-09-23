const webpush = require('web-push');
const { getAllSubscriptions, removeSubscription } = require('./db');

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID 키가 없어 푸시 발송이 비활성화됩니다. `npm run gen-vapid` 로 생성하세요.');
    return false;
  }
  webpush.setVapidDetails(
    'mailto:' + (process.env.CONTACT_EMAIL || 'example@example.com'),
    publicKey,
    privateKey
  );
  return true;
}

async function sendPushToAll(payload) {
  const subs = getAllSubscriptions();
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err) {
        // 구독이 만료/취소된 경우 (410 Gone, 404) 정리
        if (err.statusCode === 410 || err.statusCode === 404) {
          removeSubscription(sub.endpoint);
        } else {
          console.warn('[push] 발송 실패:', err.message);
        }
      }
    })
  );
}

module.exports = { configureWebPush, sendPushToAll };
