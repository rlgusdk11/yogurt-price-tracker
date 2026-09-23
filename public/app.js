function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function formatWon(n) {
  return n.toLocaleString() + '원';
}

async function loadPrices() {
  const res = await fetch('/api/prices');
  const data = await res.json();

  document.getElementById('query-label').textContent = `"${data.query}" 최저가 알리미`;

  const lowestCard = document.getElementById('lowest-card');
  if (data.latest.length === 0) {
    lowestCard.innerHTML = '<div class="empty">아직 조회된 가격이 없습니다.<br/>아래 "지금 다시 조회"를 눌러보세요.</div>';
  } else {
    const lowest = data.latest[0];
    lowestCard.innerHTML = `
      <div class="muted">현재 최저가</div>
      <div class="amount">${formatWon(lowest.price)}</div>
      <div class="mall">${lowest.mall_name || lowest.source} · ${lowest.product_name}</div>
      ${lowest.url ? `<a class="buy-link" href="${lowest.url}" target="_blank" rel="noopener">바로가기</a>` : ''}
    `;
  }

  const list = document.getElementById('latest-list');
  if (data.latest.length === 0) {
    list.innerHTML = '<div class="empty">데이터 없음</div>';
  } else {
    list.innerHTML = data.latest
      .map(
        (p) => `
      <div class="row">
        <div>
          <div class="name">${p.product_name}</div>
          <div class="mall">${p.mall_name || p.source}</div>
        </div>
        <div class="price">${formatWon(p.price)}</div>
      </div>`
      )
      .join('');
  }

  const history = document.getElementById('history-list');
  if (data.history.length === 0) {
    history.innerHTML = '<div class="empty">데이터 없음</div>';
  } else {
    history.innerHTML = data.history
      .slice(0, 15)
      .map(
        (p) => `
      <div class="row">
        <div>
          <div class="name">${p.mall_name || p.source}</div>
          <div class="mall">${p.fetched_at}</div>
        </div>
        <div class="price">${formatWon(p.price)}</div>
      </div>`
      )
      .join('');
  }

  document.getElementById('threshold-current').textContent = data.threshold
    ? `현재 목표가: ${formatWon(data.threshold)} 이하일 때 알림`
    : '목표가가 설정되지 않았습니다.';
  if (data.threshold) document.getElementById('threshold-input').value = data.threshold;
}

async function saveThreshold() {
  const val = Number(document.getElementById('threshold-input').value);
  if (!val || val <= 0) {
    alert('올바른 금액을 입력하세요.');
    return;
  }
  await fetch('/api/threshold', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price: val }),
  });
  loadPrices();
}

async function refreshNow() {
  const btn = document.getElementById('refresh-now');
  btn.disabled = true;
  btn.textContent = '조회 중...';
  try {
    await fetch('/api/fetch-now', { method: 'POST' });
  } catch (e) {
    console.error(e);
  }
  btn.disabled = false;
  btn.textContent = '지금 다시 조회';
  loadPrices();
}

async function setupPush() {
  const statusEl = document.getElementById('push-status');

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    statusEl.textContent = '이 브라우저는 푸시 알림을 지원하지 않습니다.';
    statusEl.className = 'status off';
    return;
  }

  const reg = await navigator.serviceWorker.register('/service-worker.js');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    statusEl.textContent = '알림 권한이 거부되었습니다.';
    statusEl.className = 'status off';
    return;
  }

  const keyRes = await fetch('/api/vapid-public-key');
  const { key, enabled } = await keyRes.json();
  if (!enabled || !key) {
    statusEl.textContent = '서버에 VAPID 키가 설정되지 않았습니다 (README 참고).';
    statusEl.className = 'status off';
    return;
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });

  await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  });

  statusEl.textContent = '✅ 이 기기에서 푸시 알림이 켜졌습니다.';
  statusEl.className = 'status on';
}

document.getElementById('threshold-save').addEventListener('click', saveThreshold);
document.getElementById('refresh-now').addEventListener('click', refreshNow);
document.getElementById('enable-push').addEventListener('click', setupPush);

loadPrices();
